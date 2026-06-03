// screens/EpisodePlayerScreen.tsx

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MediaContent } from '../types';
import { EpisodeSerie, episodeSerieService, seasonSerieService, serieService, likeService, viewService, getLastWatchedPosition, SeasonSerie } from '../lib/firestore';
import {
    PlayIcon, PauseIcon, ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon,
    LikeIcon, ShareIcon, PlusIcon,
    VolumeHighIcon, VolumeMuteIcon, PipIcon, FullscreenEnterIcon, FullscreenExitIcon,
    BackwardIcon, ForwardPlaybackIcon, CheckIcon
} from '../components/icons';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import AuthPrompt from '../components/AuthPrompt';
import PromotionPlayer from '../components/PromotionPlayer';
import { updateMetaTags, clearMetaTags } from '../lib/metaTags';
import { formatNumber, CommentSection } from '../components/CommentSection';
import { VideoPlayer } from '../components/VideoPlayer';
import { useMiniPlayer } from '../hooks/useMiniPlayer';

// --- Main Screen Component ---
interface EpisodePlayerScreenProps {
    item: MediaContent;
    episode: EpisodeSerie;
    onBack: () => void;
    onNavigateEpisode: (direction: 'next' | 'prev' | EpisodeSerie) => void;
    onReturnHome: () => void;
}

