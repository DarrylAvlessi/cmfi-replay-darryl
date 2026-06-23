import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';

initializeApp();

const stripeSecret = defineSecret('STRIPE_SECRET_KEY');

interface CreateDonationIntentData {
  amount: number;
  streamerId: string;
  streamerName: string;
}

interface DonationRecord {
  amount: number;
  streamerId: string;
  streamerName: string;
  donorId: string;
  donorName: string;
  createdAt: FirebaseFirestore.FieldValue;
  status: 'completed';
}

export const createDonationIntent = onCall<CreateDonationIntentData>(
  {
    secrets: [stripeSecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be logged in to make a donation.',
      );
    }

    const { amount, streamerId, streamerName } = request.data;

    if (!amount || amount < 1) {
      throw new HttpsError(
        'invalid-argument',
        'Donation amount must be at least €1.',
      );
    }

    if (!streamerId || !streamerName) {
      throw new HttpsError(
        'invalid-argument',
        'streamerId and streamerName are required.',
      );
    }

    try {
      const stripe = new Stripe(stripeSecret.value());

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'eur',
        metadata: {
          streamerId,
          streamerName,
          donorId: request.auth.uid,
        },
      });

      return { clientSecret: paymentIntent.client_secret };
    } catch (error) {
      console.error('Stripe error:', error);
      throw new HttpsError(
        'internal',
        'Failed to create payment intent. Please try again.',
      );
    }
  },
);

export const recordDonation = onCall<{ paymentIntentId: string }>(
  {
    secrets: [stripeSecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be logged in to record a donation.',
      );
    }

    const { paymentIntentId } = request.data;

    if (!paymentIntentId) {
      throw new HttpsError(
        'invalid-argument',
        'paymentIntentId is required.',
      );
    }

    try {
      const stripe = new Stripe(stripeSecret.value());

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        throw new HttpsError(
          'failed-precondition',
          'Payment has not been completed.',
        );
      }

      const { amount, metadata } = paymentIntent;
      const donorName =
        request.auth.token.name ||
        request.auth.token.email?.split('@')[0] ||
        'Anonymous';

      const donation: DonationRecord = {
        amount: amount / 100,
        streamerId: metadata.streamerId,
        streamerName: metadata.streamerName,
        donorId: request.auth.uid,
        donorName,
        createdAt: FieldValue.serverTimestamp(),
        status: 'completed',
      };

      const db = getFirestore();
      await db.collection('donations').add(donation);

      return { success: true };
    } catch (error) {
      console.error('recordDonation error:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'Failed to record donation.',
      );
    }
  },
);

export { recordFedapayDonation } from './fedapay';
