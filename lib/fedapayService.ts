import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';

export const fedapayPublicKey = import.meta.env.VITE_FEDAPAY_PUBLIC_KEY;
export const fedapayEnabled = !!fedapayPublicKey;

const functions = getFunctions(app, 'us-central1');

interface RecordFedapayDonationData {
  transactionId: number;
  status: string;
  amount: number;
  reference: string;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
}

interface RecordFedapayDonationResponse {
  success: boolean;
}

let checkoutJsPromise: Promise<void> | null = null;

function loadCheckoutJs(): Promise<void> {
  if (checkoutJsPromise) return checkoutJsPromise;

  checkoutJsPromise = new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).FedaPay) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.fedapay.com/checkout.js?v=1.1.7';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      checkoutJsPromise = null;
      reject(new Error('Failed to load FedaPay Checkout'));
    };
    document.head.appendChild(script);
  });

  return checkoutJsPromise;
}

export const fedapayService = {
  async loadScript(): Promise<void> {
    return loadCheckoutJs();
  },

  async recordDonation(data: RecordFedapayDonationData): Promise<void> {
    const record = httpsCallable<
      RecordFedapayDonationData,
      RecordFedapayDonationResponse
    >(functions, 'recordFedapayDonation');

    await record(data);
  },
};
