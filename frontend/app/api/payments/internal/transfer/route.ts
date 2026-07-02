import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth-helpers';
import { walletsCollection } from '@/lib/server/firebase-admin';
import {
  applyInternalTransfer,
  inferOwnerFromWalletId,
  parentWalletId,
  studentWalletId,
} from '@/lib/server/ledger';
import type { LedgerTransactionCategory, LedgerTransactionMetaData } from '@/lib/types/ledger';

const VALID_CATEGORIES: LedgerTransactionCategory[] = [
  'WALLET_REFILL',
  'TUITION_PAYMENT',
  'CANTEEN_ITEM_PURCHASE',
  'STORE_ITEM_PURCHASE',
  'CANTEEN_PAYOUT',
];

async function userCanAccessWallet(uid: string, walletId: string): Promise<boolean> {
  if (walletId.startsWith('PARENT_')) {
    return walletId === parentWalletId(uid);
  }
  if (walletId.startsWith('STUDENT_')) {
    return walletId === studentWalletId(uid);
  }

  const snap = await walletsCollection().doc(walletId).get();
  if (!snap.exists) return false;
  const data = snap.data() as { ownerId?: string };
  return data.ownerId === uid;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const sourceWalletId = String(body.sourceWalletId ?? '').trim();
    const destinationWalletId = String(body.destinationWalletId ?? '').trim();
    const amount = Number(body.amount);
    const category = String(body.category ?? '') as LedgerTransactionCategory;
    const metaData = (body.metaData ?? {}) as LedgerTransactionMetaData;

    if (!sourceWalletId || !destinationWalletId) {
      return NextResponse.json({ message: 'sourceWalletId and destinationWalletId are required' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ message: 'Invalid amount' }, { status: 400 });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ message: 'Invalid category' }, { status: 400 });
    }
    if (!metaData.description || String(metaData.description).trim().length < 3) {
      return NextResponse.json({ message: 'metaData.description is required' }, { status: 400 });
    }

    const canUseSource = await userCanAccessWallet(auth.uid, sourceWalletId);
    if (!canUseSource) {
      return NextResponse.json({ message: 'Forbidden: cannot debit this wallet' }, { status: 403 });
    }

    let sourceOwner;
    let destinationOwner;
    try {
      sourceOwner = inferOwnerFromWalletId(sourceWalletId);
      destinationOwner = inferOwnerFromWalletId(destinationWalletId);
    } catch {
      return NextResponse.json({ message: 'Invalid wallet id' }, { status: 400 });
    }

    const result = await applyInternalTransfer({
      sourceWalletId,
      destinationWalletId,
      amount,
      category,
      metaData: {
        referenceId: metaData.referenceId,
        itemsPurchased: metaData.itemsPurchased,
        description: String(metaData.description),
      },
      sourceOwnerId: sourceOwner.ownerId,
      sourceOwnerType: sourceOwner.ownerType,
      destinationOwnerId: destinationOwner.ownerId,
      destinationOwnerType: destinationOwner.ownerType,
    });

    return NextResponse.json({
      transactionId: result.transactionId,
      sourceWalletId,
      destinationWalletId,
      amount,
      category,
    });
  } catch (e) {
    console.error('POST /api/payments/internal/transfer error:', e);
    const message = e instanceof Error ? e.message : 'Server error';
    const status = message === 'Insufficient wallet balance' ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
