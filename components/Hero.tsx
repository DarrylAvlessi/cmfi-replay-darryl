import React, { useState, useEffect } from 'react';
import { MediaContent, MediaType } from '../types';
import { PlayIcon, PauseIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon, PlusIcon } from './icons';
import { useAppContext } from '../context/AppContext';
import { movieService, Movie } from '../lib/db';

interface HeroProps {
  items?: MediaContent[];
  onSelectMedia: (item: MediaContent) => void;
  onPlay: (item: MediaContent) => void;
}

const Hero: React.FC<HeroProps> = ({ items: propItems, onSelectMedia, onPlay }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, bookmarkedIds, toggleBookmark, theme } = useAppContext();
  
  // Traductions
  const playText = t('play') || 'Lire';

  // Récupérer les 10 films les plus populaires depuis Firestore
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

  // Utiliser les films de Firestore si disponibles, sinon utiliser les props
  const items = movies.length > 0 ? movies.map(movie => ({
    id: movie.uid,
    title: movie.title,
    theme: movie.original_language,
    imageUrl: movie.backdrop_path,
    type: MediaType.Movie,
    duration: movie.runtime_h_m,
    description: movie.overview,
    video_path_hd: movie.video_path_hd,
    languages: [movie.original_language],
  })) : propItems || [];

  useEffect(() => {
    if (!items || items.length <= 1 || isPaused) return;

    const timer = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentIndex, items, isPaused]);

  // Classes dynamiques basées sur le thème
  const bgClass = theme === 'dark' ? 'bg-black' : 'bg-gray-100';
  const textClass = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const gradientClass = theme === 'dark'
    ? 'bg-gradient-to-b from-black/60 via-black/40 to-black'
    : 'bg-gradient-to-b from-gray-100/60 via-gray-100/40 to-gray-100';

  if (loading) {
    return (
      <div className={`relative w-full h-[60vh] md:h-[70vh] ${bgClass} flex items-center justify-center`}>
        <div className={`${textClass} text-lg`}>{t('loading') || 'Chargement...'}</div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <div className={`h-[60vh] md:h-[70vh] ${bgClass}`} />;
  }

  const currentItem = items[currentIndex];
  const isBookmarked = bookmarkedIds.includes(currentItem.id);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  };

  const handleSlideClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index !== currentIndex) {
      setCurrentIndex(index);
    } else {
      onSelectMedia(items[index]);
    }
  };

  // Fonction pour obtenir l'index réel avec effet de boucle infinie
  const getLoopedIndex = (index: number) => {
    const len = items.length;
    return ((index % len) + len) % len;
  };

  // Calculer la position et le style de chaque slide pour l'effet coverflow avec boucle
  const getSlideStyle = (index: number) => {
    const diff = index - currentIndex;
    const absDistance = Math.abs(diff);

    // Pour l'effet de boucle, on vérifie aussi la distance "de l'autre côté"
    const loopDiff = diff > 0 ? diff - items.length : diff + items.length;
    const loopAbsDistance = Math.abs(loopDiff);

    // Choisir la distance la plus courte (effet de boucle)
    const actualDiff = loopAbsDistance < absDistance ? loopDiff : diff;
    const actualAbsDistance = Math.abs(actualDiff);

    // Ne montrer que 2 slides de chaque côté (responsive: 1 sur mobile)
    const maxVisible = window.innerWidth < 768 ? 1 : 2;
    if (actualAbsDistance > maxVisible) {
      return {
        opacity: 0,
        transform: 'translateX(0) scale(0.5) rotateY(0deg)',
        zIndex: 0,
        pointerEvents: 'none' as const,
        display: 'none' as const,
      };
    }

    // Espacement adaptatif selon la taille d'écran
    const spacing = window.innerWidth < 768 ? 50 : 35;
    let translateX = actualDiff * spacing; // Espacement horizontal en %
    let scale = 1 - actualAbsDistance * 0.25; // Réduction de taille
    let rotateY = actualDiff * -25; // Rotation 3D
    let opacity = 1 - actualAbsDistance * 0.3;
    let zIndex = 10 - actualAbsDistance;

    return {
      opacity,
      transform: `translateX(${translateX}%) scale(${scale}) rotateY(${rotateY}deg)`,
      zIndex,
      pointerEvents: 'auto' as const,
      display: 'block' as const,
    };
  };

  // Créer un tableau étendu pour l'effet de boucle infinie
  const getVisibleSlides = () => {
    const visibleSlides = [];
    const maxVisible = window.innerWidth < 768 ? 1 : 2;

    for (let i = -maxVisible; i <= maxVisible; i++) {
      const actualIndex = getLoopedIndex(currentIndex + i);
      visibleSlides.push({
        item: items[actualIndex],
        displayIndex: currentIndex + i,
        actualIndex: actualIndex,
      });
    }

    return visibleSlides;
  };

  return (
    <div className={`relative w-full h-[65vh] md:h-[75vh] lg:h-[80vh] ${bgClass} ${textClass} overflow-hidden`}>
      {/* Background multi-couches premium avec effets visuels */}
      <div className="absolute inset-0 w-full h-full">
        {/* Image principale floutée avec parallax et transition fluide */}
        <div className="absolute inset-0 transition-opacity duration-1000 ease-out">
          <img
            key={currentItem.id}
            src={currentItem.imageUrl}
            alt=""
            className="w-full h-full object-cover blur-3xl opacity-40 dark:opacity-30 scale-125"
            style={{ transform: `scale(1.25) translateY(${currentIndex * 5}px)` }}
          />
        </div>
        
        {/* Vignettes des autres films en arrière-plan (effet de profondeur) */}
        <div className="absolute inset-0 overflow-hidden">
          {items.slice(0, 5).map((item, idx) => {
            if (idx === currentIndex) return null;
            const offset = idx - currentIndex;
            const absOffset = Math.abs(offset);
            if (absOffset > 2) return null;
            
            return (
              <div
                key={item.id}
                className="absolute inset-0 transition-all duration-1000 ease-out"
                style={{
                  opacity: 0.05 - absOffset * 0.02,
                  transform: `translateX(${offset * 20}%) scale(${1.1 - absOffset * 0.05})`,
                  filter: 'blur(40px)',
                }}
              >
                <img
                  src={item.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            );
          })}
        </div>

        {/* Pattern de grille subtil animé */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite',
          }}
        />

        {/* Effet de bruit cinématographique subtil */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
            animation: 'noiseMove 8s steps(8) infinite',
          }}
        />

        {/* Effets de lumière animés (spotlights) */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute w-[800px] h-[800px] rounded-full blur-3xl opacity-20 dark:opacity-10"
            style={{
              background: 'radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)',
              top: '20%',
              left: '10%',
              animation: 'lightMove1 15s ease-in-out infinite',
            }}
          />
          <div 
            className="absolute w-[600px] h-[600px] rounded-full blur-3xl opacity-15 dark:opacity-8"
            style={{
              background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)',
              bottom: '30%',
              right: '15%',
              animation: 'lightMove2 20s ease-in-out infinite',
            }}
          />
        </div>

        {/* Gradient overlay multi-couches premium */}
        <div className={`absolute inset-0 ${gradientClass}`} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/50 dark:from-black/80 dark:via-transparent dark:to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 dark:to-black/50" />
        <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-black dark:via-black/90" />
        
        {/* Bordure lumineuse animée en bas */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
          style={{
            animation: 'borderGlow 3s ease-in-out infinite',
          }}
        />
      </div>

      {/* Styles CSS pour les animations */}
      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        @keyframes lightMove1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(100px, -50px) scale(1.2); }
        }
        @keyframes lightMove2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-80px, 60px) scale(1.15); }
        }
        @keyframes borderGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes noiseMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-200px, -200px); }
        }
      `}</style>

      {/* Coverflow Container avec perspective améliorée */}
      <div className="relative h-full flex items-center justify-center" style={{ perspective: window.innerWidth < 768 ? '1500px' : '2500px' }}>
        <div className="relative w-full h-[60%] md:h-[65%] lg:h-[70%] flex items-center justify-center">
          {getVisibleSlides().map(({ item, displayIndex, actualIndex }) => {
            const style = getSlideStyle(displayIndex);
            const isCurrent = displayIndex === currentIndex;

            if (style.display === 'none') return null;

            return (
              <div
                key={items.length >= 5 ? item.id : `${item.id}-${displayIndex}`}
                className="absolute transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer"
                style={{
                  ...style,
                  width: window.innerWidth < 768 ? '75%' : '45%',
                  maxWidth: window.innerWidth < 768 ? '400px' : '600px',
                }}
                onClick={(e) => handleSlideClick(actualIndex, e)}
              >
                <div className={`relative rounded-xl md:rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl transition-all duration-1000 ${
                  isCurrent 
                    ? 'ring-2 md:ring-4 lg:ring-4 ring-white/50 shadow-[0_0_60px_rgba(255,255,255,0.4)]' 
                    : 'ring-0 opacity-70 hover:opacity-85'
                }`}>
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className={`w-full h-full object-cover aspect-video transition-all duration-1000 ${
                      isCurrent 
                        ? 'brightness-100 scale-100' 
                        : 'brightness-80 scale-105'
                    }`}
                  />

                  {/* Overlay gradient - Multi-couches */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-700 ${
                    isCurrent ? 'opacity-100' : 'opacity-70'
                  }`} />
                  
                  {/* Overlay supplémentaire pour les cartes latérales */}
                  {!isCurrent && (
                    <div className="absolute inset-0 bg-black/20 transition-opacity duration-700" />
                  )}

                  {/* Info du slide actuel */}
                  {isCurrent && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 lg:p-8 space-y-3 md:space-y-4 animate-fadeIn">
                      {/* Titre avec gestion du texte améliorée */}
                      <div className="space-y-2 md:space-y-3">
                        <h2 className="text-xl md:text-3xl lg:text-4xl font-black drop-shadow-2xl text-white leading-tight tracking-tight break-words">
                          {item.title}
                        </h2>
                        
                        {/* Métadonnées enrichies */}
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm">
                          {item.duration && (
                            <span className="text-white/95 font-semibold drop-shadow-lg flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {item.duration}
                            </span>
                          )}
                          {item.languages && item.languages.length > 0 && (
                            <span className="text-white/90 drop-shadow-md px-2 py-1 rounded-md bg-white/15 backdrop-blur-sm border border-white/25 text-xs md:text-sm font-medium">
                              {item.languages[0].toUpperCase()}
                            </span>
                          )}
                          {item.type && (
                            <span className="px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-md border border-white/30 text-white/95 text-xs md:text-sm font-bold">
                               {item.type === MediaType.Movie ? 'Documentaire' : item.type === MediaType.Series ? 'Production' : 'Podcast'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons améliorés */}
                      <div className="flex items-center gap-3 md:gap-4 pt-2" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlay(item);
                            }}
                            className="group flex items-center gap-2 md:gap-3 bg-white text-black px-5 md:px-7 py-2.5 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-bold hover:bg-gray-100 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-white/50"
                          >
                            <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                              <PlayIcon className="w-4 h-4 md:w-5 md:h-5 ml-0.5" />
                            </div>
                            <span>{playText}</span>
                          </button>
                        

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(item.id, item.title, item.imageUrl, item.type, item.description || '');
                          }}
                          className="group flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all duration-300 hover:scale-110 shadow-lg border border-white/30 hover:border-white/50"
                          title={isBookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        >
                          {isBookmarked ? (
                            <CheckIcon className="w-5 h-5 md:w-6 md:h-6 text-white group-hover:scale-110 transition-transform" />
                          ) : (
                            <PlusIcon className="w-5 h-5 md:w-6 md:h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
                          )}
                        </button>
                        
                        {/* Bouton Info premium */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMedia(item);
                          }}
                          className="group flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all duration-300 hover:scale-110 shadow-lg border border-white/30 hover:border-white/50"
                          title="Plus d'infos"
                        >
                          <svg className="w-5 h-5 md:w-6 md:h-6 text-white group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Controls */}
      {items.length > 1 && (
        <>
          {/* Navigation arrows */}
          <button
            onClick={handlePrev}
            className={`absolute left-2 md:left-4 lg:left-8 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 lg:p-4 ${theme === 'dark'
              ? 'bg-white/10 hover:bg-white/20 border-white/20'
              : 'bg-gray-900/20 hover:bg-gray-900/30 border-gray-900/30'
              } backdrop-blur-md rounded-full transition-all duration-300 hover:scale-110 border shadow-xl`}
            aria-label={t('previousSlide')}
          >
            <ChevronLeftIcon className={`w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
          </button>

          <button
            onClick={handleNext}
            className={`absolute right-2 md:right-4 lg:right-8 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 lg:p-4 ${theme === 'dark'
              ? 'bg-white/10 hover:bg-white/20 border-white/20'
              : 'bg-gray-900/20 hover:bg-gray-900/30 border-gray-900/30'
              } backdrop-blur-md rounded-full transition-all duration-300 hover:scale-110 border shadow-xl`}
            aria-label={t('nextSlide')}
          >
            <ChevronRightIcon className={`w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} />
          </button>

          {/* Bottom controls - Repositionné plus bas pour ne pas cacher les slides */}
          <div className={`absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 md:space-x-3 ${theme === 'dark'
            ? 'bg-white/10 border-white/20'
            : 'bg-gray-900/20 border-gray-900/30'
            } backdrop-blur-md rounded-full px-4 md:px-6 py-2 md:py-3 border shadow-xl z-20`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPaused(prev => !prev);
              }}
              className={`p-1 md:p-1.5 ${theme === 'dark'
                ? 'hover:bg-white/20 text-white'
                : 'hover:bg-gray-900/20 text-gray-900'
                } rounded-full transition-all duration-300 hover:scale-110`}
              aria-label={isPaused ? t('playCarousel') : t('pauseCarousel')}
            >
              {isPaused ? <PlayIcon className="w-4 h-4 md:w-5 md:h-5" /> : <PauseIcon className="w-4 h-4 md:w-5 md:h-5" />}
            </button>

            <div className="flex items-center space-x-1.5 md:space-x-2 px-1 md:px-2">
              {items.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={`w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full transition-all duration-300 ${currentIndex === index
                    ? `${theme === 'dark' ? 'bg-white' : 'bg-gray-900'} scale-125 shadow-lg`
                    : `${theme === 'dark' ? 'bg-white/40' : 'bg-gray-900/40'} hover:${theme === 'dark' ? 'bg-white/60' : 'bg-gray-900/60'} hover:scale-110`
                    }`}
                  aria-label={`${t('goToSlide')} ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Hero;