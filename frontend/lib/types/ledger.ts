/**
 * Future-proof double-entry ledger types.
 * Every financial event in the school ecosystem writes to `/transactions`.
 */

export type PaymentAttemptStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';

export type PaymentType = 'WALLET_REFILL' | 'TUITION' | 'STORE_PURCHASE';

export type LedgerTransactionCategory =
  | 'WALLET_REFILL'
  | 'TUITION_PAYMENT'
  | 'CANTEEN_ITEM_PURCHASE'
  | 'STORE_ITEM_PURCHASE'
  | 'CANTEEN_PAYOUT';

export type WalletOwnerType = 'STUDENT' | 'PARENT' | 'CANTEEN_VENDOR' | 'SCHOOL_SYSTEM';

/** Extensible metadata on payment attempts (invoiceId, cart, studentId, etc.). */
export interface PaymentAttemptMetaData {
  referenceId?: string;
  invoiceId?: string;
  studentId?: string;
  parentId?: string;
  targetWalletId?: string;
  destinationWalletId?: string;
  cartItems?: Array<{ itemId: string; qty: number; price: number }>;
  description?: string;
  [key: string]: unknown;
}

/** External gateway log — tracks cash flows before they hit internal wallets. */
export interface PaymentAttempt {
  paymentAttemptId: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  /** Xendit Invoice ID */
  externalId: string;
  status: PaymentAttemptStatus;
  paymentType: PaymentType;
  metaData: PaymentAttemptMetaData;
  invoiceUrl: string;
  createdAt: string;
}

export interface LedgerTransactionMetaData {
  referenceId?: string;
  itemsPurchased?: Array<{ itemId: string; qty: number; price: number }>;
  description: string;
  [key: string]: unknown;
}

/** Immutable unified ledger row — every money movement. */
export interface LedgerTransaction {
  transactionId: string;
  paymentAttemptId: string | null;
  sourceWalletId: string;
  destinationWalletId: string;
  amount: number;
  category: LedgerTransactionCategory;
  metaData: LedgerTransactionMetaData;
  timestamp: string;
}

/** Virtual vault / balance aggregator. */
export interface Wallet {
  walletId: string;
  ownerId: string;
  ownerType: WalletOwnerType;
  balance: number;
  currency: 'IDR';
  updatedAt: string;
}

export const EXTERNAL_XENDIT_WALLET_ID = 'EXTERNAL_XENDIT';

/** Virtual source wallet representing physical cash taken in at the TU desk POS. */
export const EXTERNAL_CASH_WALLET_ID = 'EXTERNAL_CASH';

export function schoolSystemWalletId(schoolId: string): string {
  return `SCHOOL_SYSTEM_${schoolId}`;
}

export function studentWalletId(studentId: string): string {
  return `STUDENT_${studentId}`;
}

export function parentWalletId(parentId: string): string {
  return `PARENT_${parentId}`;
}

export function canteenVendorWalletId(vendorId: string): string {
  return `CANTEEN_VENDOR_${vendorId}`;
}

export function paymentTypeToLedgerCategory(paymentType: PaymentType): LedgerTransactionCategory {
  switch (paymentType) {
    case 'WALLET_REFILL':
      return 'WALLET_REFILL';
    case 'TUITION':
      return 'TUITION_PAYMENT';
    case 'STORE_PURCHASE':
      return 'STORE_ITEM_PURCHASE';
    default:
      return 'WALLET_REFILL';
  }
}
