"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyFedapayTransaction = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const fedapaySecret = (0, params_1.defineSecret)('FEDAPAY_SECRET_KEY');
exports.verifyFedapayTransaction = (0, https_1.onCall)({
    secrets: [fedapaySecret],
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in to record a donation.');
    }
    const { transactionId } = request.data;
    if (!transactionId) {
        throw new https_1.HttpsError('invalid-argument', 'transactionId is required.');
    }
    const secretKey = fedapaySecret.value();
    const environment = secretKey.startsWith('sk_sandbox_') ? 'sandbox' : 'live';
    const baseUrl = environment === 'sandbox'
        ? 'https://sandbox-api.fedapay.com/v1'
        : 'https://api.fedapay.com/v1';
    let transaction;
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
            throw new https_1.HttpsError('internal', 'Failed to verify transaction with FedaPay.');
        }
        const data = await response.json();
        transaction = data.transaction || data;
    }
    catch (error) {
        console.error('FedaPay verification error:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to verify transaction. Please try again.');
    }
    if (transaction.status !== 'approved') {
        throw new https_1.HttpsError('failed-precondition', `Transaction has not been completed. Status: ${transaction.status}`);
    }
    try {
        const metadata = transaction.custom_metadata || {};
        const donation = {
            amount: transaction.amount,
            currency: transaction.currency?.iso || 'XOF',
            streamerId: metadata.streamerId || 'cmfi-replay',
            streamerName: metadata.streamerName || 'CMFI Replay',
            donorId: request.auth.uid,
            donorName: request.auth.token.name ||
                request.auth.token.email?.split('@')[0] ||
                'Anonymous',
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            status: 'completed',
            paymentMethod: 'fedapay',
            transactionReference: transaction.reference,
        };
        const db = (0, firestore_1.getFirestore)();
        await db.collection('donations').add(donation);
        return { success: true };
    }
    catch (error) {
        console.error('recordDonation error:', error);
        throw new https_1.HttpsError('internal', 'Failed to record donation.');
    }
});
//# sourceMappingURL=fedapay.js.map