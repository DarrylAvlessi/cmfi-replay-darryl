import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMiniPlayerContext } from '../context/MiniPlayerContext';
import { EpisodeSerie } from '../lib/db';
import EpisodePlayerScreen from '../screens/EpisodePlayerScreen';
import MoviePlayerScreen from '../screens/MoviePlayerScreen';

const PlayerScreenHost: React.FC = () => {
  const { playerData, setPlayerData, isCollapsed, collapse, restore, fullyClose } = useMiniPlayerContext();
  const location = useLocation();
  const navigate = useNavigate();

  if (!playerData) return null;

  const isWatchRoute = location.pathname.startsWith('/watch/');
  const forceMini = !isWatchRoute;

  const handleBack = () => {
    if (playerData.type === 'episode') {
      const route = playerData.item.type === 'Series' ? 'production' : 'podcast';
      navigate(`/${route}/${playerData.item.id}`);
    } else {
      navigate(`/documentary/${playerData.item.id}`);
    }
  };

  const handleNavigateEpisode = (directionOrEpisode: EpisodeSerie | 'next' | 'prev') => {
    if (typeof directionOrEpisode !== 'string') {
      const uid = directionOrEpisode?.uid_episode;
      if (uid) {
        navigate(`/watch/${uid}`);
      }
    } else {
      if (playerData.onNavigateEpisode) {
        playerData.onNavigateEpisode(directionOrEpisode);
      }
    }
  };

  const handleReturnHome = () => {
    navigate('/home');
  };

  const handleClose = () => {
    if (forceMini) {
      collapse();
    } else {
      fullyClose();
    }
  };

  const handleCollapsedBarClick = () => {
    if (playerData.type === 'episode' && playerData.episode?.uid_episode) {
      navigate(`/watch/${playerData.episode.uid_episode}`);
    } else {
      navigate(`/watch/${playerData.item.id}`);
    }
    restore();
  };

  const episodeTitle = playerData.type === 'episode' && playerData.episode
    ? playerData.episode.title || `Épisode ${playerData.episode.episode_numero || ''}`
    : null;

  return (
    <>
      <div
        className={
          isCollapsed
            ? 'hidden'
            : forceMini
              ? 'fixed inset-0 z-[9999] pointer-events-none'
              : ''
        }
        data-tour={forceMini && !isCollapsed ? 'mini-player' : undefined}
        style={forceMini && !isCollapsed ? { background: 'transparent' } : undefined}
      >
        {playerData.type === 'episode' && playerData.episode ? (
          <EpisodePlayerScreen
            item={playerData.item}
            episode={playerData.episode}
            onBack={handleBack}
            onNavigateEpisode={handleNavigateEpisode}
            onReturnHome={handleReturnHome}
            forceMini={forceMini}
            onClose={handleClose}
          />
        ) : (
          <MoviePlayerScreen
            item={playerData.item as any}
            onBack={handleBack}
            onReturnHome={handleReturnHome}
            forceMini={forceMini}
            onClose={handleClose}
          />
        )}
      </div>

      {isCollapsed && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[9999] h-14 bg-gray-900/95 backdrop-blur-md border-t border-white/10 flex items-center px-4 gap-3 cursor-pointer"
          onClick={handleCollapsedBarClick}
        >
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="text-white text-sm font-medium truncate flex-1">
            {playerData.item.title}
            {episodeTitle && (
              <span className="text-gray-400 ml-2">— {episodeTitle}</span>
            )}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); fullyClose(); }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-colors flex-shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};

export default PlayerScreenHost;
