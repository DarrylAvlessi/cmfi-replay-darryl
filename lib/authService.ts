import { auth, googleProvider } from './firebase';
import { signInWithPopup, UserCredential, signOut as firebaseSignOut } from 'firebase/auth';
import { userService } from './db';

/**
 * Service d'authentification Google
 */
export const authService = {
    /**
     * Connexion avec Google via popup
     * Recommandé pour desktop
     */
    signInWithGooglePopup: async (): Promise<UserCredential> => {
        try {
            console.log('🔄 Tentative de connexion Google via popup...');
            
            // Vérifier si les popups sont possibles
            if (typeof window === 'undefined') {
                throw new Error('Window object not available');
            }

            const result = await signInWithPopup(auth, googleProvider);
            console.log('✅ Popup Google réussie, utilisateur:', result.user.email);

            return result;
        } catch (error: any) {
            console.error('❌ Erreur lors de la connexion Google (popup):', error);
            console.error('Code d\'erreur:', error.code);
            console.error('Message d\'erreur:', error.message);
            
            // Si la popup est bloquée, signaler pour utiliser le fallback
            if (error.code === 'auth/popup-blocked') {
                console.error('❌ La connexion a échoué car la popup a été bloquée. Veuillez autoriser les popups pour ce site.');
            }
            throw error;
        }
    },

    /**
     * Connexion Google (uniquement via popup)
     */
    signInWithGoogle: async (): Promise<UserCredential> => {
        console.log('💻 Tentative de connexion Google via popup...');
        try {
            return await authService.signInWithGooglePopup();
        } catch (error: any) {
            console.error('❌ Erreur lors de la connexion Google:', error);
            throw error;
        }
    },

    /**
     * Déconnexion de l'utilisateur
     */
    signOut: async (): Promise<void> => {
        try {
            // Mettre à jour le statut de présence avant la déconnexion
            const user = auth.currentUser;
            if (user) {
                try {
                    // Mettre à jour le statut à offline ET lastSeen pour éviter qu'il soit remis à online
                    await userService.updateUserProfile(user.uid, { 
                        presence: 'offline',
                        lastSeen: new Date() // Mettre à jour lastSeen pour éviter qu'il soit remis à online
                    });
                } catch (error) {
                    console.error('Erreur lors de la mise à jour du statut hors ligne:', error);
                }
            }
            
            // Déconnexion de Firebase
            await firebaseSignOut(auth);
            console.log('✅ Déconnexion réussie');
        } catch (error) {
            console.error('❌ Erreur lors de la déconnexion:', error);
            throw error;
        }
    }
};
