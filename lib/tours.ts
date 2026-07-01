import { Language } from './i18n';

export type TourShowOn = 'all' | 'mobile' | 'desktop';

export type TourBeforeShow =
  | 'openSidebar'
  | 'profileHistoryTab'
  | 'profileAccountTab';

export interface TourStep {
  id: string;
  element?: string;
  route?: string | ((ctx: TourContext) => string);
  showOn?: TourShowOn;
  beforeShow?: TourBeforeShow;
  condition?: (ctx: TourContext) => boolean;
  pauseAfterThisStep?: boolean;
  title: { en: string; fr: string };
  description: { en: string; fr: string };
}

export interface TourDefinition {
  id: string;
  steps: TourStep[];
}

export interface TourContext {
  demoVideoUid: string | null;
}

export const TOURS: TourDefinition[] = [
  {
    id: 'getting-started',
    steps: [
      {
        id: 'home-hero',
        element: '[data-tour="home-hero"]',
        route: '/home',
        title: {
          en: 'Featured Content',
          fr: 'Contenu à la une',
        },
        description: {
          en: 'Your home page showcases featured documentaries and productions. Tap Play to start watching.',
          fr: 'Votre page d\'accueil présente des documentaires et productions à la une. Appuyez sur Lire pour commencer.',
        },
      },
      {
        id: 'bottom-nav',
        element: '[data-tour="bottom-nav"]',
        route: '/home',
        showOn: 'mobile',
        title: {
          en: 'Bottom Navigation',
          fr: 'Navigation inférieure',
        },
        description: {
          en: 'Switch between Home, Search, and Profile using the bottom bar.',
          fr: 'Passez entre Accueil, Recherche et Profil avec la barre du bas.',
        },
      },
      {
        id: 'mobile-menu-btn',
        element: '[data-tour="mobile-menu-btn"]',
        route: '/home',
        showOn: 'mobile',
        title: {
          en: 'Menu',
          fr: 'Menu',
        },
        description: {
          en: 'Tap the menu icon to open categories: Documentaries, Productions, and Podcasts.',
          fr: 'Appuyez sur l\'icône menu pour ouvrir les catégories : Documentaires, Productions et Podcasts.',
        },
      },
      {
        id: 'sidebar-categories-mobile',
        element: '[data-tour="sidebar-categories"]',
        route: '/home',
        showOn: 'mobile',
        beforeShow: 'openSidebar',
        title: {
          en: 'Browse Categories',
          fr: 'Parcourir les catégories',
        },
        description: {
          en: 'Explore Documentaries, Productions, Podcasts, and more from the sidebar menu.',
          fr: 'Explorez Documentaires, Productions, Podcasts et plus depuis le menu latéral.',
        },
      },
      {
        id: 'header-avatar',
        element: '[data-tour="header-avatar"]',
        route: '/home',
        title: {
          en: 'Profile Menu',
          fr: 'Menu du profil',
        },
        description: {
          en: 'Tap your avatar to access your profile, bookmarks, watch history, and settings.',
          fr: 'Appuyez sur votre avatar pour accéder à votre profil, vos favoris, votre historique et vos paramètres.',
        },
      },
      {
        id: 'sidebar-categories',
        element: '[data-tour="sidebar-categories"]',
        route: '/home',
        showOn: 'desktop',
        title: {
          en: 'Browse Categories',
          fr: 'Parcourir les catégories',
        },
        description: {
          en: 'Use the top navigation to browse Documentaries, Productions, and Podcasts.',
          fr: 'Utilisez la navigation en haut pour parcourir Documentaires, Productions et Podcasts.',
        },
      },
    ],
  },
  {
    id: 'search',
    steps: [
      {
        id: 'search-input',
        element: '[data-tour="search-input"]',
        route: '/search',
        title: {
          en: 'Search Bar',
          fr: 'Barre de recherche',
        },
        description: {
          en: 'Type keywords to find documentaries, productions, podcasts, seasons, and episodes.',
          fr: 'Saisissez des mots-clés pour trouver documentaires, productions, podcasts, saisons et épisodes.',
        },
      },
      {
        id: 'search-filters',
        element: '[data-tour="search-filters"]',
        route: '/search',
        title: {
          en: 'Filter Results',
          fr: 'Filtrer les résultats',
        },
        description: {
          en: 'Use filters to narrow results by content type.',
          fr: 'Utilisez les filtres pour affiner les résultats par type de contenu.',
        },
      },
    ],
  },
  {
    id: 'profile',
    steps: [
      {
        id: 'profile-history',
        element: '[data-tour="profile-history"]',
        route: '/profile',
        beforeShow: 'profileHistoryTab',
        title: {
          en: 'Continue Watching',
          fr: 'Reprendre la lecture',
        },
        description: {
          en: 'Your watch history appears here so you can pick up where you left off.',
          fr: 'Votre historique de visionnage apparaît ici pour reprendre là où vous vous êtes arrêté.',
        },
      },
      {
        id: 'profile-settings',
        element: '[data-tour="profile-settings"]',
        route: '/profile',
        beforeShow: 'profileAccountTab',
        title: {
          en: 'Account Settings',
          fr: 'Paramètres du compte',
        },
        description: {
          en: 'Edit your profile, change your password, and manage your account from here.',
          fr: 'Modifiez votre profil, changez votre mot de passe et gérez votre compte depuis ici.',
        },
      },
      {
        id: 'profile-preferences',
        element: '[data-tour="profile-preferences"]',
        route: '/preferences',
        title: {
          en: 'Theme & Language',
          fr: 'Thème et langue',
        },
        description: {
          en: 'Switch between light and dark mode and choose English or French.',
          fr: 'Basculez entre le mode clair et sombre et choisissez l\'anglais ou le français.',
        },
      },
    ],
  },
  {
    id: 'player',
    steps: [
      {
        id: 'home-hero',
        element: '[data-tour="home-hero"]',
        route: '/home',
        title: {
          en: 'Start Watching',
          fr: 'Commencer à regarder',
        },
        description: {
          en: 'Featured content on the home page lets you start watching with one tap.',
          fr: 'Le contenu à la une vous permet de commencer à regarder en un clic.',
        },
      },
      {
        id: 'bookmark-btn',
        element: '[data-tour="bookmark-btn"]',
        route: (ctx) => (ctx.demoVideoUid ? `/documentary/${ctx.demoVideoUid}` : '/home'),
        title: {
          en: 'Save to My List',
          fr: 'Sauvegarder dans Ma liste',
        },
        description: {
          en: 'Tap My List to add this content to your favorites for quick access.',
          fr: 'Appuyez sur Ma liste pour ajouter ce contenu à vos favoris.',
        },
      },
      {
        id: 'suggest-title',
        element: '[data-tour="suggest-title"]',
        route: (ctx) => (ctx.demoVideoUid ? `/documentary/${ctx.demoVideoUid}` : '/home'),
        title: {
          en: 'Suggest a Title',
          fr: 'Suggérer un titre',
        },
        description: {
          en: 'Think a title could be better? Tap the pencil icon to suggest an improvement.',
          fr: 'Vous pensez qu\'un titre pourrait être meilleur ? Appuyez sur l\'icône crayon pour suggérer une amélioration.',
        },
      },
      {
        id: 'detail-play-btn',
        element: '[data-tour="detail-play-btn"]',
        route: (ctx) => (ctx.demoVideoUid ? `/documentary/${ctx.demoVideoUid}` : '/home'),
        title: {
          en: 'Play Button',
          fr: 'Bouton Lire',
        },
        description: {
          en: 'Press Play to open the full video player with all playback controls.',
          fr: 'Appuyez sur Lire pour ouvrir le lecteur vidéo complet avec tous les contrôles.',
        },
      },
      {
        id: 'player-controls',
        element: '[data-tour="player-controls"]',
        route: (ctx) => (ctx.demoVideoUid ? `/watch/${ctx.demoVideoUid}` : '/home'),
        title: {
          en: 'Playback Controls',
          fr: 'Contrôles de lecture',
        },
        description: {
          en: 'Use play/pause, volume, speed, picture-in-picture, and fullscreen while watching.',
          fr: 'Utilisez lecture/pause, volume, vitesse, image dans l\'image et plein écran pendant la lecture.',
        },
      },
      {
        id: 'mini-player',
        element: '[data-tour="mini-player"]',
        route: '/home',
        title: {
          en: 'Mini Player',
          fr: 'Mini lecteur',
        },
        description: {
          en: 'When you navigate away during playback, the video continues in a mini player. Tap it to return to full screen.',
          fr: 'Lorsque vous quittez la page de lecture, la vidéo continue dans un mini lecteur. Appuyez dessus pour revenir en plein écran.',
        },
      },
    ],
  },
  {
    id: 'app-tour',
    steps: [
      {
        id: 'home-hero',
        element: '[data-tour="home-hero"]',
        route: '/home',
        title: {
          en: 'Featured Content',
          fr: 'Contenu à la une',
        },
        description: {
          en: 'Your home page showcases featured documentaries and productions. Tap Play to start watching.',
          fr: 'Votre page d\'accueil présente des documentaires et productions à la une. Appuyez sur Lire pour commencer.',
        },
      },
      {
        id: 'bottom-nav',
        element: '[data-tour="bottom-nav"]',
        route: '/home',
        showOn: 'mobile',
        title: {
          en: 'Bottom Navigation',
          fr: 'Navigation inférieure',
        },
        description: {
          en: 'Switch between Home, Search, and Profile using the bottom bar.',
          fr: 'Passez entre Accueil, Recherche et Profil avec la barre du bas.',
        },
      },
      {
        id: 'mobile-menu-btn',
        element: '[data-tour="mobile-menu-btn"]',
        route: '/home',
        showOn: 'mobile',
        title: {
          en: 'Menu',
          fr: 'Menu',
        },
        description: {
          en: 'Tap the menu icon to open categories: Documentaries, Productions, and Podcasts.',
          fr: 'Appuyez sur l\'icône menu pour ouvrir les catégories : Documentaires, Productions et Podcasts.',
        },
      },
      {
        id: 'sidebar-categories-mobile',
        element: '[data-tour="sidebar-categories"]',
        route: '/home',
        showOn: 'mobile',
        beforeShow: 'openSidebar',
        pauseAfterThisStep: true,
        title: {
          en: 'Browse Categories',
          fr: 'Parcourir les catégories',
        },
        description: {
          en: 'Explore Documentaries, Productions, Podcasts, and more from the sidebar menu.',
          fr: 'Explorez Documentaires, Productions, Podcasts et plus depuis le menu latéral.',
        },
      },
      {
        id: 'header-avatar',
        element: '[data-tour="header-avatar"]',
        route: '/home',
        title: {
          en: 'Profile Menu',
          fr: 'Menu du profil',
        },
        description: {
          en: 'Tap your avatar to access your profile, bookmarks, watch history, and settings.',
          fr: 'Appuyez sur votre avatar pour accéder à votre profil, vos favoris, votre historique et vos paramètres.',
        },
      },
      {
        id: 'sidebar-categories',
        element: '[data-tour="sidebar-categories"]',
        route: '/home',
        showOn: 'desktop',
        pauseAfterThisStep: true,
        title: {
          en: 'Browse Categories',
          fr: 'Parcourir les catégories',
        },
        description: {
          en: 'Use the top navigation to browse Documentaries, Productions, and Podcasts.',
          fr: 'Utilisez la navigation en haut pour parcourir Documentaires, Productions et Podcasts.',
        },
      },
      {
        id: 'search-input',
        element: '[data-tour="search-input"]',
        route: '/search',
        title: {
          en: 'Search Bar',
          fr: 'Barre de recherche',
        },
        description: {
          en: 'Type keywords to find documentaries, productions, podcasts, seasons, and episodes.',
          fr: 'Saisissez des mots-clés pour trouver documentaires, productions, podcasts, saisons et épisodes.',
        },
      },
      {
        id: 'search-filters',
        element: '[data-tour="search-filters"]',
        route: '/search',
        title: {
          en: 'Filter Results',
          fr: 'Filtrer les résultats',
        },
        description: {
          en: 'Use filters to narrow results by content type.',
          fr: 'Utilisez les filtres pour affiner les résultats par type de contenu.',
        },
      },
      {
        id: 'profile-history',
        element: '[data-tour="profile-history"]',
        route: '/profile',
        beforeShow: 'profileHistoryTab',
        title: {
          en: 'Continue Watching',
          fr: 'Reprendre la lecture',
        },
        description: {
          en: 'Your watch history appears here so you can pick up where you left off.',
          fr: 'Votre historique de visionnage apparaît ici pour reprendre là où vous vous êtes arrêté.',
        },
      },
      {
        id: 'profile-settings',
        element: '[data-tour="profile-settings"]',
        route: '/profile',
        beforeShow: 'profileAccountTab',
        title: {
          en: 'Account Settings',
          fr: 'Paramètres du compte',
        },
        description: {
          en: 'Edit your profile, change your password, and manage your account from here.',
          fr: 'Modifiez votre profil, changez votre mot de passe et gérez votre compte depuis ici.',
        },
      },
      {
        id: 'profile-preferences',
        element: '[data-tour="profile-preferences"]',
        route: '/preferences',
        title: {
          en: 'Theme & Language',
          fr: 'Thème et langue',
        },
        description: {
          en: 'Switch between light and dark mode and choose English or French.',
          fr: 'Basculez entre le mode clair et sombre et choisissez l\'anglais ou le français.',
        },
      },
      {
        id: 'bookmark-btn',
        element: '[data-tour="bookmark-btn"]',
        route: (ctx) => (ctx.demoVideoUid ? `/documentary/${ctx.demoVideoUid}` : '/home'),
        condition: (ctx) => !!ctx.demoVideoUid,
        title: {
          en: 'Save to My List',
          fr: 'Sauvegarder dans Ma liste',
        },
        description: {
          en: 'Tap My List to add this content to your favorites for quick access.',
          fr: 'Appuyez sur Ma liste pour ajouter ce contenu à vos favoris.',
        },
      },
      {
        id: 'suggest-title',
        element: '[data-tour="suggest-title"]',
        route: (ctx) => (ctx.demoVideoUid ? `/documentary/${ctx.demoVideoUid}` : '/home'),
        condition: (ctx) => !!ctx.demoVideoUid,
        title: {
          en: 'Suggest a Title',
          fr: 'Suggérer un titre',
        },
        description: {
          en: 'Think a title could be better? Tap the pencil icon to suggest an improvement.',
          fr: 'Vous pensez qu\'un titre pourrait être meilleur ? Appuyez sur l\'icône crayon pour suggérer une amélioration.',
        },
      },
      {
        id: 'detail-play-btn',
        element: '[data-tour="detail-play-btn"]',
        route: (ctx) => (ctx.demoVideoUid ? `/documentary/${ctx.demoVideoUid}` : '/home'),
        condition: (ctx) => !!ctx.demoVideoUid,
        title: {
          en: 'Play Button',
          fr: 'Bouton Lire',
        },
        description: {
          en: 'Press Play to open the full video player with all playback controls.',
          fr: 'Appuyez sur Lire pour ouvrir le lecteur vidéo complet avec tous les contrôles.',
        },
      },
      {
        id: 'player-controls',
        element: '[data-tour="player-controls"]',
        route: (ctx) => (ctx.demoVideoUid ? `/watch/${ctx.demoVideoUid}` : '/home'),
        condition: (ctx) => !!ctx.demoVideoUid,
        title: {
          en: 'Playback Controls',
          fr: 'Contrôles de lecture',
        },
        description: {
          en: 'Use play/pause, volume, speed, picture-in-picture, and fullscreen while watching.',
          fr: 'Utilisez lecture/pause, volume, vitesse, image dans l\'image et plein écran pendant la lecture.',
        },
      },
      {
        id: 'mini-player',
        element: '[data-tour="mini-player"]',
        route: '/home',
        condition: (ctx) => !!ctx.demoVideoUid,
        title: {
          en: 'Mini Player',
          fr: 'Mini lecteur',
        },
        description: {
          en: 'When you navigate away during playback, the video continues in a mini player. Tap it to return to full screen.',
          fr: 'Lorsque vous quittez la page de lecture, la vidéo continue dans un mini lecteur. Appuyez dessus pour revenir en plein écran.',
        },
      },
    ],
  },
];

export function getTourById(id: string): TourDefinition | undefined {
  return TOURS.find((t) => t.id === id);
}

export function resolveTourRoute(
  route: TourStep['route'],
  ctx: TourContext
): string | undefined {
  if (!route) return undefined;
  return typeof route === 'function' ? route(ctx) : route;
}

export function getVisibleTourSteps(
  tour: TourDefinition,
  isMobile: boolean,
  ctx?: TourContext
): TourStep[] {
  return tour.steps.filter((step) => {
    if (step.showOn === 'mobile') return isMobile;
    if (step.showOn === 'desktop') return !isMobile;
    if (step.condition && ctx) return step.condition(ctx);
    return true;
  });
}

export function getTourStepText(
  step: TourStep,
  language: Language,
  field: 'title' | 'description'
): string {
  return language === 'fr' ? step[field].fr : step[field].en;
}
