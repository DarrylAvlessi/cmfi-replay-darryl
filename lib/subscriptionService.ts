import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';

export interface Subscription {
    end_subscription: string;
    isPremium: boolean;
    type_plan: 'free' | 'monthly' | 'yearly' | 'lifetime';
    user: DocumentReference | string;
}

const SUBSCRIPTIONS_COLLECTION = 'subscription';

export const subscriptionService = {
    async getSubscriptionDetails(userUid: string): Promise<{
        isPremium: boolean;
        planType: string;
        endDate: Date | null;
        daysRemaining: number | null;
    }> {
        return {
            isPremium: false,
            planType: 'free',
            endDate: null,
            daysRemaining: null
        };
    },

    async isUserPremium(userUid: string): Promise<boolean> {
        return false;
    },

    async createFreeSubscription(userUid: string): Promise<void> {
        return;
    }
};
