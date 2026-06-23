import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

interface RecordFedapayDonationData {
  transactionId: number;
  status: string;
  amount: number;
  reference: string;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
}

export const recordFedapayDonation = onCall<RecordFedapayDonationData>(
  {
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be logged in to record a donation.',
      );
    }

    const { transactionId, status, amount, reference, currency, metadata } =
      request.data;

    if (!transactionId || !status || !amount || !reference) {
      throw new HttpsError(
        'invalid-argument',
        'transactionId, status, amount, and reference are required.',
      );
    }

    if (status !== 'approved') {
      throw new HttpsError(
        'failed-precondition',
        `Transaction has not been completed. Status: ${status}`,
      );
    }

    try {
      const streamerId = metadata?.streamerId || 'cmfi-replay';
      const streamerName = metadata?.streamerName || 'CMFI Replay';

      const donation = {
        amount,
        currency: currency || 'XOF',
        streamerId,
        streamerName,
        donorId: request.auth.uid,
        donorName:
          request.auth.token.name ||
          request.auth.token.email?.split('@')[0] ||
          'Anonymous',
        createdAt: FieldValue.serverTimestamp(),
        status: 'completed' as const,
        paymentMethod: 'fedapay',
        transactionReference: reference,
        transactionId,
      };

      const db = getFirestore();
      await db.collection('donations').add(donation);

      return { success: true };
    } catch (error) {
      console.error('recordFedapayDonation error:', error);
      throw new HttpsError(
        'internal',
        'Failed to record donation.',
      );
    }
  },
);
