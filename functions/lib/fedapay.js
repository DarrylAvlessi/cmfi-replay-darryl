"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordFedapayDonation = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.recordFedapayDonation = (0, https_1.onCall)({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in to record a donation.');
    }
    const { transactionId, status, amount, reference, currency, metadata } = request.data;
    if (!transactionId || !status || !amount || !reference) {
        throw new https_1.HttpsError('invalid-argument', 'transactionId, status, amount, and reference are required.');
    }
    if (status !== 'approved') {
        throw new https_1.HttpsError('failed-precondition', `Transaction has not been completed. Status: ${status}`);
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
            donorName: request.auth.token.name ||
                request.auth.token.email?.split('@')[0] ||
                'Anonymous',
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            status: 'completed',
            paymentMethod: 'fedapay',
            transactionReference: reference,
            transactionId,
        };
        const db = (0, firestore_1.getFirestore)();
        await db.collection('donations').add(donation);
        return { success: true };
    }
    catch (error) {
        console.error('recordFedapayDonation error:', error);
        throw new https_1.HttpsError('internal', 'Failed to record donation.');
    }
});
//# sourceMappingURL=fedapay.js.map