import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MediaContent, MediaType } from '../types';
import { PlayIcon, PlusIcon, CheckIcon, InfoIcon, VolumeHighIcon, VolumeMuteIcon } from './icons';
import { useAppContext } from '../context/AppContext';
import { movieService, Movie } from '../lib/firestore';

interface HeroPrimeVideoProps {
  items?: MediaContent[];
  onSelectMedia: (item: MediaContent) => void;
  onPlay: (item: MediaContent) => void;
}

const HeroPrimeVideo: React.FC<HeroPrimeVideoProps> = ({ items: propItems, onSelectMedia, onPlay }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const randomStartTimeRef = React.useRef<number>(0);
  const isSeekingRef = React.useRef<boolean>(false);
  const slideStartTimeRef = React.useRef<number | null>(null);
  const slideElapsedBeforePauseRef = React.useRef<number>(0);
  const slideRafIdRef = React.useRef<number | null>(null);
  const progressBarRef = React.useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t, bookmarkedIds, toggleBookmark } = useAppContext();
  const SLIDE_DURATION_MS = 30000;

  // Détecter la taille d'écran pour une gestion précise des titres
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Calculer le nombre de lignes selon la taille d'écran
  const getLineClamp = () => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width < 640) return 4;      // mobile petit
      if (width < 768) return 3;      // mobile grand
      if (width < 1024) return 3;     // tablette
      if (width < 1280) return 2;     // desktop petit
      return 2;                        // desktop grand
    }
    return 2;
  };

  // Récupérer les films populaires
  useEffect(() => {
    const fetchPopularMovies = async () => {
      try {
        const popularMovies = await movieService.getPopularMovies(10);
        setMovies(popularMovies);
      } catch (error) {
        console.error('Error fetching popular movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularMovies();
  }, []);

  const items = movies.length > 0 ? movies.map(movie => ({
    id: movie.uid,
    title: movie.title,
    theme: movie.original_language,
    imageUrl: movie.backdrop_path || movie.picture_path,
    type: MediaType.Movie,
    duration: movie.runtime_h_m,
    description: movie.overview,
    video_path_hd: movie.video_path_hd,
    languages: [movie.original_language],
  })) : propItems || [];

  // Définir currentItem tôt pour éviter les erreurs
  const currentItem = items.length > 0 ? items[currentIndex] : null;

  useEffect(() => {
    if (items.length <= 1) {
      if (progressBarRef.current) progressBarRef.current.style.width = '0%';
      slideStartTimeRef.current = null;
      slideElapsedBeforePauseRef.current = 0;
      if (slideRafIdRef.current !== null) {
        cancelAnimationFrame(slideRafIdRef.current);
        slideRafIdRef.current = null;
      }
      return;
    }

    if (isPaused) {
      if (slideRafIdRef.current !== null) {
        cancelAnimationFrame(slideRafIdRef.current);
        slideRafIdRef.current = null;
      }
      if (slideStartTimeRef.current !== null) {
        slideElapsedBeforePauseRef.current += performance.now() - slideStartTimeRef.current;
        slideStartTimeRef.current = null;
      }
      return;
    }

    const hasVideo = !!(currentItem?.video_path_hd && !videoError);
    if (hasVideo && !videoLoaded) {
      if (progressBarRef.current) progressBarRef.current.style.width = '0%';
      slideStartTimeRef.current = null;
      slideElapsedBeforePauseRef.current = 0;
      if (slideRafIdRef.current !== null) {
        cancelAnimationFrame(slideRafIdRef.current);
        slideRafIdRef.current = null;
      }
      return;
    }

    const slideDurationMs = hasVideo ? SLIDE_DURATION_MS : 7000;

    slideStartTimeRef.current = performance.now();

    const tick = () => {
      if (slideStartTimeRef.current === null) return;

      const elapsed =
        slideElapsedBeforePauseRef.current + (performance.now() - slideStartTimeRef.current);
      const progress = Math.min(elapsed / slideDurationMs, 1);
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progress * 100}%`;
      }

      if (progress >= 1) {
        slideElapsedBeforePauseRef.current = 0;
        slideStartTimeRef.current = performance.now();
        if (progressBarRef.current) progressBarRef.current.style.width = '0%';
        setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
        setVideoError(false);
      }

      slideRafIdRef.current = requestAnimationFrame(tick);
    };

    slideRafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (slideRafIdRef.current !== null) {
        cancelAnimationFrame(slideRafIdRef.current);
        slideRafIdRef.current = null;
      }
      if (slideStartTimeRef.current !== null) {
        slideElapsedBeforePauseRef.current += performance.now() - slideStartTimeRef.current;
        slideStartTimeRef.current = null;
      }
    };
  }, [items.length, isPaused, videoLoaded, videoError, currentItem?.video_path_hd]);

  // Gérer la vidéo : jouer un extrait de 30 secondes aléatoire en boucle
  useEffect(() => {
    if (!currentItem) {
      setVideoError(true);
      return;
    }

    const video = videoRef.current;
    if (!video || !currentItem.video_path_hd) {
      setVideoError(true);
      return;
    }

    // Réinitialiser le point de départ aléatoire pour chaque nouvel item
    randomStartTimeRef.current = 0;

    const handleTimeUpdate = () => {
      // Éviter les modifications pendant un seek pour plus de fluidité
      if (isSeekingRef.current) return;
      
      const startTime = randomStartTimeRef.current;
      const endTime = startTime + 30;
      const currentTime = video.currentTime;
      
      // Utiliser un seuil pour éviter les vérifications trop fréquentes et les saccades
      // Si on est très proche de la fin (à 0.1 seconde près), faire la boucle
      if (currentTime >= endTime - 0.1) {
        isSeekingRef.current = true;
        video.currentTime = startTime;
      } else if (currentTime < startTime - 0.1) {
        // Si on est avant le début (peut arriver lors du chargement), revenir au début
        isSeekingRef.current = true;
        video.currentTime = startTime;
      }
    };

    const handleSeeked = () => {
      // Réinitialiser le flag après que le seek soit terminé
      isSeekingRef.current = false;
    };

    const handleLoadedMetadata = () => {
      // Une fois les métadonnées chargées, choisir un point de départ aléatoire
      const videoDuration = video.duration;
      
      if (videoDuration && videoDuration > 30) {
        // Choisir un point de départ aléatoire, en s'assurant qu'il reste au moins 30 secondes après
        const maxStartTime = videoDuration - 30;
        randomStartTimeRef.current = Math.random() * maxStartTime;
      } else {
        // Si la vidéo fait moins de 30 secondes, commencer au début
        randomStartTimeRef.current = 0;
      }
      
      // Réinitialiser le flag de seek
      isSeekingRef.current = false;
      
      // Démarrer la vidéo au point de départ aléatoire
      video.currentTime = randomStartTimeRef.current;
    };

    const handleError = () => {
      console.error('Video loading error');
      setVideoError(true);
    };

    const handleCanPlay = () => {
      // S'assurer que la vidéo est au bon point de départ
      if (Math.abs(video.currentTime - randomStartTimeRef.current) > 0.5) {
        isSeekingRef.current = true;
        video.currentTime = randomStartTimeRef.current;
      }
    };

    const handleLoadedData = () => {
      // Quand les données sont chargées, essayer de jouer la vidéo
      setVideoLoaded(true);
      video.play().catch((error) => {
        console.error('Error playing video:', error);
        setVideoError(true);
      });
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);

    // Réinitialiser l'erreur vidéo et l'état de chargement quand on change d'item
    setVideoError(false);
    setVideoLoaded(false);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [currentItem.id, currentItem.video_path_hd]);

  if (loading || !items || items.length === 0 || !currentItem) {
    return (
      <div className="relative w-full h-[60vh] md:h-[80vh] bg-black flex items-center justify-center">
        <div className="text-white text-lg">{t('loading') || 'Chargement...'}</div>
      </div>
    );
  }

  const isBookmarked = bookmarkedIds.includes(currentItem.id);

  const restartCarouselTimer = () => {
    slideElapsedBeforePauseRef.current = 0;
    slideStartTimeRef.current = isPaused ? null : performance.now();
    if (progressBarRef.current) progressBarRef.current.style.width = '0%';
  };

  const handlePrev = () => {
    restartCarouselTimer();
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
    setVideoError(false);
  };

  const handleNext = () => {
    restartCarouselTimer();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
    setVideoError(false);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const handlePlay = () => {
    navigate(`/watch/${currentItem.id}`);
  };

  const handleBookmark = () => {
    toggleBookmark(
      currentItem.id,
      currentItem.title,
      currentItem.description || '',
      currentItem.imageUrl || '',
      false
    );
  };

  const videoUrl = currentItem.video_path_hd;
  const showVideo = videoUrl && !videoError;

  return (
    <div 
      className="relative w-full h-[60vh] md:h-[80vh] bg-black overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Vidéo ou Image de fond */}
      <div className="absolute inset-0">
        {/* Fond flou dynamique - toujours visible */}
        <div className="absolute inset-0">
          <img
            src={currentItem.imageUrl}
            alt=""
            className="w-full h-full object-cover blur-2xl scale-110 opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
        </div>

        {/* Vidéo superposée si disponible */}
        {showVideo && (
          <video
            ref={videoRef}
            key={currentItem.id}
            src={videoUrl}
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${
              videoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            muted={isMuted}
            playsInline
            loop
            autoPlay
            preload="metadata"
          />
        )}

        {/* Indicateur de chargement vidéo */}
        {showVideo && !videoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="w-12 h-12 border-[3px] border-white/20 border-t-white/80 rounded-full animate-spin" />
          </div>
        )}

        {/* Image principale centrée - fallback si pas de vidéo */}
        {!showVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              key={currentItem.id}
              src={currentItem.imageUrl}
              alt={currentItem.title}
              className="h-full w-auto max-w-full object-contain transition-opacity duration-1000 z-10"
            />
          </div>
        )}
      </div>

      {/* Contenu principal - Layout Prime Video */}
      <div className="relative z-10 h-full flex items-center w-full max-w-[100vw] overflow-hidden">
        {/* Dégradé sombre pour améliorer le contraste du texte */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent lg:from-black/80 lg:via-black/60 lg:to-transparent"></div>
        
        <div className="w-full max-w-[100%] px-4 md:px-8 lg:px-12 mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Colonne gauche - Contenu textuel */}
            <div className="space-y-6 md:space-y-8">
              {/* Titre principal adaptatif */}
              <div className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl overflow-hidden">
                <h1 
                  className="font-display font-bold text-white leading-tight break-words transition-all duration-300"
                  style={{
                    fontSize: 'clamp(1.1rem, 3.2vw, 2.8rem)',
                    lineHeight: 'clamp(1.3rem, 3.8vw, 3.2rem)',
                    display: '-webkit-box',
                    WebkitLineClamp: getLineClamp(),
                    WebkitBoxOrient: 'vertical',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    letterSpacing: '-0.005em',
                    textTransform: 'uppercase',
                    hyphens: 'auto'
                  }}
                >
                  {currentItem.title}
                </h1>
              </div>

              {/* Métadonnées */}
              <div className="flex items-center gap-4 text-white/80 text-sm md:text-base">
                {currentItem.duration && (
                  <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full">
                    {currentItem.duration}
                  </span>
                )}
                {currentItem.languages && currentItem.languages.length > 0 && (
                  <span>{currentItem.languages[0].toUpperCase()}</span>
                )}
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePlay}
                  className="group flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 bg-white hover:bg-white/90 text-black font-bold rounded-lg md:rounded-xl transition-all duration-300 hover:scale-105 shadow-xl"
                >
                  <PlayIcon className="w-6 h-6 md:w-7 md:h-7" />
                  <span className="text-base md:text-lg">{t('play') || 'Regarder'}</span>
                </button>

                <button
                  onClick={handleBookmark}
                  className="p-3 md:p-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/20 transition-all duration-300 hover:scale-110"
                  aria-label={isBookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  {isBookmarked ? (
                    <CheckIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  ) : (
                    <PlusIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  )}
                </button>

                <button
                  onClick={() => onSelectMedia(currentItem)}
                  className="p-3 md:p-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/20 transition-all duration-300 hover:scale-110"
                  aria-label="Plus d'infos"
                >
                  <InfoIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </button>
              </div>
            </div>

            {/* Colonne droite - (Espace vide pour laisser la vidéo/image de fond visible) */}
            <div className="hidden lg:block relative" />
          </div>
        </div>
      </div>

      {/* Bouton de contrôle Audio (Mute/Unmute) */}
      {showVideo && (
        <button
          onClick={toggleMute}
          className="absolute bottom-20 md:bottom-24 right-4 md:right-8 lg:right-12 z-20 p-3 md:p-4 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full border border-white/20 transition-all duration-300 hover:scale-110 shadow-lg group"
          aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
        >
          {isMuted ? (
            <VolumeMuteIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
          ) : (
            <VolumeHighIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
          )}
        </button>
      )}

      {/* Contrôles de navigation et indicateurs de carrousel */}
      {items.length > 1 && (
        <>
          {/* Contrôles de navigation en bas */}
          <button
            onClick={handlePrev}
            className="absolute left-4 md:left-8 bottom-6 md:bottom-8 z-20 p-3 md:p-4 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full border border-white/20 transition-all duration-300 hover:scale-110"
            aria-label="Précédent"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 md:right-8 bottom-6 md:bottom-8 z-20 p-3 md:p-4 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full border border-white/20 transition-all duration-300 hover:scale-110"
            aria-label="Suivant"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Barre de progression séparée */}
          <div className="absolute bottom-14 md:bottom-16 left-1/2 -translate-x-1/2 z-20 w-32 md:w-48 h-1 bg-white/20 rounded-full overflow-hidden">
            <div ref={progressBarRef} className="h-full bg-white/80" style={{ width: '0%' }} />
          </div>

          {/* Indicateurs centrés entre les flèches */}
          <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 md:gap-3">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  restartCarouselTimer();
                  setCurrentIndex(index);
                  setVideoError(false);
                }}
                className={`transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-8 h-2 bg-white rounded-full'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/60 rounded-full'
                }`}
                aria-label={`Aller à la slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HeroPrimeVideo;
