import type { Transaction, WriteBatch } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import {
  docToJson,
  getFirestore,
  invoicesCollection,
  ledgerTransactionsCollection,
  paymentAttemptsCollection,
  walletsCollection,
} from '@/lib/server/firebase-admin';
import type {
  LedgerTransactionCategory,
  LedgerTransactionMetaData,
  PaymentAttemptMetaData,
  PaymentType,
  WalletOwnerType,
} from '@/lib/types/ledger';
import {
  EXTERNAL_CASH_WALLET_ID,
  EXTERNAL_XENDIT_WALLET_ID,
  canteenVendorWalletId,
  parentWalletId,
  paymentTypeToLedgerCategory,
  schoolSystemWalletId,
  studentWalletId,
} from '@/lib/types/ledger';

/** Anything that can accept a `.set(ref, data)` — a Transaction or a WriteBatch. */
type LedgerWriter = Transaction | WriteBatch;

export function resolveDestinationWalletId(
  paymentType: PaymentType,
  metaData: PaymentAttemptMetaData,
  schoolId: string
): string {
  if (metaData.destinationWalletId) return String(metaData.destinationWalletId);
  if (metaData.targetWalletId) return String(metaData.targetWalletId);

  if (paymentType === 'WALLET_REFILL') {
    if (metaData.studentId) return studentWalletId(String(metaData.studentId));
    if (metaData.parentId) return parentWalletId(String(metaData.parentId));
    throw new Error('WALLET_REFILL requires metaData.studentId, parentId, or targetWalletId');
  }

  if (paymentType === 'TUITION') {
    return schoolSystemWalletId(schoolId);
  }

  if (paymentType === 'STORE_PURCHASE') {
    return schoolSystemWalletId(schoolId);
  }

  throw new Error('Unable to resolve destination wallet');
}

export async function getWalletBalance(walletId: string): Promise<number> {
  const snap = await walletsCollection().doc(walletId).get();
  if (!snap.exists) return 0;
  return Number((snap.data() as { balance?: number })?.balance ?? 0);
}

/**
 * Centralized double-entry writer. Works with both `runTransaction` (tx) and
 * `WriteBatch` (batch) so every ledger row across the app is created identically.
 */
export function appendLedgerTransaction(
  writer: LedgerWriter,
  params: {
    paymentAttemptId: string | null;
    sourceWalletId: string;
    destinationWalletId: string;
    amount: number;
    category: LedgerTransactionCategory;
    metaData: LedgerTransactionMetaData;
  }
): string {
  const ref = ledgerTransactionsCollection().doc();
  const now = new Date();
  // Cast to WriteBatch to unify the `.set(ref, data)` overloads; Transaction has
  // an identical runtime signature.
  (writer as WriteBatch).set(ref, {
    transactionId: ref.id,
    paymentAttemptId: params.paymentAttemptId,
    sourceWalletId: params.sourceWalletId,
    destinationWalletId: params.destinationWalletId,
    amount: params.amount,
    category: params.category,
    metaData: params.metaData,
    timestamp: now,
  });
  return ref.id;
}

/**
 * Pathway B — manual cash intake from the TU desk POS. Records a CREDIT income
 * row (EXTERNAL_CASH → school wallet) and funds the school-system wallet, in one
 * atomic Firestore batch. Reuses `appendLedgerTransaction()` so the ledger shape
 * matches the online (Xendit) pathway exactly.
 */
