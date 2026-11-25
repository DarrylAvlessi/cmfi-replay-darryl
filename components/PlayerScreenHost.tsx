import React from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMiniPlayerContext } from '../context/MiniPlayerContext';
import { EpisodeSerie } from '../lib/db';
import EpisodePlayerScreen from '../screens/EpisodePlayerScreen';
import MoviePlayerScreen from '../screens/MoviePlayerScreen';

const PlayerScreenHost: React.FC = () => {
  const { playerData, setPlayerData, isCollapsed, restore, fullyClose } = useMiniPlayerContext();
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
    fullyClose();
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

  const playerScreen = playerData.type === 'episode' && playerData.episode ? (
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
  );

  return (
    <>
      {forceMini ? createPortal(
        <div
          className={`fixed inset-0 z-[9999] pointer-events-none ${isCollapsed ? 'hidden' : ''}`}
          data-tour={!isCollapsed ? 'mini-player' : undefined}
          style={{ background: 'transparent' }}
        >
          {playerScreen}
        </div>,
        document.body
      ) : (
        playerScreen
      )}

      {isCollapsed && (
        createPortal(
          <div
            className="fixed bottom-0 left-0 right-0 z-[9999] flex h-14 cursor-pointer items-center gap-3 border-t border-slate-800 bg-[#0b1120]/95 px-4 shadow-2xl backdrop-blur-xl"
            onClick={handleCollapsedBarClick}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 shadow-md shadow-blue-600/30">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="flex-1 truncate text-sm font-medium text-white">
              {playerData.item.title}
              {episodeTitle && (
                <span className="ml-2 text-slate-400">— {episodeTitle}</span>
              )}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); fullyClose(); }}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white transition-colors hover:bg-white/20"
              aria-label="Close"
            >
              ✕
            </button>
          </div>,
          document.body
        )
      )}
    </>
  );
};

export default PlayerScreenHost;
