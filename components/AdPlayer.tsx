import React, { useState, useEffect, useRef } from 'react';
import { Ad, adService } from '../lib/db';
import { ForwardIcon } from './icons';
import { useAppContext } from '../context/AppContext';

interface AdPlayerProps {
  onAdEnd: () => void;
  onSkip?: () => void;
}

const AdPlayer: React.FC<AdPlayerProps> = ({ onAdEnd, onSkip }) => {
  const { t } = useAppContext();
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [skipCountdown, setSkipCountdown] = useState(0);
  const [adSettings, setAdSettings] = useState<{ enabled: boolean; skipAfterSeconds: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadAd = async () => {
      try {
        setLoading(true);
        // Vérifier si les publicités sont activées
        const settings = await adService.getAdSettings();
        console.log('Ad settings:', settings);

        if (!settings || !settings.enabled) {
          console.log('Ads are disabled or settings not found');
          setLoading(false);
          onAdEnd(); // Pas de pub, passer directement à la vidéo
          return;
        }

        setAdSettings(settings);

        // Charger une publicité aléatoire
        const randomAd = await adService.getRandomAd();
        console.log('Random ad loaded:', randomAd);

        if (!randomAd) {
          console.log('No active ads available');
          setLoading(false);
          onAdEnd(); // Pas de pub disponible, passer directement à la vidéo
          return;
        }

        setAd(randomAd);
        setSkipCountdown(randomAd.skipAfterSeconds || settings.skipAfterSeconds || 5);
        setLoading(false);
      } catch (error) {
        console.error('Error loading ad:', error);
        setError(true);
        setLoading(false);
        // En cas d'erreur, passer directement à la vidéo après un court délai
        setTimeout(() => {
          onAdEnd();
        }, 1000);
      }
    };

    loadAd();
  }, [onAdEnd]);

  useEffect(() => {
    if (ad && adSettings) {
      const skipTime = ad.skipAfterSeconds || adSettings.skipAfterSeconds || 5;

      // Démarrer le compte à rebours pour le skip
      countdownIntervalRef.current = setInterval(() => {
        setSkipCountdown((prev) => {
          if (prev <= 1) {
            setCanSkip(true);
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [ad, adSettings]);

  const handleVideoEnd = () => {
    onAdEnd();
  };

  const handleSkip = () => {
    if (canSkip && onSkip) {
      onSkip();
      onAdEnd();
    }
  };

  const handleError = () => {
    console.error('Error playing ad video');
    setError(true);
    // En cas d'erreur, passer directement à la vidéo
    setTimeout(() => {
      onAdEnd();
    }, 1000);
  };

  if (loading) {
    return (
      <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white text-lg">{t('adLoading') || 'Chargement de la publicité...'}</div>
      </div>
    );
  }

  if (error || !ad) {
    return null; // Pas de pub ou erreur, on passe directement à la vidéo
  }

  return (
    <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
      {/* Vidéo publicitaire */}
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          src={ad.videoUrl}
          className="w-full h-full object-contain"
          autoPlay
          muted={false}
          playsInline
          onEnded={handleVideoEnd}
          onError={handleError}
        />

        {/* Compteur de publicité en haut à droite */}
        {!canSkip && skipCountdown > 0 && (
          <div className="absolute top-4 right-4 px-4 py-2 bg-black/70 backdrop-blur-sm rounded-lg text-white text-sm font-medium">
            {t('ad') || 'Publicité'} - {skipCountdown}s
          </div>
        )}

        {/* Bouton passer en bas à droite */}
        {canSkip && (
          <div className="absolute bottom-4 right-4">
            <button
              onClick={handleSkip}
              className="px-6 py-2 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <span>{t('skip') || 'Passer'}</span>
              <ForwardIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Titre de la publicité (optionnel) */}
        {ad.title && (
          <div className="absolute bottom-4 left-4 px-4 py-2 bg-black/70 backdrop-blur-sm rounded-lg text-white text-sm">
            {ad.title}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdPlayer;