export async function recordManualCashPayment(params: {
  schoolId: string;
  amount: number;
  /** POS transaction number, used as the ledger referenceId. */
  referenceId: string;
  description: string;
  processedBy: string;
  invoiceIds?: string[];
}): Promise<{ transactionId: string }> {
  const db = getFirestore();
  const batch = db.batch();
  const now = new Date();
  const schoolWalletId = schoolSystemWalletId(params.schoolId);

  batch.set(
    walletsCollection().doc(EXTERNAL_CASH_WALLET_ID),
    {
      walletId: EXTERNAL_CASH_WALLET_ID,
      ownerId: 'CASH',
      ownerType: 'SCHOOL_SYSTEM',
      currency: 'IDR',
      updatedAt: now,
    },
    { merge: true }
  );

  const transactionId = appendLedgerTransaction(batch, {
    paymentAttemptId: null,
    sourceWalletId: EXTERNAL_CASH_WALLET_ID,
    destinationWalletId: schoolWalletId,
    amount: params.amount,
    category: 'TUITION_PAYMENT',
    metaData: {
      referenceId: params.referenceId,
      description: params.description,
      paymentMethod: 'MANUAL_CASH_POS',
      processedBy: params.processedBy,
      invoiceIds: params.invoiceIds ?? [],
    },
  });

  batch.set(
    walletsCollection().doc(schoolWalletId),
    {
      walletId: schoolWalletId,
      ownerId: params.schoolId,
      ownerType: 'SCHOOL_SYSTEM',
      currency: 'IDR',
      balance: FieldValue.increment(params.amount),
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();
  return { transactionId };
}

export async function applyExternalPaymentSuccess(params: {
  paymentAttemptId: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  paymentType: PaymentType;
  metaData: PaymentAttemptMetaData;
  schoolId: string;
  externalId: string;
}): Promise<{ transactionId: string; destinationWalletId: string }> {
  const db = getFirestore();
  const destinationWalletId = resolveDestinationWalletId(
    params.paymentType,
    params.metaData,
    params.schoolId
  );

  let ownerId = params.userId;
  let ownerType: WalletOwnerType = 'PARENT';

  if (params.paymentType === 'WALLET_REFILL' && params.metaData.studentId) {
    ownerId = String(params.metaData.studentId);
    ownerType = 'STUDENT';
  } else if (params.paymentType === 'TUITION' || params.paymentType === 'STORE_PURCHASE') {
    ownerId = params.schoolId;
    ownerType = 'SCHOOL_SYSTEM';
  } else if (params.metaData.parentId) {
    ownerId = String(params.metaData.parentId);
    ownerType = 'PARENT';
  }

  const category = paymentTypeToLedgerCategory(params.paymentType);
  const description =
    String(params.metaData.description ?? '') ||
    `Xendit ${params.paymentType} payment`;

  // Collect every invoice this payment settles: `invoiceId` (single) plus an
  // optional `invoiceIds` array (POS digital paying several bills at once).
  const invoiceIdSet = new Set<string>();
  if (params.metaData.invoiceId) invoiceIdSet.add(String(params.metaData.invoiceId));
  const extraInvoiceIds = Array.isArray(params.metaData.invoiceIds)
    ? (params.metaData.invoiceIds as unknown[])
    : [];
  for (const id of extraInvoiceIds) {
    if (id) invoiceIdSet.add(String(id));
  }
  const invoiceIds = Array.from(invoiceIdSet);

  return db.runTransaction(async (tx) => {
    const attemptRef = paymentAttemptsCollection().doc(params.paymentAttemptId);
    const invoiceRefs = invoiceIds.map((id) => invoicesCollection().doc(id));

    // Firestore requires ALL reads before ANY writes — read up front.
    const [attemptSnap, ...invoiceSnaps] = await Promise.all([
      tx.get(attemptRef),
      ...invoiceRefs.map((ref) => tx.get(ref)),
    ]);

    if (!attemptSnap.exists) {
      throw new Error('Payment attempt not found');
    }

    const attempt = attemptSnap.data() as { status?: string };
    if (attempt.status === 'SUCCEEDED') {
      return { transactionId: '', destinationWalletId };
    }

    const now = new Date();

    // Ensure the gateway wallet exists (merge — never clobber balance).
    tx.set(
      walletsCollection().doc(EXTERNAL_XENDIT_WALLET_ID),
      {
        walletId: EXTERNAL_XENDIT_WALLET_ID,
        ownerId: 'XENDIT',
        ownerType: 'SCHOOL_SYSTEM',
        currency: 'IDR',
        updatedAt: now,
      },
      { merge: true }
    );

    tx.update(attemptRef, {
      status: 'SUCCEEDED',
      paymentMethod: params.paymentMethod,
      externalId: params.externalId,
      updatedAt: now,
    });

    const transactionId = appendLedgerTransaction(tx, {
      paymentAttemptId: params.paymentAttemptId,
      sourceWalletId: EXTERNAL_XENDIT_WALLET_ID,
      destinationWalletId,
      amount: params.amount,
      category,
      metaData: {
        referenceId: params.metaData.referenceId ?? params.metaData.invoiceId,
        itemsPurchased: params.metaData.cartItems,
        description,
      },
    });

    // Credit the destination wallet (create-or-increment).
    tx.set(
      walletsCollection().doc(destinationWalletId),
      {
        walletId: destinationWalletId,
        ownerId,
        ownerType,
        currency: 'IDR',
        balance: FieldValue.increment(params.amount),
        updatedAt: now,
      },
      { merge: true }
    );

    // Pathway A bridge — mark every linked invoice PAID on successful callback.
    invoiceSnaps.forEach((snap, i) => {
      if (!snap || !snap.exists) return;
      const inv = snap.data() as { amount?: number };
      tx.set(
        invoiceRefs[i],
        {
          status: 'paid',
          paidAmount: Number(inv.amount ?? 0),
          remainingAmount: 0,
          updatedAt: now,
        },
        { merge: true }
      );
    });

    return { transactionId, destinationWalletId };
  });
}

export async function applyInternalTransfer(params: {
  sourceWalletId: string;
  destinationWalletId: string;
  amount: number;
  category: LedgerTransactionCategory;
  metaData: LedgerTransactionMetaData;
  sourceOwnerId: string;
  sourceOwnerType: WalletOwnerType;
  destinationOwnerId: string;
  destinationOwnerType: WalletOwnerType;
}): Promise<{ transactionId: string }> {
  const db = getFirestore();

  if (params.amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  if (params.sourceWalletId === params.destinationWalletId) {
    throw new Error('Source and destination wallets must differ');
  }

  return db.runTransaction(async (tx) => {
    const sourceRef = walletsCollection().doc(params.sourceWalletId);
    const destRef = walletsCollection().doc(params.destinationWalletId);

    // Reads first (Firestore transaction rule).
    const [sourceSnap, destSnap] = await Promise.all([tx.get(sourceRef), tx.get(destRef)]);
    const sourceBalance = Number((sourceSnap.data() as { balance?: number })?.balance ?? 0);

    if (!sourceSnap.exists || sourceBalance < params.amount) {
      throw new Error('Insufficient wallet balance');
    }

    const now = new Date();

    // Lazy-create the destination wallet if it doesn't exist yet.
    if (!destSnap.exists) {
      tx.set(destRef, {
        walletId: params.destinationWalletId,
        ownerId: params.destinationOwnerId,
        ownerType: params.destinationOwnerType,
        balance: 0,
        currency: 'IDR',
        updatedAt: now,
      });
    }

    const transactionId = appendLedgerTransaction(tx, {
      paymentAttemptId: null,
      sourceWalletId: params.sourceWalletId,
      destinationWalletId: params.destinationWalletId,
      amount: params.amount,
      category: params.category,
      metaData: params.metaData,
    });

    tx.update(sourceRef, {
      balance: FieldValue.increment(-params.amount),
      updatedAt: now,
    });

    tx.set(
      destRef,
      {
        balance: FieldValue.increment(params.amount),
        updatedAt: now,
      },
      { merge: true }
    );

    return { transactionId };
  });
}

export async function findPaymentAttemptByExternalId(externalId: string) {
  const snap = await paymentAttemptsCollection()
    .where('externalId', '==', externalId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return docToJson(snap.docs[0]);
}

export async function findPaymentAttemptById(paymentAttemptId: string) {
  const snap = await paymentAttemptsCollection().doc(paymentAttemptId).get();
  if (!snap.exists) return null;
  return docToJson(snap);
}

export function inferOwnerFromWalletId(walletId: string): {
  ownerId: string;
  ownerType: WalletOwnerType;
} {
  if (walletId.startsWith('STUDENT_')) {
    return { ownerId: walletId.replace('STUDENT_', ''), ownerType: 'STUDENT' };
  }
  if (walletId.startsWith('PARENT_')) {
    return { ownerId: walletId.replace('PARENT_', ''), ownerType: 'PARENT' };
  }
  if (walletId.startsWith('CANTEEN_VENDOR_')) {
    return { ownerId: walletId.replace('CANTEEN_VENDOR_', ''), ownerType: 'CANTEEN_VENDOR' };
  }
  if (walletId.startsWith('SCHOOL_SYSTEM_')) {
    return { ownerId: walletId.replace('SCHOOL_SYSTEM_', ''), ownerType: 'SCHOOL_SYSTEM' };
  }
  throw new Error('Unknown wallet id pattern');
}

export { canteenVendorWalletId, parentWalletId, studentWalletId, schoolSystemWalletId };
