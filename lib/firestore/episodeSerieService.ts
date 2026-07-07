import { db } from '../firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    limit,
    orderBy,
} from 'firebase/firestore';
import { EpisodeSerie } from './types';
import {
    EPISODES_SERIES_COLLECTION,
} from './constants';

export const episodeSerieService = {
    async getAllEpisodes(): Promise<EpisodeSerie[]> {
        try {
            const episodesSnapshot = await getDocs(collection(db, EPISODES_SERIES_COLLECTION));
            return episodesSnapshot.docs.map(doc => doc.data() as EpisodeSerie);
        } catch (error) {
            console.error('Error getting all episodes:', error);
            return [];
        }
    },

    async getEpisodeById(id: string): Promise<EpisodeSerie | null> {
        try {
            const episodeDoc = await getDoc(doc(db, EPISODES_SERIES_COLLECTION, id));
            if (episodeDoc.exists()) {
                return episodeDoc.data() as EpisodeSerie;
            }
            return null;
        } catch (error) {
            console.error('Error getting episode by ID:', error);
            return null;
        }
    },

    async getEpisodeByUid(uid_episode: string): Promise<EpisodeSerie | null> {
        try {
            const q = query(
                collection(db, EPISODES_SERIES_COLLECTION),
                where('uid_episode', '==', uid_episode),
                limit(1)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data() as EpisodeSerie;
            }
            return null;
        } catch (error) {
            console.error('Error getting episode by UID:', error);
            return null;
        }
    },

    async getEpisodesBySeason(uid_season: string): Promise<EpisodeSerie[]> {
        try {
            const q = query(
                collection(db, EPISODES_SERIES_COLLECTION),
                where('uid_season', '==', uid_season),
                where('hidden', '==', false),
                orderBy('episode_numero', 'asc')
            );
            const querySnapshot = await getDocs(q);
            const directEpisodes = querySnapshot.docs.map(doc => doc.data() as EpisodeSerie);

            const allEpisodesQuery = query(
                collection(db, EPISODES_SERIES_COLLECTION),
                where('hidden', '==', false)
            );
            const allSnapshot = await getDocs(allEpisodesQuery);
            const allEpisodes = allSnapshot.docs.map(doc => doc.data() as EpisodeSerie);

            const crossSeasonEpisodes = allEpisodes.filter(episode => {
                if (episode.other_seasons && episode.other_seasons[uid_season]) {
                    return true;
                }
                return false;
            });

            const combinedEpisodes = [...directEpisodes, ...crossSeasonEpisodes].sort((a, b) => {
                const episodeANumber = a.uid_season === uid_season ? a.episode_numero : (a.other_seasons?.[uid_season] || 0);
                const episodeBNumber = b.uid_season === uid_season ? b.episode_numero : (b.other_seasons?.[uid_season] || 0);
                return episodeANumber - episodeBNumber;
            });

            return combinedEpisodes;
        } catch (error) {
            console.error('Error getting episodes by season:', error);
            return [];
        }
    },

    async getEpisodeBySeasonAndNumber(uid_season: string, episode_numero: number): Promise<EpisodeSerie | null> {
        try {
            const q = query(
                collection(db, EPISODES_SERIES_COLLECTION),
                where('uid_season', '==', uid_season),
                where('episode_numero', '==', episode_numero),
                where('hidden', '==', false)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data() as EpisodeSerie;
            }

            const allEpisodesQuery = query(
                collection(db, EPISODES_SERIES_COLLECTION),
                where('hidden', '==', false)
            );
            const allSnapshot = await getDocs(allEpisodesQuery);
            const allEpisodes = allSnapshot.docs.map(doc => doc.data() as EpisodeSerie);

            const crossSeasonEpisode = allEpisodes.find(episode => {
                if (episode.other_seasons && episode.other_seasons[uid_season] === episode_numero) {
                    return true;
                }
                return false;
            });

            return crossSeasonEpisode || null;
        } catch (error) {
            console.error('Error getting episode by season and number:', error);
            return null;
        }
    },

    async getEpisodesBySerie(uid_serie: string): Promise<EpisodeSerie[]> {
        try {
            const q = query(
                collection(db, EPISODES_SERIES_COLLECTION),
                where('uid_serie', '==', uid_serie),
                where('hidden', '==', false),
                orderBy('episode_numero', 'asc')
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as EpisodeSerie);
        } catch (error) {
            console.error('Error getting episodes by serie:', error);
            return [];
        }
    },

    async getEpisodesByUids(uids: string[]): Promise<Map<string, EpisodeSerie>> {
        try {
            const map = new Map<string, EpisodeSerie>();
            if (uids.length === 0) return map;

            for (let i = 0; i < uids.length; i += 10) {
                const batch = uids.slice(i, i + 10);
                const q = query(
                    collection(db, EPISODES_SERIES_COLLECTION),
                    where('uid_episode', 'in', batch)
                );
                const snap = await getDocs(q);
                snap.docs.forEach(d => {
                    const e = d.data() as EpisodeSerie;
                    const episodeUid = e.uid_episode || d.id;
                    map.set(episodeUid, e);
                });
            }
            return map;
        } catch (error) {
            console.error('Error getting episodes by UIDs:', error);
            return new Map();
        }
    },

    async searchEpisodes(searchTerm: string): Promise<EpisodeSerie[]> {
        try {
            const episodesSnapshot = await getDocs(collection(db, EPISODES_SERIES_COLLECTION));
            const allEpisodes = episodesSnapshot.docs.map(doc => doc.data() as EpisodeSerie);

            return allEpisodes.filter(episode =>
                episode.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                episode.original_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                episode.overview.toLowerCase().includes(searchTerm.toLowerCase()) ||
                episode.overviewFr.toLowerCase().includes(searchTerm.toLowerCase()) ||
                episode.search_keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        } catch (error) {
            console.error('Error searching episodes:', error);
            return [];
        }
    },

    async updateEpisodeById(id: string, updates: Partial<EpisodeSerie>): Promise<void> {
        try {
            const episodeRef = doc(db, EPISODES_SERIES_COLLECTION, id);
            await updateDoc(episodeRef, {
                ...updates,
                updatedAt: new Date().toISOString()
            } as any);
        } catch (error) {
            console.error('Error updating episode:', error);
            throw error;
        }
    },

    async updateEpisodeByUid(uid_episode: string, updates: Partial<EpisodeSerie>): Promise<void> {
        try {
            const q = query(
                collection(db, EPISODES_SERIES_COLLECTION),
                where('uid_episode', '==', uid_episode),
                limit(1)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                throw new Error(`Épisode avec UID ${uid_episode} non trouvé`);
            }

            const episodeRef = doc(db, EPISODES_SERIES_COLLECTION, snapshot.docs[0].id);
            await updateDoc(episodeRef, {
                ...updates,
                updatedAt: new Date().toISOString()
            } as any);
        } catch (error) {
            console.error('Error updating episode by UID:', error);
            throw error;
        }
    },

    async addEpisodeToSeason(uid_episode: string, targetSeasonUid: string): Promise<void> {
        try {
            const episode = await this.getEpisodeByUid(uid_episode);
            if (!episode) {
                throw new Error(`Épisode avec UID ${uid_episode} non trouvé`);
            }

            if (episode.uid_season === targetSeasonUid) {
                throw new Error('L\'épisode est déjà dans cette saison');
            }

            if (episode.other_seasons && episode.other_seasons[targetSeasonUid]) {
                throw new Error('L\'épisode est déjà assigné à cette saison');
            }

            const targetSeasonEpisodes = await this.getEpisodesBySeason(targetSeasonUid);
            const maxEpisodeNumber = Math.max(...targetSeasonEpisodes.map(ep => {
                if (ep.uid_season === targetSeasonUid) {
                    return ep.episode_numero;
                } else if (ep.other_seasons && ep.other_seasons[targetSeasonUid]) {
                    return ep.other_seasons[targetSeasonUid];
                }
                return 0;
            }), 0);

            const newEpisodeNumber = maxEpisodeNumber + 1;

            const currentOtherSeasons = episode.other_seasons || {};
            const updatedOtherSeasons = {
                ...currentOtherSeasons,
                [targetSeasonUid]: newEpisodeNumber
            };

            await this.updateEpisodeByUid(uid_episode, {
                other_seasons: updatedOtherSeasons
            });
        } catch (error) {
            console.error('Error adding episode to season:', error);
            throw error;
        }
    },

    async removeEpisodeFromSeason(uid_episode: string, seasonUid: string): Promise<void> {
        try {
            const episode = await this.getEpisodeByUid(uid_episode);
            if (!episode) {
                throw new Error(`Épisode avec UID ${uid_episode} non trouvé`);
            }

            if (!episode.other_seasons || !episode.other_seasons[seasonUid]) {
                throw new Error('L\'épisode n\'est pas assigné à cette saison via other_seasons');
            }

            const updatedOtherSeasons = { ...episode.other_seasons };
            delete updatedOtherSeasons[seasonUid];

            await this.updateEpisodeByUid(uid_episode, {
                other_seasons: Object.keys(updatedOtherSeasons).length > 0 ? updatedOtherSeasons : null
            });
        } catch (error) {
            console.error('Error removing episode from season:', error);
            throw error;
        }
    },

    getEpisodeNumberForSeason(episode: EpisodeSerie, seasonUid: string): number {
        if (episode.uid_season === seasonUid) {
            return episode.episode_numero;
        }
        if (episode.other_seasons && episode.other_seasons[seasonUid]) {
            return episode.other_seasons[seasonUid];
        }
        return 0;
    },

    getEpisodeSeasons(episode: EpisodeSerie): string[] {
        const seasons = [episode.uid_season];
        if (episode.other_seasons) {
            seasons.push(...Object.keys(episode.other_seasons));
        }
        return seasons;
    },
};
