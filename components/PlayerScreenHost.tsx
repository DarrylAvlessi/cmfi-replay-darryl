import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMiniPlayerContext } from '../context/MiniPlayerContext';
import EpisodePlayerScreen from '../screens/EpisodePlayerScreen';
import MoviePlayerScreen from '../screens/MoviePlayerScreen';

const PlayerScreenHost: React.FC = () => {
  const { playerData, setPlayerData } = useMiniPlayerContext();
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

  const handleNavigateEpisode = (directionOrEpisode: any) => {
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
    setPlayerData(null);
  };

  return (
    <div
      className={forceMini ? 'fixed inset-0 z-[9999] pointer-events-none' : ''}
      style={forceMini ? { background: 'transparent' } : undefined}
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
  );
};

export default PlayerScreenHost;
