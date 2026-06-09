"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordDonation = exports.createDonationIntent = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const stripe_1 = __importDefault(require("stripe"));
(0, app_1.initializeApp)();
const stripeSecret = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
exports.createDonationIntent = (0, https_1.onCall)({
    secrets: [stripeSecret],
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in to make a donation.');
    }
    const { amount, streamerId, streamerName } = request.data;
    if (!amount || amount < 1) {
        throw new https_1.HttpsError('invalid-argument', 'Donation amount must be at least €1.');
    }
    if (!streamerId || !streamerName) {
        throw new https_1.HttpsError('invalid-argument', 'streamerId and streamerName are required.');
    }
    try {
        const stripe = new stripe_1.default(stripeSecret.value());
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
    }
    catch (error) {
        console.error('Stripe error:', error);
        throw new https_1.HttpsError('internal', 'Failed to create payment intent. Please try again.');
    }
});
exports.recordDonation = (0, https_1.onCall)({
    secrets: [stripeSecret],
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in to record a donation.');
    }
    const { paymentIntentId } = request.data;
    if (!paymentIntentId) {
        throw new https_1.HttpsError('invalid-argument', 'paymentIntentId is required.');
    }
    try {
        const stripe = new stripe_1.default(stripeSecret.value());
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== 'succeeded') {
            throw new https_1.HttpsError('failed-precondition', 'Payment has not been completed.');
        }
        const { amount, metadata } = paymentIntent;
        const donorName = request.auth.token.name ||
            request.auth.token.email?.split('@')[0] ||
            'Anonymous';
        const donation = {
            amount: amount / 100,
            streamerId: metadata.streamerId,
            streamerName: metadata.streamerName,
            donorId: request.auth.uid,
            donorName,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            status: 'completed',
        };
        const db = (0, firestore_1.getFirestore)();
        await db.collection('donations').add(donation);
        return { success: true };
    }
    catch (error) {
        console.error('recordDonation error:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to record donation.');
    }
});
//# sourceMappingURL=index.js.map