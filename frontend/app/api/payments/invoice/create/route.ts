import { NextRequest, NextResponse } from 'next/server';
import type { CreateInvoiceRequest } from 'xendit-node/invoice/models';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { getFirestore, paymentAttemptsCollection } from '@/lib/server/firebase-admin';
import { resolveDestinationWalletId } from '@/lib/server/ledger';
import { getAppBaseUrl, getXenditClient } from '@/lib/server/xendit';
import type { PaymentAttemptMetaData, PaymentType } from '@/lib/types/ledger';

const VALID_PAYMENT_TYPES: PaymentType[] = ['WALLET_REFILL', 'TUITION', 'STORE_PURCHASE'];

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) {
      return NextResponse.json({ message: 'School context required' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    const paymentType = String(body.paymentType ?? '') as PaymentType;
    const metaData = (body.metaData ?? {}) as PaymentAttemptMetaData;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ message: 'Invalid amount' }, { status: 400 });
    }
    if (!VALID_PAYMENT_TYPES.includes(paymentType)) {
      return NextResponse.json({ message: 'Invalid paymentType' }, { status: 400 });
    }

    try {
      resolveDestinationWalletId(paymentType, metaData, schoolId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid metaData';
      return NextResponse.json({ message }, { status: 400 });
    }

    const attemptRef = paymentAttemptsCollection().doc();
    const paymentAttemptId = attemptRef.id;
    const now = new Date();
    const description =
      String(metaData.description ?? '') ||
      `Cognifa ${paymentType.replace(/_/g, ' ').toLowerCase()}`;

    const xenditClient = getXenditClient();
    const { Invoice } = xenditClient;

    const invoiceData: CreateInvoiceRequest = {
      externalId: paymentAttemptId,
      amount,
      currency: 'IDR',
      description,
      invoiceDuration: 86400,
      metadata: {
        paymentAttemptId,
        paymentType,
        userId: auth.uid,
        schoolId,
        ...metaData,
      },
      successRedirectUrl: `${getAppBaseUrl()}/payments/success?attempt=${paymentAttemptId}`,
      failureRedirectUrl: `${getAppBaseUrl()}/payments/failed?attempt=${paymentAttemptId}`,
    };

    const invoice = await Invoice.createInvoice({ data: invoiceData });

    const paymentMethod = String(invoice.paymentMethod ?? 'INVOICE');
    const externalId = String(invoice.id ?? '');
    const invoiceUrl = String(invoice.invoiceUrl ?? '');

    if (!externalId || !invoiceUrl) {
      return NextResponse.json({ message: 'Xendit invoice creation failed' }, { status: 502 });
    }

    const db = getFirestore();
    await db.runTransaction(async (tx) => {
      tx.set(attemptRef, {
        paymentAttemptId,
        userId: auth.uid,
        amount,
        paymentMethod,
        externalId,
        status: 'PENDING',
        paymentType,
        metaData: {
          ...metaData,
          schoolId,
        },
        invoiceUrl,
        createdAt: now,
      });
    });

    return NextResponse.json({
      paymentAttemptId,
      externalId,
      invoiceUrl,
      amount,
      paymentType,
      status: 'PENDING',
    });
  } catch (e) {
    console.error('POST /api/payments/invoice/create error:', e);
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
