/**
 * Xendit invoice paid webhook — credits wallets via immutable ledger rows.
 *
 * Local simulation (after creating an invoice via POST /api/payments/invoice/create):
 *
 * ```bash
 * # 1. Set env in frontend/.env.local:
 * #    XENDIT_SECRET_KEY=xnd_development_...
 * #    XENDIT_CALLBACK_TOKEN=your-callback-token-from-xendit-dashboard
 *
 * # 2. Create invoice (replace TOKEN and adjust metaData for student wallet refill):
 * curl -s -X POST http://localhost:3000/api/payments/invoice/create \
 *   -H "Authorization: Bearer $TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -H "x-school-id: YOUR_SCHOOL_ID" \
 *   -d '{
 *     "amount": 50000,
 *     "paymentType": "WALLET_REFILL",
 *     "metaData": {
 *       "studentId": "STUDENT_UID",
 *       "description": "Top up dompet siswa"
 *     }
 *   }'
 *
 * # 3. Simulate Xendit PAID callback (use externalId + paymentAttemptId from step 2):
 * curl -s -X POST http://localhost:3000/api/payments/webhook/xendit \
 *   -H "Content-Type: application/json" \
 *   -H "x-callback-token: $XENDIT_CALLBACK_TOKEN" \
 *   -d '{
 *     "id": "XENDIT_INVOICE_ID",
 *     "external_id": "PAYMENT_ATTEMPT_ID",
 *     "status": "PAID",
 *     "amount": 50000,
 *     "paid_amount": 50000,
 *     "payment_method": "BANK_TRANSFER",
 *     "payment_channel": "BCA",
 *     "currency": "IDR"
 *   }'
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import type { InvoiceCallback } from 'xendit-node/invoice/models';
import {
  applyExternalPaymentSuccess,
  findPaymentAttemptByExternalId,
  findPaymentAttemptById,
} from '@/lib/server/ledger';
import { paymentAttemptsCollection } from '@/lib/server/firebase-admin';
import { getXenditCallbackToken } from '@/lib/server/xendit';
import type { PaymentAttemptMetaData, PaymentType } from '@/lib/types/ledger';

type WebhookPayload = InvoiceCallback & {
  external_id?: string;
  paid_amount?: number;
  payment_method?: string;
  payment_channel?: string;
};

function normalizeWebhookPayload(raw: Record<string, unknown>): WebhookPayload {
  return {
    ...raw,
    externalId: String(raw.externalId ?? raw.external_id ?? ''),
    paidAmount: Number(raw.paidAmount ?? raw.paid_amount ?? raw.amount ?? 0),
    paymentMethod: String(raw.paymentMethod ?? raw.payment_method ?? 'UNKNOWN'),
    paymentChannel: String(raw.paymentChannel ?? raw.payment_channel ?? ''),
    status: String(raw.status ?? '').toUpperCase() as WebhookPayload['status'],
    id: String(raw.id ?? ''),
    amount: Number(raw.amount ?? 0),
  } as WebhookPayload;
}

export async function POST(req: NextRequest) {
  try {
    const callbackToken = req.headers.get('x-callback-token');
    if (!callbackToken || callbackToken !== getXenditCallbackToken()) {
      return NextResponse.json({ message: 'Invalid callback token' }, { status: 401 });
    }

    const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const payload = normalizeWebhookPayload(raw);
    const status = String(payload.status ?? '').toUpperCase();

    if (status === 'EXPIRED') {
      const attempt =
        (payload.id ? await findPaymentAttemptByExternalId(payload.id) : null) ||
        (payload.externalId ? await findPaymentAttemptById(payload.externalId) : null);
      if (attempt) {
        await paymentAttemptsCollection().doc(String(attempt.paymentAttemptId)).update({
          status: 'EXPIRED',
          updatedAt: new Date(),
        });
      }
      return NextResponse.json({ received: true, status: 'EXPIRED' });
    }

    if (status !== 'PAID') {
      return NextResponse.json({ received: true, ignored: true, status });
    }

    const xenditInvoiceId = payload.id;
    const paymentAttemptId = payload.externalId;
    if (!xenditInvoiceId) {
      return NextResponse.json({ message: 'Missing invoice id' }, { status: 400 });
    }

    let attempt =
      (await findPaymentAttemptByExternalId(xenditInvoiceId)) ||
      (paymentAttemptId ? await findPaymentAttemptById(paymentAttemptId) : null);

    if (!attempt) {
      return NextResponse.json({ message: 'Payment attempt not found' }, { status: 404 });
    }

    if (attempt.status === 'SUCCEEDED') {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const paidAmount = Number(payload.paidAmount ?? attempt.amount);
    const attemptAmount = Number(attempt.amount);
    if (paidAmount < attemptAmount) {
      return NextResponse.json({ message: 'Paid amount below invoice amount' }, { status: 400 });
    }

    const metaData = (attempt.metaData ?? {}) as PaymentAttemptMetaData;
    const schoolId = String(metaData.schoolId ?? '');
    if (!schoolId) {
      return NextResponse.json({ message: 'Payment attempt missing schoolId in metaData' }, { status: 400 });
    }

    const result = await applyExternalPaymentSuccess({
      paymentAttemptId: String(attempt.paymentAttemptId),
      userId: String(attempt.userId),
      amount: attemptAmount,
      paymentMethod: String(payload.paymentMethod ?? attempt.paymentMethod ?? 'XENDIT'),
      paymentType: attempt.paymentType as PaymentType,
      metaData,
      schoolId,
      externalId: xenditInvoiceId,
    });

    return NextResponse.json({
      received: true,
      status: 'SUCCEEDED',
      transactionId: result.transactionId,
      destinationWalletId: result.destinationWalletId,
    });
  } catch (e) {
    console.error('POST /api/payments/webhook/xendit error:', e);
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
