import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const APP_SETTINGS_COLLECTION = 'appSettings';
const GLOBAL_SETTINGS_DOC = 'global';

export interface AppSettings {
    updatedAt: Date;
}

export const appSettingsService = {
    async isPremiumForAll(): Promise<boolean> {
        return false;
    },

    async setPremiumForAll(enabled: boolean): Promise<boolean> {
        return true;
    }
};
