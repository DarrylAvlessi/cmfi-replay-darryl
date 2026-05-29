// screens/MediaDetailScreen.tsx



import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { MediaContent, MediaType, Episode } from '../types';

import HeaderMenu from '../components/HeaderMenu';

import { PlayIcon, PlusIcon, ArrowLeftIcon, ChevronDownIcon, VolumeHighIcon, LikeIcon, CommentIcon, CheckIcon, ShareIcon } from '../components/icons';

import { useAppContext } from '../context/AppContext';

import { serieService, Serie, seasonSerieService, SeasonSerie, episodeSerieService, EpisodeSerie } from '../lib/firestore';

import { Movie, movieService, likeService, commentService, Comment as FirestoreComment } from '../lib/firestore';

import { toast } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';



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
    currentSerieTitle?: string
}>(({ episode, onClick, isPlaying, currentSeasonUid, currentSerieTitle }) => {
    const playingClasses = isPlaying ? 'bg-amber-100 dark:bg-amber-900/40' : 'hover:bg-gray-100/50 dark:hover:bg-black/50';



    // Vérifier si c'est un EpisodeSerie ou un Episode

    const isEpisodeSerie = 'uid_episode' in episode;

    // Utiliser le numéro d'épisode approprié selon la saison actuelle
    const episodeNumber = isEpisodeSerie && currentSeasonUid && episode.other_seasons && episode.other_seasons[currentSeasonUid]
        ? episode.other_seasons[currentSeasonUid]
        : (isEpisodeSerie ? episode.episode_numero : episode.episodeNumber);

    const episodeTitle = isEpisodeSerie ? episode.title : episode.title;

    const episodeDuration = isEpisodeSerie ? episode.runtime_h_m : episode.duration;

    const thumbnailUrl = isEpisodeSerie ? episode.picture_path : episode.thumbnailUrl;

    // Check if episode comes from another series via other_seasons
    const isFromOtherSeries = isEpisodeSerie && 
        currentSeasonUid && 
        episode.other_seasons && 
        episode.other_seasons[currentSeasonUid] &&
        episode.uid_season !== currentSeasonUid;



    return (

        <div onClick={onClick} className={`flex items-start space-x-3 sm:space-x-4 p-3 sm:p-2 rounded-lg ${playingClasses} cursor-pointer transition-all duration-200 relative min-h-[80px] sm:min-h-[72px]`}>

            {isPlaying && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-lg"></div>}

            <div className="relative w-16 h-12 sm:w-20 sm:h-14 md:w-24 md:h-16 lg:w-28 lg:h-18 bg-gray-300 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 mt-1">

                <img src={thumbnailUrl} alt={episodeTitle} className="w-full h-full object-cover" loading="lazy" />

                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">

                    {isPlaying ? (

                        <VolumeHighIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-white/90" />

                    ) : (

                        <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-white/80" />

                    )}

                </div>

            </div>

            <div className="flex-1 min-w-0 py-1">

                <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-semibold text-xs sm:text-sm ${isPlaying ? 'text-amber-800 dark:text-amber-300' : 'text-gray-900 dark:text-white'} leading-snug line-clamp-2 sm:line-clamp-1`}>
                        {episodeNumber}. {episodeTitle}
                    </h4>
                    {isFromOtherSeries && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full font-medium">
                            Autre production
                        </span>
                    )}
                </div>

                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">{episodeDuration}</p>

            </div>

        </div>

    );

});



const formatStat = (num: number | undefined): string => {

    if (num === undefined) return '0';

    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';

    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';

    return num.toString();

};





const MediaDetailScreen: React.FC<MediaDetailScreenProps> = ({ item, onBack, onPlay, playingItem, onSelectMedia, initialSeasonUid }) => {

    const { t, bookmarkedIds, toggleBookmark, userProfile } = useAppContext();

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

    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);

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
            // Vérifier si c'est un EpisodeSerie ou un Episode
            const isEpisodeSerie = 'uid_episode' in playingItem.episode;
            if (isEpisodeSerie) {
                // Chercher la saison par uid_episode
                for (const season of firestoreSeasons) {
                    const episodes = seasonEpisodes[season.uid_season] || [];
                    if (episodes.some(e => e.uid_episode === playingItem.episode?.uid_episode)) {
                        return season.season_number;
                    }
                }
            } else if (seasons) {
                // Logique existante pour les épisodes mockés
                for (const season of seasons) {
                    if (season.episodes.some(e => e.episodeNumber === playingItem.episode?.episodeNumber && e.title === playingItem.episode?.title)) {
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
            toast.error('Vous devez être connecté pour aimer', {
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

            const message = isLiked ? 'Contenu aimé avec succès!' : 'Like retiré';
            toast.success(message, { position: 'bottom-center', autoClose: 2000 });
        } catch (error) {
            console.error('Error toggling like:', error);
            toast.error('Erreur lors du like', {
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

                shareText = `Retrouvez "${item.title}" sur le CMFI Replay${item.description ? ` - ${item.description.substring(0, 80)}...` : ''}`;

            } else if (type === MediaType.Series) {

                // Trouver la saison sélectionnée pour le partage de saison

                const selectedSeason = shareType === 'season' && selectedSeasonUid

                    ? firestoreSeasons.find(s => s.uid_season === selectedSeasonUid)

                    : null;

                if (shareType === 'season' && selectedSeason) {

                    mediaPath = `/production/${item.id}?season=${selectedSeasonUid}`;

                    shareText = `Retrouvez ${selectedSeason.title_season ? `"${selectedSeason.title_season}"` : `"${item.title}"`} sur CMFI Replay`;

                } else {

                    mediaPath = `/production/${item.id}`;

                    shareText = `Retrouvez "${item.title}" sur le CMFI Replay`;

                }

            } else if (type === MediaType.Podcast) {

                mediaPath = `/podcast/${item.id}`;

                shareText = `Retrouvez "${item.title}" sur le CMFI Replay${item.description ? ` - ${item.description.substring(0, 80)}...` : ''}`;

            } else {

                // Fallback générique si le type n'est pas reconnu

                mediaPath = `/media/${item.id}`;

                shareText = `Retrouvez "${item.title}" sur le CMFI Replay${item.description ? ` - ${item.description.substring(0, 80)}...` : ''}`;

            }

            const shareUrl = `${window.location.origin}${mediaPath}`;

            const shareData = {
                title: shareType === 'season' && type === MediaType.Series
                    ? `Saison ${firestoreSeasons.find(s => s.uid_season === selectedSeasonUid)?.season_number} - ${item.title}`
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

                toast.success('Lien copié dans le presse-papier', {

                    position: 'bottom-center',

                    autoClose: 2000,

                });

            }

        } catch (error) {

            if (error instanceof Error && error.name !== 'AbortError') {

                console.error('Erreur lors du partage:', error);

                toast.error('Erreur lors du partage', {

                    position: 'bottom-center',

                    autoClose: 2000,

                });

            }

        } finally {

            setIsSharing(false);

        }

    }, [isSharing, type, item, selectedSeasonUid, firestoreSeasons]);



    return (

        <div className="animate-fadeIn pb-8 md:pb-12 bg-white dark:bg-black min-h-screen">

            <div className="relative h-[50vh] md:h-[60vh] lg:h-[65vh]">

                <img src={imageUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />

                {/* Gradient overlay amélioré pour meilleure lisibilité */}

                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-black dark:via-black/80" />

                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/40 dark:to-black/40" />

                <header className="absolute top-0 left-0 right-0 z-10">

                    <div className="flex items-center justify-between h-16 px-4">

                        <button

                            onClick={onBack}

                            className="p-2 rounded-full text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors"

                            aria-label="Go back"

                        >

                            <ArrowLeftIcon className="w-6 h-6" />

                        </button>

                        <div className="p-1 rounded-full bg-black/40 backdrop-blur-sm">

                            <HeaderMenu variant="light" />

                        </div>

                    </div>

                </header>

            </div>



            <div className="p-3 sm:p-4 md:p-6 lg:p-8 -mt-20 sm:-mt-24 md:-mt-32 lg:-mt-40 relative z-10 space-y-4 md:space-y-6 max-w-7xl mx-auto">

                {/* Titre avec meilleure gestion du texte */}

                <div className="space-y-3 md:space-y-4">

                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white drop-shadow-lg leading-tight break-words">

                        {title}

                    </h1>



                    {/* Métadonnées mieux organisées */}

                    <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm md:text-base">

                        {item.duration && (

                            <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">

                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />

                                </svg>

                                {item.duration}

                            </span>

                        )}

                        {languages && languages.length > 0 && (

                            <span className="px-2.5 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs md:text-sm">

                                {languages[0].toUpperCase()}

                            </span>

                        )}

                        {type && (

                            <span className="px-2.5 py-1 rounded-md bg-gray-300 dark:bg-gray-600 text-black dark:text-gray-200 font-semibold text-xs md:text-sm">

                                {type === MediaType.Movie ? t('movie') : type === MediaType.Series ? t('series') : t('podcast')}

                            </span>

                        )}

                    </div>

                </div>





                {/* Stats et actions - Mieux organisés */}

                {type === MediaType.Movie && (

                    <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm md:text-base">

                        {isLoadingLikes ? (

                            <span className="text-gray-500 dark:text-gray-400">Chargement...</span>

                        ) : (

                            <>

                                <span className="flex items-center gap-2">

                                    <LikeIcon className={`w-5 h-5 ${hasLiked ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`} />

                                    <span className={hasLiked ? 'text-red-500 font-semibold' : 'text-gray-700 dark:text-gray-300'}>

                                        {likeCount} {t('likes')}

                                    </span>

                                </span>

                                <span className="flex items-center gap-2">

                                    <CommentIcon className="w-5 h-5 text-sky-500" />

                                    <span className="text-gray-700 dark:text-gray-300">

                                        {comments.length} {t(comments.length !== 1 ? 'comments' : 'comment')}

                                    </span>

                                </span>

                            </>

                        )}

                    </div>

                )}



                {/* Boutons d'action optimisés pour mobile */}

                <div className="w-full">

                    {/* Bouton Play - Toujours en pleine largeur */}

                    <div className="mb-3 sm:mb-4">

                        <button 

                            onClick={handlePlay} 

                            className="w-full flex items-center justify-center gap-2 bg-amber-500 text-gray-900 font-bold py-2.5 sm:py-3 md:py-3.5 px-4 sm:px-6 md:px-8 rounded-lg md:rounded-xl hover:bg-amber-400 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl text-sm sm:text-base"

                        >

                            <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />

                            <span>{t('play')}</span>

                        </button>

                    </div>

                    

                    {/* Boutons secondaires - Disposition améliorée */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        {/* Bouton Like pour les films - pleine largeur sur mobile */}
                        {type === MediaType.Movie && (
                            <button
                                onClick={handleLike}
                                className={`order-2 sm:order-1 flex items-center justify-center gap-2 font-bold py-3 px-4 sm:px-6 rounded-xl backdrop-blur-sm transition-all duration-300 hover:scale-105 text-sm sm:text-base ${
                                    hasLiked
                                        ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 shadow-lg'
                                        : 'bg-white/90 dark:bg-black/90 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 shadow-md border border-gray-200 dark:border-gray-600'
                                }`}
                                disabled={isLoading}
                            >
                                <LikeIcon className={`w-5 h-5 ${hasLiked ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                                <span>{hasLiked ? t('liked') : t('like')}</span>
                                {likeCount > 0 && (
                                    <span className="ml-1 px-2 py-0.5 bg-black/10 dark:bg-white/10 rounded-full text-xs">
                                        {likeCount}
                                    </span>
                                )}
                            </button>
                        )}
                        
                        {/* Conteneur pour My List et Share - meilleure disposition */}
                        <div className={`order-1 sm:order-2 flex gap-3 ${type === MediaType.Movie ? 'flex-1' : 'w-full'}`}>
                            <button
                                onClick={() => toggleBookmark(item.id)}
                                className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl backdrop-blur-sm transition-all duration-300 hover:scale-105 text-sm sm:text-base ${
                                    isBookmarked
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 hover:from-amber-400 hover:to-orange-400 shadow-lg'
                                        : 'bg-white/90 dark:bg-black/90 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 shadow-md border border-gray-200 dark:border-gray-600'
                                }`}
                            >
                                {isBookmarked ? (
                                    <CheckIcon className="w-5 h-5" />
                                ) : (
                                    <PlusIcon className="w-5 h-5" />
                                )}
                                <span className="hidden sm:inline">{isBookmarked ? t('addedToList') : t('myList')}</span>
                                <span className="sm:hidden">{isBookmarked ? (t('addedToList') || 'Ajouté') : (t('myList') || 'Ma liste')}</span>
                            </button>
                            
                            <div className="relative">
                                {type === MediaType.Series ? (
                                    <button
                                        onClick={() => handleShare('series')}
                                        disabled={isSharing}
                                        className="flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl bg-white/90 dark:bg-black/90 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base shadow-md border border-gray-200 dark:border-gray-600"
                                    >
                                        <ShareIcon className="w-5 h-5" />
                                        <span className="hidden sm:inline">{t('share') || 'Partager'}</span>
                                        <span className="sm:hidden">{t('share') || 'Partager'}</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleShare()}
                                        disabled={isSharing}
                                        className="flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl bg-white/90 dark:bg-black/90 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base shadow-md border border-gray-200 dark:border-gray-600"
                                    >
                                        <ShareIcon className="w-5 h-5" />
                                        <span className="hidden sm:inline">{t('share') || 'Partager'}</span>
                                        <span className="sm:hidden">{t('share') || 'Partager'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                </div>



                {/* Description avec meilleure lisibilité */}

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

                            {t('noDescription') || 'Aucune description disponible'}

                        </p>

                    )}

                </div>



                {(type === MediaType.Series || type === MediaType.Podcast) && (

                    <div className="space-y-4 md:space-y-6">

                        {/* Header avec titre et sélecteur de saison */}

                        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
                            <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{t('episodes')}</h2>

                            {/* Menu déroulant pour sélectionner la saison et bouton de partage */}
                            {firestoreSeasons.length > 0 && (
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
                                    <div className="sm:max-w-xs flex-1">
                                        <select
                                            value={selectedSeasonUid || ''}
                                            onChange={(e) => setSelectedSeasonUid(e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none cursor-pointer"
                                        >
                                            {firestoreSeasons.map(season => (
                                                <option key={season.uid_season} value={season.uid_season}>
                                                    {t('season')} {season.season_number}
                                                    {season.title_season ? ` - ${season.title_season}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Bouton Partager cette saison */}
                                    <button
                                        onClick={() => handleShare('season')}
                                        disabled={isSharing}
                                        className="flex items-center justify-center gap-2 font-bold py-2 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md border-0 whitespace-nowrap"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                        </svg>
                                        <span className="hidden sm:inline">{t('shareSeason') || 'Partager cette saison'}</span>
                                        <span className="sm:hidden">{t('share') || 'Partager'}</span>
                                    </button>
                                </div>
                            )}

                        </div>

                        {isLoading ? (

                            <div className="text-center py-8 md:py-12">

                                <div className="text-gray-500 dark:text-gray-400 text-sm md:text-base">{t('loading') || 'Chargement...'}</div>

                            </div>

                        ) : (

                            <div className="space-y-2 md:space-y-3">

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

                                                        <div className="text-gray-500 dark:text-gray-400 text-sm mt-2">{t('loading') || 'Chargement...'}</div>

                                                    </div>

                                                ) : episodes && episodes.length > 0 ? (

                                                    episodes.map(episode => {

                                                        const isPlaying = selectedSeason.season_number === playingEpisodeSeasonNumber && episode.uid_episode === playingItem?.episode?.uid_episode;

                                                        return <EpisodeListItem 
                                                            key={episode.uid_episode} 
                                                            episode={episode} 
                                                            onClick={() => onPlay(item, episode)} 
                                                            isPlaying={isPlaying} 
                                                            currentSeasonUid={selectedSeasonUid}
                                                            currentSerieTitle={title}
                                                        />;

                                                    })

                                                ) : (

                                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">

                                                        {t('noEpisodes') || 'Aucun épisode disponible pour cette saison'}

                                                    </div>

                                                )}

                                            </div>
                                        );

                                    })()

                                ) : (

                                    /* Fallback vers les données mockées seulement si aucune donnée Firestore */

                                    seasons && seasons.length > 0 && (

                                        <div className="space-y-2 md:space-y-3">

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

                                                                    const isPlaying = season.seasonNumber === playingEpisodeSeasonNumber && episode.episodeNumber === playingItem?.episode?.episodeNumber;

                                                                    return <EpisodeListItem 
                                                                    key={episode.episodeNumber} 
                                                                    episode={episode} 
                                                                    onClick={() => onPlay(item, episode)} 
                                                                    isPlaying={isPlaying} 
                                                                    currentSeasonUid={undefined}
                                                                    currentSerieTitle={title}
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

                )}





                <div>

                    <h2 className="text-xl font-bold mb-2">{t('languages')}</h2>

                    <div className="flex flex-wrap gap-2">

                        {languages && languages.map(lang => (

                            <span key={lang} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium py-1 px-3 rounded-full">

                                {lang}

                            </span>

                        ))}

                    </div>

                </div>

            </div>

        </div>

    );

};



export default MediaDetailScreen;