/**
 * POST /api/payments/disburse — treasury bank cashout via Xendit Payout (v7 SDK).
 *
 * Additive route: uses the existing `getXenditClient()` and ledger collections.
 * It debits the school-system wallet and appends an immutable outflow row to
 * `/transactions` (double-entry: SCHOOL_SYSTEM_{schoolId} → EXTERNAL_XENDIT).
 *
 * Body:
 *   { channelCode: string, accountNumber: string, accountHolderName: string,
 *     amount: number, description?: string }
 *
 * Local simulation (no real bank movement in test mode):
 * ```bash
 * curl -s -X POST http://localhost:3000/api/payments/disburse \
 *   -H "Authorization: Bearer $TOKEN" \
 *   -H "x-school-id: YOUR_SCHOOL_ID" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "channelCode": "ID_BCA",
 *     "accountNumber": "1234567890",
 *     "accountHolderName": "Yayasan Kita",
 *     "amount": 100000,
 *     "description": "Pencairan dana operasional"
 *   }'
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import type { CreatePayoutRequest } from 'xendit-node/payout/models';
import {
  getAuthUser,
  getSchoolId,
  hasAnyRole,
  hasFullAccess,
} from '@/lib/server/auth-helpers';
import {
  getFirestore,
  ledgerTransactionsCollection,
  walletsCollection,
} from '@/lib/server/firebase-admin';
import { getXenditClient } from '@/lib/server/xendit';
import { EXTERNAL_XENDIT_WALLET_ID, schoolSystemWalletId } from '@/lib/types/ledger';
import { FINANCE_POS_ROLES } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const canDisburse = hasFullAccess(auth) || hasAnyRole(auth, FINANCE_POS_ROLES);
    if (!canDisburse) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) {
      return NextResponse.json({ message: 'School context required' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const channelCode = String(body.channelCode ?? '').trim();
    const accountNumber = String(body.accountNumber ?? '').trim();
    const accountHolderName = String(body.accountHolderName ?? '').trim();
    const amount = Number(body.amount);
    const description = String(body.description ?? '').trim() || 'Pencairan dana sekolah';

    if (!channelCode) return NextResponse.json({ message: 'Bank/channel wajib dipilih' }, { status: 400 });
    if (!accountNumber) return NextResponse.json({ message: 'Nomor rekening wajib diisi' }, { status: 400 });
    if (!accountHolderName) return NextResponse.json({ message: 'Nama pemilik rekening wajib diisi' }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ message: 'Nominal tidak valid' }, { status: 400 });
    }

    const schoolWalletId = schoolSystemWalletId(schoolId);
    const referenceId = `DISB-${schoolId}-${Date.now()}`;

    // 1) Send the payout through Xendit (v7 instance pattern).
    const xenditClient = getXenditClient();
    const { Payout } = xenditClient;

    const payoutData: CreatePayoutRequest = {
      amount,
      channelCode,
      currency: 'IDR',
      referenceId,
      description,
      channelProperties: {
        accountNumber,
        accountHolderName,
      },
    };

    const payout = await Payout.createPayout({
      idempotencyKey: referenceId,
      data: payoutData,
    });

    // 2) Atomically debit the school wallet and append the immutable ledger row.
    const db = getFirestore();
    const { transactionId } = await db.runTransaction(async (tx) => {
      const schoolWalletRef = walletsCollection().doc(schoolWalletId);
      const schoolWalletSnap = await tx.get(schoolWalletRef);
      const balance = Number((schoolWalletSnap.data() as { balance?: number })?.balance ?? 0);

      if (!schoolWalletSnap.exists) {
        throw new Error('SCHOOL_WALLET_EMPTY');
      }
      if (balance < amount) {
        throw new Error('INSUFFICIENT_SCHOOL_BALANCE');
      }

      const externalRef = walletsCollection().doc(EXTERNAL_XENDIT_WALLET_ID);
      const externalSnap = await tx.get(externalRef);
      if (!externalSnap.exists) {
        tx.set(externalRef, {
          walletId: EXTERNAL_XENDIT_WALLET_ID,
          ownerId: 'XENDIT',
          ownerType: 'SCHOOL_SYSTEM',
          balance: 0,
          currency: 'IDR',
          updatedAt: new Date(),
        });
      }

      const ledgerRef = ledgerTransactionsCollection().doc();
      tx.set(ledgerRef, {
        transactionId: ledgerRef.id,
        paymentAttemptId: null,
        sourceWalletId: schoolWalletId,
        destinationWalletId: EXTERNAL_XENDIT_WALLET_ID,
        amount,
        category: 'CANTEEN_PAYOUT',
        metaData: {
          referenceId,
          description,
          payoutId: String(payout.id ?? ''),
          payoutStatus: String(payout.status ?? ''),
          channelCode,
          accountNumber,
          accountHolderName,
        },
        timestamp: new Date(),
      });

      tx.update(schoolWalletRef, {
        balance: FieldValue.increment(-amount),
        updatedAt: new Date(),
      });

      return { transactionId: ledgerRef.id };
    });

    return NextResponse.json({
      transactionId,
      payoutId: String(payout.id ?? ''),
      status: String(payout.status ?? 'PENDING'),
      referenceId,
      amount,
      channelCode,
      accountHolderName,
    });
  } catch (e) {
    console.error('POST /api/payments/disburse error:', e);
    const raw = e instanceof Error ? e.message : 'Server error';
    if (raw === 'INSUFFICIENT_SCHOOL_BALANCE') {
      return NextResponse.json(
        { message: 'Saldo kas sekolah tidak mencukupi untuk pencairan ini' },
        { status: 400 }
      );
    }
    if (raw === 'SCHOOL_WALLET_EMPTY') {
      return NextResponse.json(
        { message: 'Kas sekolah belum memiliki saldo. Terima pembayaran masuk terlebih dahulu.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ message: raw }, { status: 500 });
  }
}