const EpisodePlayerScreen: React.FC<EpisodePlayerScreenProps> = ({ item, episode, onBack, onNavigateEpisode, onReturnHome }) => {
    const navigate = useNavigate();
    const { t, bookmarkedIds, toggleSeriesBookmark, userProfile, autoplay } = useAppContext();
    const [episodesInSeason, setEpisodesInSeason] = useState<EpisodeSerie[]>([]);
    const [currentSeason, setCurrentSeason] = useState<SeasonSerie | null>(null);
    const [serieUid, setSerieUid] = useState<string | null>(null);
    const [likeCount, setLikeCount] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const [authAction, setAuthAction] = useState('');
    const [videoIsPlaying, setVideoIsPlaying] = useState(false);
    // Sauvegarder l'état de la pub dans sessionStorage pour éviter de la relancer
    const getAdStateKey = () => `ad_shown_${episode.uid_episode}`;
    const wasAdShown = sessionStorage.getItem(getAdStateKey()) === 'true';
    const [showAd, setShowAd] = useState(!wasAdShown);
    const [initialPlaybackPosition, setInitialPlaybackPosition] = useState(0);
    const { isMini, sentinelRef, closeMiniPlayer } = useMiniPlayer({ enabled: !showAd });

    const handleAuthRequired = (action: string) => {
        setAuthAction(action);
        setShowAuthPrompt(true);
    };

    // Récupérer les informations de la saison
    useEffect(() => {
        const fetchSeasonInfo = async () => {
            try {
                const season = await seasonSerieService.getSeasonByUid(episode.uid_season);
                if (season) {
                    setCurrentSeason(season);
                    setSerieUid(season.uid_serie);
                }
            } catch (error) {
                console.error('Erreur lors de la récupération de la saison:', error);
            }
        };
        fetchSeasonInfo();
    }, [episode.uid_season]);

    useEffect(() => {
        const fetchEpisodes = async () => {
            try {
                const serie = await serieService.getSerieByUid(item.id);
                if (!serie) { 
                    setEpisodesInSeason([]);
                    return; 
                }
                setEpisodesInSeason(
                    await episodeSerieService.getEpisodesBySeason(episode.uid_season)
                );
            } catch (error) {
                console.error('Error fetching episodes list:', error);
                setEpisodesInSeason([]);
            }
        };
        fetchEpisodes();
    }, [item.id, episode.uid_season]);

    // Fetch like data
    useEffect(() => {
        const fetchLikeData = async () => {
            const itemUid = episode.uid_episode;
            try {
                const count = await likeService.getLikeCount(itemUid);
                setLikeCount(count);

                if (userProfile?.email) {
                    const liked = await likeService.hasUserLiked(itemUid, userProfile.email);
                    setHasLiked(liked);
                }
            } catch (error) {
                console.error('Error fetching like data:', error);
            }
        };

        fetchLikeData();
    }, [episode.uid_episode, userProfile]);

    // Mettre à jour le titre de la page avec le nom de l'épisode
    useEffect(() => {
        if (episode?.title) {
            document.title = `${episode.title}`;
        }
        
        // Restaurer le titre par défaut lors du démontage du composant
        return () => {
            document.title = 'CMFI Replay';
        };
    }, [episode]);

    // Charger la position de lecture précédente
    useEffect(() => {
        const loadPlaybackPosition = async () => {
            if (!userProfile?.uid || !episode?.uid_episode) return;
            
            try {
                const position = await getLastWatchedPosition(userProfile.uid, episode.uid_episode);
                if (position > 0) {
                    setInitialPlaybackPosition(position);
                }
            } catch (error) {
                console.error('Erreur lors du chargement de la position de lecture:', error);
            }
        };

        loadPlaybackPosition();
    }, [userProfile?.uid, episode?.uid_episode]);

    // Track view after 10 seconds of watching (only when video is playing)
    const watchTimeRef = useRef(0);
    const hasRecordedViewRef = useRef(false);

    useEffect(() => {
        if (!episode?.uid_episode || !userProfile?.uid) return;

        const viewTimer = setInterval(() => {
            if (videoIsPlaying && !hasRecordedViewRef.current) {
                watchTimeRef.current += 1;

                if (watchTimeRef.current >= 10) {
                    hasRecordedViewRef.current = true;
                    // Enregistrer la vue
                    viewService.recordView(episode.uid_episode, 'episode', userProfile.uid)
                        .catch((error) => {
                            console.error('Erreur lors de l\'enregistrement de la vue:', error);
                        });
                }
            }
        }, 1000);

        return () => {
            clearInterval(viewTimer);
        };
    }, [episode, userProfile, videoIsPlaying]);

    // Reset watch time when episode changes
    useEffect(() => {
        watchTimeRef.current = 0;
        hasRecordedViewRef.current = false;
    }, [episode?.uid_episode]);

    // Utiliser les données EpisodeSerie passées en prop
    const displayEpisode = episode;

    // Mettre à jour les métadonnées Open Graph pour le partage
    useEffect(() => {
        if (displayEpisode) {
            updateMetaTags({
                title: displayEpisode.title,
                description: displayEpisode.overview || displayEpisode.overviewFr || `Épisode ${displayEpisode.episode_numero} de ${displayEpisode.title_serie}`,
                image: displayEpisode.picture_path,
                url: window.location.href,
                type: 'video.episode'
            });
        }

        // Nettoyer les métadonnées lors du démontage
        return () => {
            clearMetaTags();
        };
    }, [displayEpisode]);

    const handleShare = async () => {
        if (!userProfile) {
            handleAuthRequired('partager cette vidéo');
            return;
        }

        const shareData = {
            title: displayEpisode.title,
            text: `Regardez "${displayEpisode.title}" sur CMFI Replay`,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback pour les navigateurs qui ne supportent pas l'API Web Share
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Lien copié dans le presse-papier !', {
                    position: 'bottom-center',
                    autoClose: 2000,
                    hideProgressBar: true,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    theme: 'colored',
                });
            }
        } catch (err) {
            console.error('Erreur lors du partage:', err);
            if (err.name !== 'AbortError') {
                toast.error('Erreur lors du partage', {
                    position: 'bottom-center',
                    autoClose: 2000,
                    hideProgressBar: true,
                });
            }
        }
    };

    const handleLike = async () => {
        if (!userProfile) {
            handleAuthRequired('liker cette vidéo');
            return;
        }

        const itemUid = episode.uid_episode;
        const itemTitle = episode.title;

        try {
            const isLiked = await likeService.toggleLike(itemUid, itemTitle, userProfile);
            setHasLiked(isLiked);
            setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
        } catch (error) {
            console.error('Error toggling like:', error);
            toast.error('Erreur lors du like', {
                position: 'bottom-center',
                autoClose: 2000,
            });
        }
    };

    const handleBookmark = () => {
        if (!userProfile) {
            handleAuthRequired('ajouter cette vidéo à votre liste');
            return;
        }
        toggleSeriesBookmark(
            item.id,
            episode.title,
            episode.overview || episode.overviewFr || '',
            episode.backdrop_path || episode.picture_path || '',
            episode.video_path_hd || episode.video_path_sd || '',
            episode.runtime_h_m || ''
        );
    };

    const isBookmarked = bookmarkedIds.includes(item.id);

    const currentIndex = useMemo(() => {
        if (!episode || episodesInSeason.length === 0) return -1;
        let idx = episodesInSeason.findIndex(e => e.uid_episode === episode.uid_episode);
        if (idx === -1) {
            idx = episodesInSeason.findIndex(e => e.episode_numero === episode.episode_numero && e.title === episode.title);
        }
        return idx;
    }, [episodesInSeason, episode]);

    const hasPrevEpisode = currentIndex > 0;
    const hasNextEpisode = currentIndex !== -1 && currentIndex < episodesInSeason.length - 1;

    const handleVideoEnded = () => {
        if (!userProfile) {
            handleAuthRequired('continuer à regarder et découvrir plus de contenu');
            return;
        }

        // Réinitialiser le flag pour permettre une nouvelle vue si l'utilisateur regarde la vidéo à nouveau
        watchTimeRef.current = 0;
        hasRecordedViewRef.current = false;

        if (autoplay && hasNextEpisode) {
            onNavigateEpisode('next');
        }
    };

    const [likeAnimation, setLikeAnimation] = useState(false);
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

    const handleLikeWithAnimation = async () => {
        setLikeAnimation(true);
        // Créer des particules
        const newParticles = Array.from({ length: 12 }, (_, i) => ({
            id: Date.now() + i,
            x: Math.random() * 100,
            y: Math.random() * 100
        }));
        setParticles(newParticles);

        // Appeler la fonction like originale
        await handleLike();

        // Nettoyer les particules après l'animation
        setTimeout(() => {
            setParticles([]);
            setLikeAnimation(false);
        }, 1000);
    };

    const LikeButton: React.FC<{ label: string, value?: string | number, onClick?: () => void, isActive?: boolean }> = ({ label, value, onClick, isActive }) => (
        <button
            onClick={handleLikeWithAnimation}
            className={`relative flex flex-col items-center space-y-1 transition-all duration-300 ${isActive
                ? 'text-red-500 dark:text-red-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400'
                }`}
        >
            <div className="relative">
                <div
                    className={`transition-all duration-300 ${likeAnimation ? 'scale-150' : 'scale-100'
                        }`}
                    style={{
                        filter: likeAnimation ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))' : 'none',
                        transform: likeAnimation ? 'scale(1.5) rotate(15deg)' : 'scale(1) rotate(0deg)'
                    }}
                >
                    <LikeIcon
                        className={`w-7 h-7 ${isActive ? 'fill-red-500 dark:fill-red-400' : ''}`}
                    />
                </div>
                {/* Particules animées */}
                {particles.map((particle, index) => {
                    const angle = (index / particles.length) * Math.PI * 2;
                    const distance = 40 + Math.random() * 30;
                    return (
                        <div
                            key={particle.id}
                            className="absolute pointer-events-none"
                            style={{
                                left: '50%',
                                top: '50%',
                                animation: `particleFloat 1s ease-out forwards`,
                                animationDelay: `${index * 0.05}s`,
                                '--random-x': Math.cos(angle),
                                '--random-y': Math.sin(angle),
                                '--distance': `${distance}px`
                            } as React.CSSProperties}
                        >
                            <div className="w-2 h-2 bg-red-500 rounded-full opacity-90 shadow-lg shadow-red-500/50" />
                        </div>
                    );
                })}
                {/* Effet de pulse quand actif */}
                {isActive && (
                    <div className="absolute inset-0 animate-ping">
                        <div className="w-7 h-7 bg-red-500 rounded-full opacity-20" />
                    </div>
                )}
            </div>
            <span className={`text-xs font-semibold transition-all duration-300 ${likeAnimation ? 'scale-110' : 'scale-100'
                }`}>
                {value ? formatNumber(Number(value)) : label}
            </span>
        </button>
    );

    const ActionButton: React.FC<{ Icon: React.FC<any>, label: string, value?: string | number, onClick?: () => void, isActive?: boolean }> = ({ Icon, label, value, onClick, isActive }) => (
        <button onClick={onClick} className={`flex flex-col items-center space-y-1 hover:text-amber-500 dark:hover:text-amber-400 ${isActive ? 'text-amber-500 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
            <Icon className="w-7 h-7" />
            <span className="text-xs font-semibold">{value ? formatNumber(Number(value)) : label}</span>
        </button>
    );

    // Créer des callbacks mémorisés pour la publicité
    const handleAdEnd = useCallback(() => {
        setShowAd(false);
        sessionStorage.setItem(getAdStateKey(), 'true');
    }, []);

    const handleAdSkip = useCallback(() => {
        setShowAd(false);
        sessionStorage.setItem(getAdStateKey(), 'true');
    }, []);

    const playerContent = (
        <>
            {showAd && (
                <PromotionPlayer
                    onPromotionEnd={handleAdEnd}
                    onSkip={handleAdSkip}
                />
            )}
            {!showAd && (
                <VideoPlayer
                    key={episode.uid_episode || episode.title}
                    src={episode.video_path_hd?.trim() ? episode.video_path_hd : episode.video_path_sd}
                    poster={episode.picture_path || item.imageUrl}
                    onUnavailable={onReturnHome}
                    onEnded={handleVideoEnded}
                    onPlayingStateChange={setVideoIsPlaying}
                    initialPosition={initialPlaybackPosition}
                    videoUid={episode.uid_episode}
                    isEpisode={true}
                    showAutoplayToggle={true}
                    hideControls={isMini}
                />
            )}
        </>
    );

    return (
        <div className="bg-white dark:bg-black min-h-screen animate-fadeIn">
            {/* Bouton de retour amélioré avec gradient */}
            <header className="absolute top-4 left-4 z-30">
                <button
                    onClick={onBack}
                    className="group p-3 rounded-full text-white bg-black/70 hover:bg-black/90 backdrop-blur-md transition-all duration-300 hover:scale-110 shadow-xl border border-white/10"
                    aria-label="Go back"
                >
                    <ArrowLeftIcon className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
                </button>
            </header>

            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-1 md:py-4 lg:py-8 pt-16 md:pt-20">

                {/* Conteneur principal avec grille pour la mise en page */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Colonne de gauche - Lecteur vidéo et métadonnées */}
                    <div className="lg:col-span-2 space-y-2 md:space-y-4">
                        {/* Titre de la saison avec lien vers la série */}
                        {currentSeason && serieUid && (
                            <div className="flex items-center gap-2 text-sm md:text-base">
                                <button
                                    onClick={() => navigate(`/serie/${serieUid}`)}
                                    className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold transition-colors duration-200 hover:underline"
                                >
                                    {item.title}
                                </button>
                                <span className="text-gray-500 dark:text-gray-400">•</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                    {t('season')} {currentSeason.season_number}
                                    {currentSeason.title_season && (
                                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                                            - {currentSeason.title_season}
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}
                        
                        <div>
                             <div ref={sentinelRef} className="h-px" aria-hidden="true" />
                             {isMini && <div className="w-full aspect-video" aria-hidden="true" />}
                             <div
                                 className={
                                     isMini
                                         ? 'fixed bottom-4 right-4 z-50 w-48 md:w-64 aspect-video rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/10 bg-black'
                                         : 'relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-2 ring-black/20 dark:ring-white/5'
                                 }
                                 style={isMini ? { position: 'fixed', bottom: 16, right: 16, zIndex: 50 } : undefined}
                             >
                                 {isMini && (
                                     <>
                                         <div
                                             onClick={closeMiniPlayer}
                                             className="absolute inset-0 z-40 cursor-pointer"
                                             aria-label="Tap to restore video to full view"
                                         />
                                         <button
                                             onClick={(e) => { e.stopPropagation(); closeMiniPlayer(); }}
                                             className="absolute top-2 right-2 z-50 w-7 h-7 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors shadow-lg backdrop-blur-sm border border-white/20"
                                             aria-label="Restore video to full view"
                                         >
                                             ✕
                                         </button>
                                     </>
                                 )}
                                 {playerContent}
                             </div>
                         </div>

                        <div className="space-y-2 md:space-y-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
                                    {displayEpisode.title}
                                </h1>
                                <div className="flex items-center space-x-2 md:space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1 md:mt-0">
                                    <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full font-semibold">
                                        {item.author || item.theme}
                                    </span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                    <span className="font-medium">
                                        {formatNumber(displayEpisode.views || 0)} {t('views')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-around py-2 md:py-4 px-2 bg-white/50 dark:bg-gray-900/50 rounded-2xl backdrop-blur-sm border border-gray-200/50 dark:border-black/50 shadow-lg">
                                <LikeButton
                                    label={hasLiked ? (t('likeVideo') + ' ✓') : t('likeVideo')}
                                    value={likeCount}
                                    onClick={handleLike}
                                    isActive={hasLiked}
                                />
                                <ActionButton
                                    Icon={isBookmarked ? CheckIcon : PlusIcon}
                                    label={isBookmarked ? t('addedToList') : t('myList')}
                                    onClick={handleBookmark}
                                    isActive={isBookmarked}
                                />
                                <ActionButton
                                    Icon={ShareIcon}
                                    label={t('share')}
                                    onClick={handleShare}
                                />
                            </div>

                            <div className="flex items-center justify-between gap-2 md:gap-4">
                                <button
                                    onClick={() => onNavigateEpisode('prev')}
                                    disabled={!hasPrevEpisode}
                                    className="group flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-gray-200 to-gray-300 dark:from-black dark:to-gray-700 hover:from-amber-500 hover:to-orange-500 text-gray-900 dark:text-white hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-gray-200 disabled:hover:to-gray-300 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100 font-semibold"
                                >
                                    <ChevronLeftIcon className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                                    <span>{t('prevEpisode')}</span>
                                </button>
                                <button
                                    onClick={() => onNavigateEpisode('next')}
                                    disabled={!hasNextEpisode}
                                    className="group flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-amber-500 disabled:hover:to-orange-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100 font-semibold"
                                >
                                    <span>{t('nextEpisode')}</span>
                                    <ChevronRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Colonne de droite - Section des commentaires améliorée */}
                    <div className="lg:col-span-1">
                        <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-hidden flex flex-col">
                            <div className="lg:flex-1 lg:overflow-y-auto lg:pb-4 pr-2 -mr-2 scrollbar-thin scrollbar-thumb-amber-500 scrollbar-track-gray-200 dark:scrollbar-track-black">
                                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border border-gray-200/50 dark:border-black/50 shadow-xl">
                                    <CommentSection
                                        itemUid={episode.uid_episode}
                                        onAuthRequired={handleAuthRequired}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section des autres épisodes de la saison */}
                {episodesInSeason.length > 0 && (
                    <div className="mt-6 md:mt-4 lg:mt-6 pt-6 md:pt-0 border-t border-gray-200 dark:border-gray-700 md:border-t-0 space-y-2 md:space-y-4">
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                            {t('otherEpisodes') || 'Autres épisodes de la saison'}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {episodesInSeason
                                .filter(e => e.uid_episode !== episode.uid_episode) // Exclure l'épisode actuel
                                .sort((a, b) => {
                                    // Use episodeSerieService.getEpisodeNumberForSeason to get correct episode number for current season
                                    const episodeANumber = episodeSerieService.getEpisodeNumberForSeason(a, currentSeason?.uid_season || '');
                                    const episodeBNumber = episodeSerieService.getEpisodeNumberForSeason(b, currentSeason?.uid_season || '');
                                    return episodeANumber - episodeBNumber;
                                }) // Trier par numéro d'épisode
                                .map(otherEpisode => (
                                    <div
                                        key={otherEpisode.uid_episode}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('🔍 Clic sur épisode:', otherEpisode.uid_episode, otherEpisode.title);
                                            if (otherEpisode.uid_episode) {
                                                onNavigateEpisode(otherEpisode);
                                            } else {
                                                console.error('Épisode sans uid_episode:', otherEpisode);
                                            }
                                        }}
                                        className="group relative bg-gray-100/50 dark:bg-black/40 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl"
                                    >
                                        <div className="relative aspect-video bg-gray-300 dark:bg-gray-700">
                                            {otherEpisode.picture_path ? (
                                                <img 
                                                    src={otherEpisode.picture_path} 
                                                    alt={otherEpisode.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <PlayIcon className="w-12 h-12 text-gray-400 dark:text-gray-600" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <PlayIcon className="w-12 h-12 text-white/80 group-hover:text-white group-hover:scale-110 transition-transform" />
                                            </div>
                                            {otherEpisode.runtime_h_m && (
                                                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                                    {otherEpisode.runtime_h_m}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base truncate">
                                                {episodeSerieService.getEpisodeNumberForSeason(otherEpisode, currentSeason?.uid_season || '')}. {otherEpisode.title}
                                            </h4>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {showAuthPrompt && (
                    <AuthPrompt
                        action={authAction}
                        onClose={() => setShowAuthPrompt(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default EpisodePlayerScreen;
