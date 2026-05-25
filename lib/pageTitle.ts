import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

import { TranslationKey } from './i18n';

// Utilisation du type TranslationKey existant
type PageTitleKey = TranslationKey;

export const usePageTitle = () => {
  const location = useLocation();
  const { t } = useAppContext();

  // Fonction utilitaire pour obtenir une traduction en toute sécurité
  const safeT = (key: PageTitleKey): string => {
    try {
      return t(key) || '';
    } catch (e) {
      console.warn(`Translation key not found: ${key}`);
      return '';
    }
  };

  const getPageTitle = (pathname: string): string => {
    // Page d'accueil
    if (pathname === '/home') return 'CMFI Replay';
    
    // Pages de lecture
    if (pathname.startsWith('/watch/')) {
      return `${safeT('watch')} - CMFI Replay`;
    }
    
    // Pages de catégories
    if (pathname === '/documentaries') return `${safeT('categoryMovies')} - CMFI Replay`;
    if (pathname === '/productions') return `${safeT('categorySeries')} - CMFI Replay`;
    if (pathname === '/podcasts') return `${safeT('categoryPodcasts')} - CMFI Replay`;
    
    // Autres pages
    if (pathname === '/bookmarks') return `${safeT('favorites')} - CMFI Replay`;
    if (pathname === '/profile') return `${safeT('profile')} - CMFI Replay`;
    if (pathname === '/preferences') return `${safeT('preferences')} - CMFI Replay`;
    if (pathname === '/history') return `${safeT('history')} - CMFI Replay`;
    if (pathname === '/redeem-voucher') return `${safeT('redeemVoucher')} - CMFI Replay`;
    
    // Pages de détails
    if (pathname.startsWith('/documentary/')) return `${safeT('movie')} - CMFI Replay`;
    if (pathname.startsWith('/production/')) return `${safeT('serie')} - CMFI Replay`;
    if (pathname.startsWith('/podcast/')) return `${safeT('podcast')} - CMFI Replay`;
    
    // Par défaut
    return 'CMFI Replay';
  };

  // Mettre à jour le titre de la page
  const updateTitle = () => {
    document.title = getPageTitle(location.pathname);
  };

  // Mettre à jour le titre au chargement
  useEffect(() => {
    updateTitle();
  }, [location.pathname]);

  // Retourner la fonction de mise à jour du titre
  return { updateTitle };
};

export default usePageTitle;
