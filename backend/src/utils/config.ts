import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../config/firebase';

// Configuration keys
export const CONFIG_KEYS = {
  ADMIN_FEE_PERCENTAGE: 'admin_fee_percentage',
  SUBSCRIPTION_FEE_PER_STUDENT: 'subscription_fee_per_student',
  PAYMENT_GATEWAY_FEE_PERCENTAGE: 'payment_gateway_fee_percentage',
  PLATFORM_FEE_PERCENTAGE: 'platform_fee_percentage',
  TAX_PERCENTAGE: 'tax_percentage'
} as const;

// Default values
export const DEFAULT_CONFIG = {
  [CONFIG_KEYS.ADMIN_FEE_PERCENTAGE]: 10, // 10%
  [CONFIG_KEYS.SUBSCRIPTION_FEE_PER_STUDENT]: 0, // 0 rupiah
  [CONFIG_KEYS.PAYMENT_GATEWAY_FEE_PERCENTAGE]: 3, // 3% of admin fee
  [CONFIG_KEYS.PLATFORM_FEE_PERCENTAGE]: 4, // 4% of admin fee
  [CONFIG_KEYS.TAX_PERCENTAGE]: 3 // 3% of admin fee
} as const;

const CONFIG_COLLECTION = 'config';

// Get configuration value
export async function getConfig(key: string, defaultValue?: any): Promise<any> {
  try {
    const snap = await firestore.collection(CONFIG_COLLECTION).doc(key).get();
    if (snap.exists) return snap.data()?.value;
    return defaultValue !== undefined ? defaultValue : DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
  } catch (error) {
    console.error(`Error getting config ${key}:`, error);
    return defaultValue !== undefined ? defaultValue : DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
  }
}

// Set configuration value
export async function setConfig(key: string, value: any, updatedBy?: string): Promise<void> {
  try {
    await firestore.collection(CONFIG_COLLECTION).doc(key).set(
      {
        key,
        value,
        type:
          typeof value === 'number'
            ? 'number'
            : typeof value === 'boolean'
              ? 'boolean'
              : typeof value === 'object'
                ? 'object'
                : 'string',
        updatedBy: updatedBy || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error(`Error setting config ${key}:`, error);
    throw error;
  }
}

// Get admin fee percentage
export async function getAdminFeePercentage(): Promise<number> {
  return await getConfig(CONFIG_KEYS.ADMIN_FEE_PERCENTAGE, DEFAULT_CONFIG[CONFIG_KEYS.ADMIN_FEE_PERCENTAGE]);
}

// Get subscription fee per student
export async function getSubscriptionFeePerStudent(): Promise<number> {
  return await getConfig(CONFIG_KEYS.SUBSCRIPTION_FEE_PER_STUDENT, DEFAULT_CONFIG[CONFIG_KEYS.SUBSCRIPTION_FEE_PER_STUDENT]);
}

// Calculate admin fee and breakdown
export async function calculateAdminFee(transactionAmount: number): Promise<{
  adminFeePercentage: number;
  adminFeeAmount: number;
  feeBreakdown: {
    paymentGateway: number;
    platform: number;
    tax: number;
  };
  netAmount: number;
}> {
  const adminFeePercentage = await getAdminFeePercentage();
  const paymentGatewayFeePercentage = await getConfig(CONFIG_KEYS.PAYMENT_GATEWAY_FEE_PERCENTAGE, DEFAULT_CONFIG[CONFIG_KEYS.PAYMENT_GATEWAY_FEE_PERCENTAGE]);
  const platformFeePercentage = await getConfig(CONFIG_KEYS.PLATFORM_FEE_PERCENTAGE, DEFAULT_CONFIG[CONFIG_KEYS.PLATFORM_FEE_PERCENTAGE]);
  const taxPercentage = await getConfig(CONFIG_KEYS.TAX_PERCENTAGE, DEFAULT_CONFIG[CONFIG_KEYS.TAX_PERCENTAGE]);

  // Calculate admin fee amount
  const adminFeeAmount = (transactionAmount * adminFeePercentage) / 100;

  // Calculate fee breakdown (percentages of admin fee amount)
  const paymentGatewayFee = (adminFeeAmount * paymentGatewayFeePercentage) / 100;
  const platformFee = (adminFeeAmount * platformFeePercentage) / 100;
  const taxFee = (adminFeeAmount * taxPercentage) / 100;

  // Net amount (amount school receives)
  const netAmount = transactionAmount - adminFeeAmount;

  return {
    adminFeePercentage,
    adminFeeAmount,
    feeBreakdown: {
      paymentGateway: paymentGatewayFee,
      platform: platformFee,
      tax: taxFee
    },
    netAmount
  };
}

// Initialize default configuration
export async function initializeDefaultConfig(): Promise<void> {
  try {
    for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
      const snap = await firestore.collection(CONFIG_COLLECTION).doc(key).get();
      if (snap.exists) continue;
      await firestore.collection(CONFIG_COLLECTION).doc(key).set({
        key,
        value,
        type:
          typeof value === 'number'
            ? 'number'
            : typeof value === 'boolean'
              ? 'boolean'
              : typeof value === 'object'
                ? 'object'
                : 'string',
        description: getConfigDescription(key),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`✅ Initialized config: ${key} = ${value}`);
    }
  } catch (error) {
    console.error('Error initializing default config:', error);
  }
}

function getConfigDescription(key: string): string {
  const descriptions: Record<string, string> = {
    [CONFIG_KEYS.ADMIN_FEE_PERCENTAGE]: 'Admin fee percentage applied to all transactions (default: 10%)',
    [CONFIG_KEYS.SUBSCRIPTION_FEE_PER_STUDENT]: 'Subscription fee per student in rupiah (default: 0)',
    [CONFIG_KEYS.PAYMENT_GATEWAY_FEE_PERCENTAGE]: 'Payment gateway fee percentage of admin fee (default: 3%)',
    [CONFIG_KEYS.PLATFORM_FEE_PERCENTAGE]: 'Platform fee percentage of admin fee (default: 4%)',
    [CONFIG_KEYS.TAX_PERCENTAGE]: 'Tax percentage of admin fee (default: 3%)'
  };
  return descriptions[key] || '';
}


