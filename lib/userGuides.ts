export type GuideCategory = 'getting-started' | 'player' | 'search' | 'profile';

export interface GuideStep {
  en: string;
  fr: string;
}

export interface UserGuide {
  id: string;
  category: GuideCategory;
  tourId: string | null;
  title: { en: string; fr: string };
  summary: { en: string; fr: string };
  steps: GuideStep[];
  readMinutes: number;
}

export const USER_GUIDES: UserGuide[] = [
  {
    id: 'getting-started',
    category: 'getting-started',
    tourId: 'getting-started',
    title: {
      en: 'Getting Started',
      fr: 'Premiers pas',
    },
    summary: {
      en: 'Learn how to navigate CMFI Replay and discover content.',
      fr: 'Apprenez à naviguer dans CMFI Replay et à découvrir du contenu.',
    },
    readMinutes: 3,
    steps: [
      {
        en: 'The home page highlights featured documentaries and productions. Use the Play button to start watching instantly.',
        fr: 'La page d\'accueil met en avant des documentaires et productions. Utilisez le bouton Lire pour commencer immédiatement.',
      },
      {
        en: 'On mobile, use the bottom navigation bar to switch between Home, Search, and Profile.',
        fr: 'Sur mobile, utilisez la barre de navigation en bas pour passer entre Accueil, Recherche et Profil.',
      },
      {
        en: 'Browse content categories: Documentaries, Productions, and Podcasts from the menu or navigation bar.',
        fr: 'Parcourez les catégories : Documentaires, Productions et Podcasts depuis le menu ou la barre de navigation.',
      },
      {
        en: 'Scroll down on the home page to find Continue Watching, Most Liked, and category sections.',
        fr: 'Faites défiler la page d\'accueil pour trouver Reprendre, Les plus aimés et les sections par catégorie.',
      },
    ],
  },
  {
    id: 'player',
    category: 'player',
    tourId: 'player',
    title: {
      en: 'Video Player',
      fr: 'Lecteur vidéo',
    },
    summary: {
      en: 'Master playback controls, bookmarks, mini player, and title suggestions.',
      fr: 'Maîtrisez les contrôles de lecture, les favoris, le mini lecteur et les suggestions de titre.',
    },
    readMinutes: 4,
    steps: [
      {
        en: 'Start watching from the featured hero on the home page or from any content detail page.',
        fr: 'Commencez à regarder depuis la bannière de la page d\'accueil ou depuis n\'importe quelle page de détail.',
      },
      {
        en: 'Tap My List on a detail page to save content to your favorites for quick access later.',
        fr: 'Appuyez sur Ma liste sur une page de détail pour sauvegarder le contenu dans vos favoris.',
      },
      {
        en: 'Use the Suggest button (pencil icon) to propose a better title for any video.',
        fr: 'Utilisez le bouton Suggérer (icône crayon) pour proposer un meilleur titre pour une vidéo.',
      },
      {
        en: 'While watching, use the control bar for play/pause, volume, playback speed, picture-in-picture, and fullscreen.',
        fr: 'Pendant la lecture, utilisez la barre de contrôle pour lecture/pause, volume, vitesse, image dans l\'image et plein écran.',
      },
      {
        en: 'When you navigate away during playback, the video continues in a mini player at the bottom of the screen.',
        fr: 'Lorsque vous quittez la page de lecture, la vidéo continue dans un mini lecteur en bas de l\'écran.',
      },
    ],
  },
  {
    id: 'search',
    category: 'search',
    tourId: 'search',
    title: {
      en: 'Search & Discovery',
      fr: 'Recherche et découverte',
    },
    summary: {
      en: 'Find documentaries, productions, podcasts, seasons, and episodes quickly.',
      fr: 'Trouvez rapidement des documentaires, productions, podcasts, saisons et épisodes.',
    },
    readMinutes: 2,
    steps: [
      {
        en: 'Open the Search tab and type keywords in the search bar. Results update as you type.',
        fr: 'Ouvrez l\'onglet Recherche et saisissez des mots-clés. Les résultats se mettent à jour en temps réel.',
      },
      {
        en: 'Use filter chips to narrow results by type: Documentaries, Productions, Podcasts, Seasons, or Episodes.',
        fr: 'Utilisez les filtres pour affiner par type : Documentaires, Productions, Podcasts, Saisons ou Épisodes.',
      },
      {
        en: 'Tap any result to open its detail page and start watching.',
        fr: 'Appuyez sur un résultat pour ouvrir sa page de détail et commencer à regarder.',
      },
    ],
  },
  {
    id: 'profile',
    category: 'profile',
    tourId: 'profile',
    title: {
      en: 'Profile & Preferences',
      fr: 'Profil et préférences',
    },
    summary: {
      en: 'Manage your watch history, favorites, language, theme, and account settings.',
      fr: 'Gérez votre historique, vos favoris, la langue, le thème et les paramètres du compte.',
    },
    readMinutes: 3,
    steps: [
      {
        en: 'Open Profile to see your Continue Watching history and pick up where you left off.',
        fr: 'Ouvrez Profil pour voir votre historique Reprendre et continuer là où vous vous êtes arrêté.',
      },
      {
        en: 'Access Account Settings to edit your profile, change your password, or manage preferences.',
        fr: 'Accédez aux Paramètres du compte pour modifier votre profil, changer votre mot de passe ou gérer vos préférences.',
      },
      {
        en: 'In Preferences, switch between light and dark theme and choose English or French.',
        fr: 'Dans Préférences, basculez entre le thème clair et sombre et choisissez l\'anglais ou le français.',
      },
      {
        en: 'Visit My Favorites to see all content you saved with the My List button.',
        fr: 'Consultez Mes favoris pour voir tout le contenu sauvegardé avec le bouton Ma liste.',
      },
    ],
  },
];

export const GUIDE_CATEGORIES: { id: GuideCategory | 'all'; labelKey: string }[] = [
  { id: 'all', labelKey: 'guideCategoryAll' },
  { id: 'getting-started', labelKey: 'guideCategoryGettingStarted' },
  { id: 'player', labelKey: 'guideCategoryPlayer' },
  { id: 'search', labelKey: 'guideCategorySearch' },
  { id: 'profile', labelKey: 'guideCategoryProfile' },
];

export function getGuideById(id: string): UserGuide | undefined {
  return USER_GUIDES.find((g) => g.id === id);
}
