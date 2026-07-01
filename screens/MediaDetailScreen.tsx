// screens/MediaDetailScreen.tsx



import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MediaContent, MediaType, Episode } from '../types';

import { PlayIcon, PlusIcon, ArrowLeftIcon, HomeIcon, ChevronDownIcon, LikeIcon, CommentIcon, CheckIcon, ShareIcon, PencilIcon, EllipsisVerticalIcon, XMarkIcon, InfoIcon } from '../components/icons';

import { useAppContext } from '../context/AppContext';

import { serieService, Serie, seasonSerieService, SeasonSerie, episodeSerieService, EpisodeSerie } from '../lib/db';

import { Movie, movieService, likeService, commentService, Comment as FirestoreComment } from '../lib/db';

import { toast } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

import SuggestTitleModal from '../components/SuggestTitleModal';



interface MediaDetailScreenProps {

    item: MediaContent;

    onBack: () => void;

    onPlay: (item: MediaContent, episode?: Episode | EpisodeSerie) => void;

    playingItem?: { media: MediaContent; episode?: Episode | EpisodeSerie } | null;

    onSelectMedia: (item: MediaContent) => void;

    initialSeasonUid?: string;

}



const EpisodeListItem = React.memo<{ 
    episode: Episode | EpisodeSerie, 
    onClick: () => void, 
    isPlaying: boolean,
    currentSeasonUid?: string,
    currentSerieTitle?: string,
    onShare?: (episode: Episode | EpisodeSerie) => void,
    isBookmarked?: boolean,
    onBookmark?: () => void,
}>(({ episode, onClick, isPlaying, currentSeasonUid, currentSerieTitle, onShare, isBookmarked, onBookmark }) => {

    const { t } = useAppContext();
    const isEpisodeSerie = 'uid_episode' in episode;

    const episodeNumber = isEpisodeSerie && currentSeasonUid && episode.other_seasons && episode.other_seasons[currentSeasonUid]
        ? episode.other_seasons[currentSeasonUid]
        : (isEpisodeSerie ? episode.episode_numero : episode.episodeNumber);

    const episodeTitle = isEpisodeSerie ? episode.title : episode.title;

    const episodeDuration = isEpisodeSerie ? formatSeconds(episode.runtime) : episode.duration;

    const thumbnailUrl = isEpisodeSerie ? episode.picture_path : episode.thumbnailUrl;

    const isFromOtherSeries = isEpisodeSerie && 
        currentSeasonUid && 
        episode.other_seasons && 
        episode.other_seasons[currentSeasonUid] &&
        episode.uid_season !== currentSeasonUid;

    const [menuOpen, setMenuOpen] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`group flex gap-3 md:gap-4 p-2 rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.04] ${isPlaying ? 'ring-1 ring-amber-500' : ''}`}>
            <div onClick={onClick} className="flex-1 flex gap-3 md:gap-4 min-w-0 cursor-pointer">
                <div className="relative w-32 sm:w-36 md:w-44 shrink-0 aspect-video bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden self-start">
                    <img src={thumbnailUrl} alt={episodeTitle} className="w-full h-full object-cover" loading="lazy" />
                    {!isPlaying && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <PlayIcon className="w-8 h-8 text-white/0 group-hover:text-white/90 transition-all" />
                        </div>
                    )}
                    {isPlaying && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-gray-900 text-xs font-bold rounded-md">
                            {t('currentlyPlaying')}
                        </div>
                    )}
                    {isEpisodeSerie && episode.runtime > 0 && (
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-xs font-medium rounded">
                            {formatSeconds(episode.runtime)}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0 space-y-1 py-0.5">
                    <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">{t('episodeLabel', { number: String(episodeNumber) })}</span>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm md:text-base leading-tight line-clamp-2">
                        {episodeTitle}
                    </h4>
                    {isFromOtherSeries && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full font-medium">
                            {t('otherProduction')}
                        </span>
                    )}
                </div>
            </div>

            <div ref={menuRef} className="relative self-start pt-1 shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Episode actions"
                >
                    <EllipsisVerticalIcon className="w-5 h-5" />
                </button>

                {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 py-1 overflow-hidden">
                        <button
                            onClick={() => { setShowDetails(true); setMenuOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                            <InfoIcon className="w-4 h-4" />
                            <span>{t('details')}</span>
                        </button>
                        <button
                            onClick={() => { onBookmark?.(); setMenuOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                            <svg className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                            <span>{isBookmarked ? t('addedToList') : t('myList')}</span>
                        </button>
                        <button
                            onClick={() => { setMenuOpen(false); onShare?.(episode); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                            <ShareIcon className="w-4 h-4" />
                            <span>{t('share')}</span>
                        </button>
                    </div>
                )}
            </div>

            {showDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowDetails(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{episodeTitle}</h3>
                            <button onClick={() => setShowDetails(false)} className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <p><span className="font-medium text-gray-900 dark:text-white">{t('episode')}:</span> {t('episodeLabel', { number: String(episodeNumber) })}</p>
                            <p><span className="font-medium text-gray-900 dark:text-white">Duration:</span> {episodeDuration}</p>
                            {isEpisodeSerie && (episode as EpisodeSerie).overview && (
                                <div>
                                    <span className="font-medium text-gray-900 dark:text-white">{t('description')}:</span>
                                    <p className="mt-1 text-gray-600 dark:text-gray-400 leading-relaxed">{(episode as EpisodeSerie).overview}</p>
                                </div>
                            )}
                            {isEpisodeSerie && (episode as EpisodeSerie).views !== undefined && (
                                <p><span className="font-medium text-gray-900 dark:text-white">{t('views')}:</span> {(episode as EpisodeSerie).views?.toLocaleString()}</p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { onBookmark?.(); }}
                                className={`flex-1 flex items-center justify-center gap-2 font-bold py-2.5 px-4 rounded-xl transition-colors text-sm border ${
                                    isBookmarked
                                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                <svg className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                <span>{isBookmarked ? t('addedToList') : t('myList')}</span>
                            </button>
                            <button
                                onClick={() => { setShowDetails(false); onShare?.(episode); }}
                                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold py-2.5 px-4 rounded-xl transition-colors text-sm"
                            >
                                <ShareIcon className="w-4 h-4" />
                                <span>{t('share')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});



const formatStat = (num: number | undefined): string => {

    if (num === undefined) return '0';

    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';

    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';

    return num.toString();

};

const formatSeconds = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
};





const MediaDetailScreen: React.FC<MediaDetailScreenProps> = ({ item, onBack, onPlay, playingItem, onSelectMedia, initialSeasonUid }) => {

    const { t, bookmarkedIds, toggleBookmark, userProfile } = useAppContext();
    const navigate = useNavigate();

    const { title, imageUrl, author, description, theme, languages, seasons, type } = item;

    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const [firestoreSeasons, setFirestoreSeasons] = useState<SeasonSerie[]>([]);
    const [seasonEpisodes, setSeasonEpisodes] = useState<{ [key: string]: EpisodeSerie[] }>({});
    const [selectedSeasonUid, setSelectedSeasonUid] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);

    const [movieData, setMovieData] = useState<Movie | null>(null);

    const [likeCount, setLikeCount] = useState(item.likes || 0);

    const [hasLiked, setHasLiked] = useState(false);

    const [comments, setComments] = useState<FirestoreComment[]>([]);

    const [isLoadingLikes, setIsLoadingLikes] = useState(false);

    const [isLoadingComments, setIsLoadingComments] = useState(false);

    const [isSharing, setIsSharing] = useState(false);

    const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);

    const [showSuggestModal, setShowSuggestModal] = useState(false);

    const [bookmarkedEpisodeIds, setBookmarkedEpisodeIds] = useState<string[]>([]);

    const [activeTab, setActiveTab] = useState<'episodes' | 'about'>('episodes');

    const descriptionThreshold = 150;

    const isLongDescription = description && description.length > descriptionThreshold;

    const isBookmarked = bookmarkedIds.includes(item.id);

    // Charger les données depuis Firestore si c'est une série

    useEffect(() => {

        loadMovieData();

        loadLikesAndComments();

    }, [item.id]);



    const loadLikesAndComments = async () => {

        if (!userProfile) return;



        try {

            setIsLoadingLikes(true);

            setIsLoadingComments(true);



            // Récupérer les likes

            const itemUid = movieData?.uid || item.id;

            const [count, userLiked] = await Promise.all([

                likeService.getLikeCount(itemUid),

                likeService.hasUserLiked(itemUid, userProfile.email || '')

            ]);



            setLikeCount(count);

            setHasLiked(userLiked);



            // Récupérer les commentaires

            const fetchedComments = await commentService.getComments(itemUid);

            // Map Firestore comments to the expected format if needed

            const mappedComments = fetchedComments.map(comment => ({

                ...comment,

                // Add any necessary transformations here

            }));

            setComments(mappedComments);

        } finally {

            setIsLoadingLikes(false);

            setIsLoadingComments(false);

        }

    };



    const loadMovieData = async () => {

        if (type === MediaType.Movie && item.id) {

            try {

                setIsLoading(true);

                const movie = await movieService.getMovieById(item.id);

                setMovieData(movie);

            } catch (error) {

                console.error('Error loading movie data:', error);

            } finally {

                setIsLoading(false);

            }

        }

    };



    useEffect(() => {

        if ((type === MediaType.Series || type === MediaType.Podcast) && item.id) {

            loadSeasonsAndEpisodes();

        }

    }, [item.id, type]);



    const loadSeasonsAndEpisodes = async () => {
        setIsLoading(true);
        try {
            const serie = await serieService.getSerieByUid(item.id);
            if (serie) {
                const userUid = userProfile?.uid;
                const seasons = await seasonSerieService.getSeasonsBySerie(serie.uid_serie, userUid);
                setFirestoreSeasons(seasons);

                if (seasons.length > 0) {
                    setSelectedSeasonUid(initialSeasonUid || seasons[0].uid_season);
                }
            }
        } catch (error) {
            console.error('Error loading seasons and episodes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!selectedSeasonUid) return;
        loadEpisodesForSeason(selectedSeasonUid);
    }, [selectedSeasonUid]);

    const loadEpisodesForSeason = async (seasonUid: string) => {
        setIsLoadingEpisodes(true);
        try {
            const episodes = await episodeSerieService.getEpisodesBySeason(seasonUid);
            setSeasonEpisodes(prev => ({ ...prev, [seasonUid]: episodes }));
        } catch (error) {
            console.error('Error loading episodes:', error);
        } finally {
            setIsLoadingEpisodes(false);
        }
    };



    // Find the season of the currently playing episode to initialize state
    const playingEpisodeSeasonNumber = useMemo(() => {
        if (playingItem?.media.id === item.id && playingItem.episode) {
            const ep = playingItem.episode;
            if ('uid_episode' in ep) {
                const episodeSerie = ep as EpisodeSerie;
                for (const season of firestoreSeasons) {
                    const episodes = seasonEpisodes[season.uid_season] || [];
                    if (episodes.some(e => e.uid_episode === episodeSerie.uid_episode)) {
                        return season.season_number;
                    }
                }
            } else if (seasons) {
                const episode = ep as Episode;
                for (const season of seasons) {
                    if (season.episodes.some(e => e.episodeNumber === episode.episodeNumber && e.title === episode.title)) {
                        return season.seasonNumber;
                    }
                }
            }
        }
        return undefined;
    }, [playingItem, item.id, firestoreSeasons, seasonEpisodes, seasons]);

    const [expandedSeasons, setExpandedSeasons] = useState<number[]>([]);



    useEffect(() => {

        const initialExpandedSeason = playingEpisodeSeasonNumber ?? (firestoreSeasons.length > 0 ? firestoreSeasons[0].season_number : (seasons ? seasons[0].seasonNumber : undefined));

        if (initialExpandedSeason && !expandedSeasons.includes(initialExpandedSeason)) {

            setExpandedSeasons([initialExpandedSeason]);

        }

    }, [playingEpisodeSeasonNumber, firestoreSeasons, seasons]);



    const toggleSeason = useCallback((seasonNumber: number) => {
        setExpandedSeasons(current =>
            current.includes(seasonNumber)
                ? current.filter(s => s !== seasonNumber)
                : [...current, seasonNumber]
        );
    }, []);

    const handlePlay = useCallback(() => {
        let episodeToPlay: Episode | EpisodeSerie | undefined;

        if (type === MediaType.Series || type === MediaType.Podcast) {
            // Prioriser les données Firestore
            if (firestoreSeasons.length > 0) {
                const firstSeason = firestoreSeasons[0];
                const episodes = seasonEpisodes[firstSeason.uid_season] || [];
                episodeToPlay = episodes[0]; // Premier épisode de la première saison
            } else if (seasons && seasons.length > 0) {
                episodeToPlay = seasons[0].episodes[0]; // Fallback vers les données mockées
            }
        }

        onPlay(item, episodeToPlay);
    }, [type, firestoreSeasons, seasonEpisodes, seasons, onPlay, item]);

    const handleLike = useCallback(async () => {
        if (!userProfile) {
            toast.error(t('mustBeLoggedIn'), {
                position: 'bottom-center',
                autoClose: 2000,
            });
            return;
        }

        try {
            setIsLoading(true);
            const itemUid = movieData?.uid || item.id;
            const itemTitle = movieData?.title || item.title;
            const isLiked = await likeService.toggleLike(itemUid, itemTitle, userProfile);

            setHasLiked(isLiked);
            setLikeCount(prev => isLiked ? prev + 1 : Math.max(0, prev - 1));

            toast.success(isLiked ? t('likeSuccess') : t('likeRemoved'), { position: 'bottom-center', autoClose: 2000 });
        } catch (error) {
            console.error('Error toggling like:', error);
            toast.error(t('likeError'), {
                position: 'bottom-center',
                autoClose: 2000,
            });
        } finally {
            setIsLoading(false);
        }
    }, [userProfile, movieData, item.id, item.title]);

    const handleShare = useCallback(async (shareType: 'series' | 'season' = 'series') => {

        if (isSharing) return;
        

        setIsSharing(true);
        

        try {

            // Déterminer le chemin en fonction du type de média et du type de partage

            let mediaPath = '';

            let shareText = '';

            if (type === MediaType.Movie) {

                mediaPath = `/documentary/${item.id}`;

                shareText = t('shareSeriesText', { title: item.title });

                if (item.description) {
                    shareText += ` - ${item.description.substring(0, 80)}...`;
                }

            } else if (type === MediaType.Series) {

                // Trouver la saison sélectionnée pour le partage de saison

                const selectedSeason = shareType === 'season' && selectedSeasonUid

                    ? firestoreSeasons.find(s => s.uid_season === selectedSeasonUid)

                    : null;

                if (shareType === 'season' && selectedSeason) {

                    mediaPath = `/production/${item.id}?season=${selectedSeasonUid}`;

                    shareText = t('shareSeasonText', { seasonTitle: selectedSeason.title_season || item.title });

                } else {

                    mediaPath = `/production/${item.id}`;

                    shareText = t('shareSeriesText', { title: item.title });

                }

            } else if (type === MediaType.Podcast) {

                mediaPath = `/podcast/${item.id}`;

                shareText = t('shareSeriesText', { title: item.title });

                if (item.description) {
                    shareText += ` - ${item.description.substring(0, 80)}...`;
                }

            } else {

                // Fallback générique si le type n'est pas reconnu

                mediaPath = `/media/${item.id}`;

                shareText = t('shareSeriesText', { title: item.title });

                if (item.description) {
                    shareText += ` - ${item.description.substring(0, 80)}...`;
                }

            }

            const shareUrl = `${window.location.origin}${mediaPath}`;

            const seasonNumber = firestoreSeasons.find(s => s.uid_season === selectedSeasonUid)?.season_number;

            const shareData = {
                title: shareType === 'season' && type === MediaType.Series && seasonNumber !== undefined
                    ? t('shareSeasonTitle', { number: String(seasonNumber), title: item.title })
                    : item.title,
                text: shareText,
                url: shareUrl,
            };

            // Vérifier si l'API Web Share est disponible (principalement sur mobile)

            if (navigator.share) {

                await navigator.share(shareData);

            } else {

                // Fallback pour les navigateurs qui ne supportent pas l'API Web Share

                await navigator.clipboard.writeText(shareUrl);

                toast.success(t('linkCopied'), {

                    position: 'bottom-center',

                    autoClose: 2000,

                });

            }

        } catch (error) {

            if (error instanceof Error && error.name !== 'AbortError') {

                console.error('Erreur lors du partage:', error);

                toast.error(t('shareError'), {

                    position: 'bottom-center',

                    autoClose: 2000,

                });

            }

        } finally {

            setIsSharing(false);

        }

    }, [isSharing, type, item, selectedSeasonUid, firestoreSeasons]);

    const handleShareEpisode = useCallback(async (episode: Episode | EpisodeSerie) => {
        const episodeId = 'uid_episode' in episode ? episode.uid_episode : String(episode.episodeNumber);
        const episodeTitle = episode.title;
        const shareUrl = `${window.location.origin}/watch/${episodeId}`;

        const shareData = {
            title: episodeTitle,
            text: t('shareSeriesText', { title: episodeTitle }),
            url: shareUrl,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareUrl);
                toast.success(t('linkCopied'), {
                    position: 'bottom-center',
                    autoClose: 2000,
                });
            }
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                console.error('Erreur lors du partage:', error);
                toast.error(t('shareError'), {
                    position: 'bottom-center',
                    autoClose: 2000,
                });
            }
        }
    }, [t]);

    const handleToggleEpisodeBookmark = useCallback((episode: Episode | EpisodeSerie) => {
        const episodeId = 'uid_episode' in episode ? episode.uid_episode : String(episode.episodeNumber);
        setBookmarkedEpisodeIds(prev =>
            prev.includes(episodeId)
                ? prev.filter(id => id !== episodeId)
                : [...prev, episodeId]
        );
    }, []);

    return (

        <div className="animate-fadeIn pb-8 md:pb-12 bg-white dark:bg-[#121212] min-h-screen relative">

            <div className="relative w-full aspect-[3/1] sm:aspect-[4/1] md:aspect-[5/1] lg:aspect-[6/1] max-h-[180px] sm:max-h-[220px] md:max-h-[260px] lg:max-h-[280px] overflow-hidden bg-gray-200 dark:bg-gray-800">

                <img src={imageUrl} alt="" className="absolute w-full h-full object-cover scale-110 blur-xl" />

                <div className="absolute inset-0 flex items-center justify-center z-[5] px-4">
                    <h1 className="text-white text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black drop-shadow-xl tracking-tight text-center leading-tight">
                        {title}
                    </h1>
                </div>

                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />

                <header className="absolute top-0 left-0 right-0 z-10">

                    <div className="flex items-center justify-between min-h-16 px-4 py-2">

                        <button

                            onClick={onBack}

                            className="p-2 rounded-full text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors"

                            aria-label={t('goBack')}

                        >

                            <ArrowLeftIcon className="w-6 h-6" />

                        </button>



                        <button

                            onClick={() => navigate('/home')}

                            className="p-2 rounded-full text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors"

                            aria-label={t('home')}

                        >

                            <HomeIcon className="w-6 h-6" />

                        </button>

                    </div>

                </header>

            </div>



            

            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-5 md:space-y-8 relative z-[1]">



                <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                    {item.duration && (
                        <span className="px-2.5 py-0.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium">
                            {item.duration}
                        </span>
                    )}
                    {languages && languages.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium">
                            {languages[0].toUpperCase()}
                        </span>
                    )}
                    {type && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-semibold">
                            {type === MediaType.Movie ? t('movie') : type === MediaType.Series ? t('series') : t('podcast')}
                        </span>
                    )}
                </div>





                {type === MediaType.Movie && !isLoadingLikes && (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="flex items-center gap-1.5">
                            <LikeIcon className={`w-4 h-4 ${hasLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`} />
                            <span className={hasLiked ? 'text-red-500 font-semibold' : 'text-gray-600 dark:text-gray-400'}>
                                {likeCount} {t('likes')}
                            </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CommentIcon className="w-4 h-4 text-sky-500" />
                            <span className="text-gray-600 dark:text-gray-400">
                                {comments.length} {t(comments.length !== 1 ? 'comments' : 'comment')}
                            </span>
                        </span>
                    </div>
                )}



                <div className="space-y-3">
                    <button
                        onClick={handlePlay}
                        data-tour="detail-play-btn"
                        className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold py-3 px-6 rounded-xl transition-colors text-sm sm:text-base shadow-lg"
                    >
                        <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span>{t('play')}</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                        {type === MediaType.Movie && (
                            <button
                                onClick={handleLike}
                                disabled={isLoading}
                                className={`flex items-center justify-center gap-1.5 font-semibold py-2 px-3 rounded-lg border transition-colors text-xs sm:text-sm ${
                                    hasLiked
                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                                <LikeIcon className={`w-4 h-4 ${hasLiked ? 'text-red-500' : ''}`} />
                                <span>{hasLiked ? t('liked') : t('like')}</span>
                                {likeCount > 0 && (
                                    <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">{likeCount}</span>
                                )}
                            </button>
                        )}

                        <button
                            onClick={() => toggleBookmark(item.id, item.title, item.description || '', item.imageUrl || '', item.type === MediaType.Series || item.type === MediaType.Podcast)}
                            data-tour="bookmark-btn"
                            className={`flex items-center justify-center gap-1.5 font-semibold py-2 px-3 rounded-lg border transition-colors text-xs sm:text-sm ${
                                isBookmarked
                                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                            {isBookmarked ? <CheckIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                            <span>{isBookmarked ? t('addedToList') : t('myList')}</span>
                        </button>

                        <button
                            onClick={() => handleShare(type === MediaType.Series ? 'series' : undefined)}
                            disabled={isSharing}
                            className="relative flex items-center justify-center gap-1.5 font-semibold py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                        >
                            <ShareIcon className="w-4 h-4" />
                            <span>{t('share')}</span>
                        </button>

                        <button
                            onClick={() => setShowSuggestModal(true)}
                            data-tour="suggest-title"
                            className="flex items-center justify-center gap-1.5 font-semibold py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs sm:text-sm"
                            title={t('suggest')}
                        >
                            <PencilIcon className="w-4 h-4" />
                            <span>{t('suggest')}</span>
                        </button>
                    </div>
                </div>



                {/* Tab Navigation - Series/Podcast only */}
                {(type === MediaType.Series || type === MediaType.Podcast) && (
                    <div className="flex border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setActiveTab('episodes')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'episodes'
                                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            {t('episodes')}
                        </button>
                        <button
                            onClick={() => setActiveTab('about')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'about'
                                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            {t('about')}
                        </button>
                    </div>
                )}

                {/* About Tab - Description + Languages */}
                {(type === MediaType.Movie || activeTab === 'about') && (
                    <>
                    <div className="space-y-2 md:space-y-3">

                        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{t('description')}</h2>

                    {description ? (

                        <>

                            <p className={`text-gray-700 dark:text-gray-300 leading-relaxed text-sm md:text-base transition-all duration-300 ${

                                isLongDescription && !isDescriptionExpanded ? 'line-clamp-4' : ''

                            }`}>

                                {description}

                            </p>

                            {isLongDescription && (

                                <button

                                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}

                                    className="text-amber-600 dark:text-amber-400 font-semibold text-sm md:text-base hover:text-amber-700 dark:hover:text-amber-300 transition-colors duration-200"

                                >

                                    {isDescriptionExpanded ? t('showLess') : t('readMore')}

                                </button>

                            )}

                        </>

                    ) : (

                        <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base italic">

                            {t('noDescription')}

                        </p>

                    )}

                </div>

                    </>
                )}

                {activeTab === 'episodes' && (type === MediaType.Series || type === MediaType.Podcast) && (

                    <div className="flex flex-col md:flex-row gap-6 md:gap-8">

                        {/* Left Column - Season pill + heading */}
                        <div className="md:w-[35%] md:min-w-[240px] shrink-0">
                            <div className="md:sticky md:top-24 space-y-4">

                                {firestoreSeasons.length > 0 && selectedSeasonUid && (() => {
                                    const selectedSeason = firestoreSeasons.find(s => s.uid_season === selectedSeasonUid);
                                    const episodes = seasonEpisodes[selectedSeasonUid];
                                    const episodeCount = selectedSeason?.nb_episodes ?? episodes?.length ?? 0;

                                    return (
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                                                onBlur={() => setTimeout(() => setIsSeasonDropdownOpen(false), 200)}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-900 dark:text-white text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <span>{t('season')} {selectedSeason?.season_number}</span>
                                                <span className="text-gray-500">|</span>
                                                <span className="text-gray-400 font-normal">{episodeCount} {t('episodes')}</span>
                                                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {isSeasonDropdownOpen && (
                                                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-xl z-10 border border-gray-200 dark:border-gray-700">
                                                    {firestoreSeasons.map(season => {
                                                        const seasonEpCount = season.nb_episodes ?? seasonEpisodes[season.uid_season]?.length ?? 0;
                                                        return (
                                                            <button
                                                                key={season.uid_season}
                                                                onClick={() => { setSelectedSeasonUid(season.uid_season); setIsSeasonDropdownOpen(false); }}
                                                                className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                                                                    season.uid_season === selectedSeasonUid
                                                                        ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium'
                                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                                }`}
                                                            >
                                                                {t('season')} {season.season_number}
                                                                {season.title_season ? ` - ${season.title_season}` : ''}
                                                                <span className="ml-2 text-gray-500 font-normal">({seasonEpCount})</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <button
                                    onClick={() => handleShare('season')}
                                    disabled={isSharing}
                                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                    </svg>
                                    <span>{t('shareSeason')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Right Column - Episode list */}
                        <div className="md:w-[65%] min-w-0 space-y-4">

                        {isLoading ? (

                            <div className="text-center py-8 md:py-12">

                                <div className="text-gray-500 dark:text-gray-400 text-sm md:text-base">{t('loading')}</div>

                            </div>

                        ) : (

                            <div className="space-y-2">

                                {/* Afficher les épisodes de la saison sélectionnée depuis Firestore */}

                                {firestoreSeasons.length > 0 && selectedSeasonUid ? (

                                    (() => {

                                        const selectedSeason = firestoreSeasons.find(s => s.uid_season === selectedSeasonUid);

                                        const episodes = seasonEpisodes[selectedSeasonUid];

                                        if (!selectedSeason) return null;

                                        return (

                                            <div className="space-y-1">

                                                {isLoadingEpisodes ? (

                                                    <div className="text-center py-8">

                                                        <div className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>

                                                        <div className="text-gray-500 dark:text-gray-400 text-sm mt-2">{t('loading')}</div>

                                                    </div>

                                                ) : episodes && episodes.length > 0 ? (

                                                    episodes.map(episode => {
                                                        const playingEpUid = playingItem?.episode && 'uid_episode' in playingItem.episode ? (playingItem.episode as EpisodeSerie).uid_episode : undefined;
                                                        const isPlaying = selectedSeason.season_number === playingEpisodeSeasonNumber && episode.uid_episode === playingEpUid;
                                                        const isEpBookmarked = bookmarkedEpisodeIds.includes(episode.uid_episode);

                                                        return <EpisodeListItem 
                                                            key={episode.uid_episode} 
                                                            episode={episode} 
                                                            onClick={() => onPlay(item, episode)} 
                                                            isPlaying={isPlaying} 
                                                            currentSeasonUid={selectedSeasonUid}
                                                            currentSerieTitle={title}
                                                            onShare={handleShareEpisode}
                                                            isBookmarked={isEpBookmarked}
                                                            onBookmark={() => handleToggleEpisodeBookmark(episode)}
                                                        />;

                                                    })

                                                ) : (

                                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">

                                                        {t('noEpisodes')}

                                                    </div>

                                                )}

                                            </div>
                                        );

                                    })()

                                ) : (

                                    /* Fallback vers les données mockées seulement si aucune donnée Firestore */

                                    seasons && seasons.length > 0 && (

                                        <div className="space-y-2">

                                            {seasons.map(season => {

                                                const isExpanded = expandedSeasons.includes(season.seasonNumber);

                                                return (

                                                    <div key={season.seasonNumber} className="bg-gray-100/50 dark:bg-black/40 rounded-lg overflow-hidden transition-all duration-300">

                                                        <button

                                                            onClick={() => toggleSeason(season.seasonNumber)}

                                                            className="w-full flex items-center justify-between p-4 text-left font-semibold hover:bg-gray-200/50 dark:hover:bg-gray-700/50"

                                                        >

                                                            <span className="text-lg">{t('season')} {season.seasonNumber}</span>

                                                            <ChevronDownIcon className={`w-6 h-6 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />

                                                        </button>

                                                        {isExpanded && (

                                                            <div className="px-2 pb-2 space-y-1 animate-fadeIn">

                                                                {season.episodes.map(episode => {
                                                                    const playingEpNum = playingItem?.episode && !('uid_episode' in playingItem.episode) ? (playingItem.episode as Episode).episodeNumber : undefined;
                                                                    const isPlaying = season.seasonNumber === playingEpisodeSeasonNumber && episode.episodeNumber === playingEpNum;

                                                                    const isEpBookmarked = bookmarkedEpisodeIds.includes(String(episode.episodeNumber));
                                                                    return <EpisodeListItem 
                                                                    key={episode.episodeNumber} 
                                                                    episode={episode} 
                                                                    onClick={() => onPlay(item, episode)} 
                                                                    isPlaying={isPlaying} 
                                                                    currentSeasonUid={undefined}
                                                                    currentSerieTitle={title}
                                                                    onShare={handleShareEpisode}
                                                                    isBookmarked={isEpBookmarked}
                                                                    onBookmark={() => handleToggleEpisodeBookmark(episode)}
                                                                />;

                                                                })}

                                                            </div>

                                                        )}

                                                    </div>

                                                );

                                            })}

                                        </div>

                                    )

                                )}

                            </div>

                        )}

                        </div>

                    </div>

                )}





                {(type === MediaType.Movie || activeTab === 'about') && (
                    <div>

                        <h2 className="text-lg md:text-xl font-bold mb-2 text-gray-900 dark:text-white">{t('languages')}</h2>

                        <div className="flex flex-wrap gap-2">

                            {languages && languages.map(lang => (

                                <span key={lang} className="px-3 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-medium">

                                    {lang}

                                </span>

                            ))}

                        </div>

                    </div>
                )}

                <SuggestTitleModal
                    isOpen={showSuggestModal}
                    onClose={() => setShowSuggestModal(false)}
                    mediaId={item.id}
                    mediaType={type === MediaType.Movie ? 'movie' : 'serie'}
                    currentTitle={title}
                />

            </div>

        </div>

    );

};



export default MediaDetailScreen;