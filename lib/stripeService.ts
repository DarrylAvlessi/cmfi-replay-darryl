import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';
import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

const functions = getFunctions(app, 'us-central1');

interface CreateDonationIntentResponse {
  clientSecret: string;
}

interface RecordDonationResponse {
  success: boolean;
}

export const donationService = {
  async createPaymentIntent(
    amount: number,
    streamerId: string,
    streamerName: string,
  ): Promise<string> {
    const createIntent = httpsCallable<
      { amount: number; streamerId: string; streamerName: string },
      CreateDonationIntentResponse
    >(functions, 'createDonationIntent');

    const result = await createIntent({ amount, streamerId, streamerName });
    return result.data.clientSecret;
  },

  async recordDonation(paymentIntentId: string): Promise<void> {
    const record = httpsCallable<
      { paymentIntentId: string },
      RecordDonationResponse
    >(functions, 'recordDonation');

    await record({ paymentIntentId });
  },
};
