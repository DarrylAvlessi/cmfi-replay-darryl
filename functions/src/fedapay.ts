import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const fedapaySecret = defineSecret('FEDAPAY_SECRET_KEY');

interface VerifyFedapayData {
  transactionId: number;
}

export const verifyFedapayTransaction = onCall<VerifyFedapayData>(
  {
    secrets: [fedapaySecret],
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be logged in to record a donation.',
      );
    }

    const { transactionId } = request.data;

    if (!transactionId) {
      throw new HttpsError(
        'invalid-argument',
        'transactionId is required.',
      );
    }

    const secretKey = fedapaySecret.value();
    const environment = secretKey.startsWith('sk_sandbox_') ? 'sandbox' : 'live';
    const baseUrl = environment === 'sandbox'
      ? 'https://sandbox-api.fedapay.com/v1'
      : 'https://api.fedapay.com/v1';

    let transaction: any;

    try {
      const response = await fetch(`${baseUrl}/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('FedaPay API error:', response.status, errorBody);
        throw new HttpsError(
          'internal',
          'Failed to verify transaction with FedaPay.',
        );
      }

      const data = await response.json();
      transaction = data.transaction || data;
    } catch (error) {
      console.error('FedaPay verification error:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        'internal',
        'Failed to verify transaction. Please try again.',
      );
    }

    if (transaction.status !== 'approved') {
      throw new HttpsError(
        'failed-precondition',
        `Transaction has not been completed. Status: ${transaction.status}`,
      );
    }

    try {
      const metadata = transaction.custom_metadata || {};

      const donation = {
        amount: transaction.amount,
        currency: transaction.currency?.iso || 'XOF',
        streamerId: metadata.streamerId || 'cmfi-replay',
        streamerName: metadata.streamerName || 'CMFI Replay',
        donorId: request.auth.uid,
        donorName:
          request.auth.token.name ||
          request.auth.token.email?.split('@')[0] ||
          'Anonymous',
        createdAt: FieldValue.serverTimestamp(),
        status: 'completed' as const,
        paymentMethod: 'fedapay',
        transactionReference: transaction.reference,
      };

      const db = getFirestore();
      await db.collection('donations').add(donation);

      return { success: true };
    } catch (error) {
      console.error('recordDonation error:', error);
      throw new HttpsError(
        'internal',
        'Failed to record donation.',
      );
    }
  },
);
