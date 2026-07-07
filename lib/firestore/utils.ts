import { db } from '../firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    limit,
    orderBy,
    Timestamp,
    writeBatch,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import {
    SerieCategory,
    EpisodeSerie,
    StatsVues,
    AppSettings,
} from './types';
import {
    EPISODES_SERIES_COLLECTION,
    STATS_VUES_COLLECTION,
    USERS_COLLECTION,
    MOVIES_COLLECTION,
    APP_SETTINGS_COLLECTION,
} from './constants';

const devLog = import.meta.env.DEV ? console.log : () => {};

export const getCategoryName = (category: SerieCategory, language: 'en' | 'fr'): string => {
    if (language === 'fr' && category.nameFr?.trim()) {
        return category.nameFr;
    }
    return category.name;
};

export const generateDefaultAvatar = (name?: string): string => {
    const displayName = name || 'User';
    const initial = displayName.charAt(0).toUpperCase();
    return `https://ui-avatars.com/api/?name=${initial}&background=random&color=fff&size=128`;
};

export const getLastWatchedPosition = async (userId: string, episodeUid: string): Promise<number> => {
    try {
        const episodeQuery = query(
            collection(db, EPISODES_SERIES_COLLECTION),
            where('uid_episode', '==', episodeUid),
            limit(1)
        );
        const episodeSnapshot = await getDocs(episodeQuery);

        if (episodeSnapshot.empty) return 0;

        const episodeRef = doc(db, EPISODES_SERIES_COLLECTION, episodeSnapshot.docs[0].id);

        const q = query(
            collection(db, STATS_VUES_COLLECTION),
            where('idEpisodeSerie', '==', episodeRef),
            where('user', '==', doc(db, USERS_COLLECTION, userId)),
            limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const stats = querySnapshot.docs[0].data() as StatsVues;
            return stats.tempsRegarde || 0;
        }

        return 0;
    } catch (error) {
        console.error('Erreur lors de la récupération de la position de lecture:', error);
        return 0;
    }
};

export const getLastWatchedPositionForMovie = async (userId: string, movieId: string): Promise<number> => {
    try {
        const q = query(
            collection(db, STATS_VUES_COLLECTION),
            where('uid', '==', movieId),
            where('user', '==', doc(db, USERS_COLLECTION, userId)),
            limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const stats = querySnapshot.docs[0].data() as StatsVues;
            return stats.tempsRegarde || 0;
        }

        return 0;
    } catch (error) {
        console.error('Erreur lors de la récupération de la position de lecture du film:', error);
        return 0;
    }
};

export const updateEpisodeViews = async (): Promise<void> => {
    try {
        devLog('Début du calcul des vues des épisodes...');

        const statsVuesSnapshot = await getDocs(collection(db, 'statsVues'));

        const viewsByEpisode: { [key: string]: number } = {};

        statsVuesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.idEpisodeSerie) {
                const episodeRef = data.idEpisodeSerie;
                const episodeId = typeof episodeRef === 'string' ? episodeRef : episodeRef.id;
                const counter = data.counter || 0;

                if (!viewsByEpisode[episodeId]) {
                    viewsByEpisode[episodeId] = 0;
                }
                viewsByEpisode[episodeId] += counter;
            }
        });

        devLog(`Nombre d'épisodes trouvés dans statsVues: ${Object.keys(viewsByEpisode).length}`);

        const BATCH_LIMIT = 500;
        let batch = writeBatch(db);
        let batchCount = 0;
        let totalProcessed = 0;

        for (const [episodeId, totalViews] of Object.entries(viewsByEpisode)) {
            try {
                const episodeRef = doc(db, EPISODES_SERIES_COLLECTION, episodeId);

                const episodeDoc = await getDoc(episodeRef);

                if (episodeDoc.exists()) {
                    batch.update(episodeRef, { views: totalViews });
                    batchCount++;
                    totalProcessed++;

                    if (batchCount >= BATCH_LIMIT) {
                        await batch.commit();
                        devLog(`Lot de ${batchCount} mises à jour effectué (${totalProcessed}/${Object.keys(viewsByEpisode).length} au total)`);
                        batch = writeBatch(db);
                        batchCount = 0;
                    }
                } else {
                    console.warn(`L'épisode ${episodeId} n'existe pas dans la collection ${EPISODES_SERIES_COLLECTION}`);
                    totalProcessed++;
                }
            } catch (error) {
                console.error(`Erreur lors de la mise à jour de l'épisode ${episodeId}:`, error);
                totalProcessed++;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
            devLog(`Dernier lot de ${batchCount} mises à jour effectué (${totalProcessed}/${Object.keys(viewsByEpisode).length} au total)`);
        }

        devLog('Mise à jour des vues terminée avec succès !');
        return Promise.resolve();
    } catch (error) {
        console.error('Erreur lors de la mise à jour des vues des épisodes:', error);
        return Promise.reject(error);
    }
};

