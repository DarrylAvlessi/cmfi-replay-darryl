import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MediaContent, MediaType } from '../types';
import { PlayIcon, PlusIcon, CheckIcon, InfoIcon, VolumeHighIcon, VolumeMuteIcon } from './icons';
import { useAppContext } from '../context/AppContext';
import { movieService, Movie } from '../lib/db';

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
      <div className="relative w-full h-[64vh] md:h-[74vh] bg-[#060911] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1530] via-[#060911] to-[#081226]" />
        <div className="absolute inset-0 broadcast-grid-bg opacity-40" />
        <div className="relative z-10 h-full flex flex-col justify-end pb-16 px-5 md:px-10 lg:px-14 gap-4 max-w-3xl">
          <div className="w-28 h-5 bg-slate-800/80 rounded-full animate-pulse" />
          <div className="w-3/4 h-10 md:h-14 bg-slate-800/80 rounded-xl animate-pulse" />
          <div className="w-1/2 h-4 bg-slate-800/60 rounded-lg animate-pulse" />
          <div className="flex gap-3 mt-2">
            <div className="w-36 h-12 bg-blue-600/30 rounded-xl animate-pulse" />
            <div className="w-12 h-12 bg-slate-800/80 rounded-xl animate-pulse" />
          </div>
        </div>
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
      className="relative w-full h-[64vh] md:h-[74vh] bg-[#060911] overflow-hidden group border-b border-slate-800/70"
      data-tour="home-hero"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Vidéo ou Image de fond */}
      <div className="absolute inset-0">
        <div className="absolute inset-0">
          <img
            src={currentItem.imageUrl}
            alt=""
            className="w-full h-full object-cover blur-2xl scale-110 opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060911] via-[#060911]/45 to-[#060911]/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060911]/90 via-[#060911]/35 to-transparent" />
        </div>

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

        {showVideo && !videoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="w-11 h-11 border-[3px] border-sky-400/20 border-t-sky-400 rounded-full animate-spin" />
          </div>
        )}

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

      {/* Contenu principal - Broadcast Stage */}
      <div className="relative z-10 h-full flex items-end w-full max-w-[100vw] overflow-hidden pb-14 md:pb-16">
        <div className="absolute inset-0 bg-gradient-to-t from-[#060911] via-[#060911]/55 to-transparent pointer-events-none" />

        <div className="w-full max-w-3xl px-5 md:px-10 lg:px-14 mx-0 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/25 border border-sky-400/35 backdrop-blur-md text-sky-300 text-[11px] font-mono-meta font-semibold uppercase tracking-widest mb-3.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            {t('home')} · Featured
          </div>

          <h1
            className="font-display font-bold text-white leading-[1.06] break-words drop-shadow-xl"
            style={{
              fontSize: 'clamp(1.9rem, 4.4vw, 4rem)',
              display: '-webkit-box',
              WebkitLineClamp: getLineClamp(),
              WebkitBoxOrient: 'vertical',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              wordBreak: 'break-word',
              letterSpacing: '-0.03em',
            }}
          >
            {currentItem.title}
          </h1>

          {currentItem.description ? (
            <p className="mt-3 max-w-xl text-sm md:text-base text-slate-300/90 line-clamp-2 leading-relaxed">
              {currentItem.description}
            </p>
          ) : null}

          <div className="mt-4 flex items-center gap-2.5 text-slate-200 text-xs font-mono-meta">
            {currentItem.duration && (
              <span className="px-2.5 py-1 rounded-lg border border-white/15 bg-slate-900/70 backdrop-blur-sm">
                {currentItem.duration}
              </span>
            )}
            {currentItem.languages && currentItem.languages.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg border border-sky-400/25 bg-sky-500/15 text-sky-300 uppercase tracking-wider">
                {currentItem.languages[0]}
              </span>
            )}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handlePlay}
              className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-semibold rounded-xl shadow-xl shadow-blue-600/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlayIcon className="w-5 h-5" />
              <span>{t('play')}</span>
            </button>

            <button
              onClick={handleBookmark}
              className={`p-3 rounded-xl border backdrop-blur-md transition-colors ${
                isBookmarked
                  ? 'bg-sky-500/25 border-sky-400/50 text-sky-300'
                  : 'bg-slate-900/60 hover:bg-slate-800/80 border-white/15 text-white'
              }`}
              aria-label={isBookmarked ? t('removeFromFavorites') : t('addToFavorites')}
            >
              {isBookmarked ? (
                <CheckIcon className="w-5 h-5" />
              ) : (
                <PlusIcon className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={() => onSelectMedia(currentItem)}
              className="p-3 bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-md rounded-xl border border-white/15 text-white transition-colors"
              aria-label={t('moreInfo')}
            >
              <InfoIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mute Toggle */}
      {showVideo && (
        <button
          onClick={toggleMute}
          className="absolute top-5 md:top-6 right-4 md:right-8 z-20 p-2.5 bg-slate-950/60 hover:bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/15 transition-colors"
          aria-label={isMuted ? t('enableSound') : t('disableSound')}
        >
          {isMuted ? (
            <VolumeMuteIcon className="w-5 h-5 text-white" />
          ) : (
            <VolumeHighIcon className="w-5 h-5 text-sky-400" />
          )}
        </button>
      )}

      {/* Navigation & Progress */}
      {items.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 md:left-8 bottom-5 z-20 p-2 bg-slate-950/60 hover:bg-slate-900/90 backdrop-blur-md rounded-xl border border-white/15 transition-colors"
            aria-label={t('previousSlide')}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 md:right-8 bottom-5 z-20 p-2 bg-slate-950/60 hover:bg-slate-900/90 backdrop-blur-md rounded-xl border border-white/15 transition-colors"
            aria-label={t('nextSlide')}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="absolute bottom-0 left-0 right-0 z-20 h-[3px] bg-white/10">
            <div ref={progressBarRef} className="h-full bg-gradient-to-r from-blue-500 to-sky-400" style={{ width: '0%' }} />
          </div>

          <div className="absolute bottom-6 md:bottom-7 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
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
                    ? 'w-7 h-1.5 bg-sky-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]'
                    : 'w-2 h-1.5 bg-white/35 hover:bg-white/60 rounded-full'
                }`}
                aria-label={`${t('goToSlide')} ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HeroPrimeVideo;