export const initializeMovieViews = async (): Promise<{ success: boolean; updated: number }> => {
    try {
        devLog('Début de l\'initialisation des vues des films...');

        const moviesQuery = query(
            collection(db, 'movies'),
            limit(100)
        );

        const snapshot = await getDocs(moviesQuery);

        if (snapshot.empty) {
            devLog('Aucun film trouvé');
            return { success: true, updated: 0 };
        }

        const moviesToUpdate = snapshot.docs.filter(doc =>
            doc.data().views === undefined
        );

        if (moviesToUpdate.length === 0) {
            devLog('Tous les films ont déjà un champ views');
            return { success: true, updated: 0 };
        }

        devLog(`Mise à jour de ${moviesToUpdate.length} films...`);

        const batch = writeBatch(db);
        moviesToUpdate.forEach(doc => {
            batch.update(doc.ref, { views: 0 });
        });

        await batch.commit();
        devLog(`${moviesToUpdate.length} films mis à jour avec succès`);

        return { success: true, updated: moviesToUpdate.length };
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des vues des films:', error);
        return { success: false, updated: 0 };
    }
};

export const updateAppSettings = async (updates: Partial<AppSettings>): Promise<void> => {
    try {
        const settingsRef = doc(db, APP_SETTINGS_COLLECTION, 'global');
        await setDoc(settingsRef, {
            ...updates,
            updatedAt: Timestamp.now()
        }, { merge: true });
    } catch (error) {
        console.error('Error updating app settings:', error);
        throw error;
    }
};

export function getCountryName(countryCode: string): string {
    const countryNames: Record<string, string> = {
        'FR': 'France',
        'US': 'États-Unis',
        'CA': 'Canada',
        'GB': 'Royaume-Uni',
        'DE': 'Allemagne',
        'ES': 'Espagne',
        'IT': 'Italie',
        'BE': 'Belgique',
        'CH': 'Suisse',
        'CM': 'Cameroun',
        'SN': 'Sénégal',
        'CI': 'Côte d\'Ivoire',
        'ML': 'Mali',
        'BF': 'Burkina Faso',
        'NE': 'Niger',
        'TD': 'Tchad',
        'CF': 'République centrafricaine',
        'GA': 'Gabon',
        'CG': 'Congo',
        'CD': 'République démocratique du Congo',
        'GN': 'Guinée',
        'BJ': 'Bénin',
        'TG': 'Togo',
        'GH': 'Ghana',
        'NG': 'Nigeria',
        'AO': 'Angola',
        'ZA': 'Afrique du Sud',
        'KE': 'Kenya',
        'TZ': 'Tanzanie',
        'UG': 'Ouganda',
        'RW': 'Rwanda',
        'ET': 'Éthiopie',
        'MG': 'Madagascar',
        'MU': 'Maurice',
        'RE': 'La Réunion',
        'MQ': 'Martinique',
        'GP': 'Guadeloupe',
        'GF': 'Guyane française',
        'PF': 'Polynésie française',
        'NC': 'Nouvelle-Calédonie',
        'YT': 'Mayotte',
        'PM': 'Saint-Pierre-et-Miquelon',
        'BL': 'Saint-Barthélemy',
        'MF': 'Saint-Martin',
        'WF': 'Wallis-et-Futuna'
    };

    return countryNames[countryCode] || countryCode;
}
