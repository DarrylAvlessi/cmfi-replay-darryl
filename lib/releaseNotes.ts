export interface ReleaseNoteChange {
  type: 'Added' | 'Changed' | 'Deprecated' | 'Removed' | 'Fixed' | 'Security'
  en: string
  fr: string
}

export interface ReleaseNoteItem {
  version: string
  date: string
  changes: ReleaseNoteChange[]
}

const parseVersion = (v: string): number[] => v.split('.').map(Number);

export const isVersionNewerThan = (v1: string, v2: string): boolean => {
  const a = parseVersion(v1);
  const b = parseVersion(v2);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const na = a[i] || 0;
    const nb = b[i] || 0;
    if (na !== nb) return na > nb;
  }
  return false;
};

export const RELEASE_NOTES: ReleaseNoteItem[] = [
  {
    version: '1.2.0',
    date: '2026-06-10',
    changes: [
      { type: 'Added', en: 'Suggest a better title for any video from the player controls or the detail screen via a pencil icon.', fr: 'Suggérez un meilleur titre pour n\'importe quelle vidéo depuis les commandes du lecteur ou l\'écran de détail via une icône crayon.' },
      { type: 'Added', en: 'Title suggestion modal with optional reason textarea for explaining your proposal.', fr: 'Modal de suggestion de titre avec champ raison optionnel pour expliquer votre proposition.' },
      { type: 'Added', en: 'My Title Suggestions tab on the Help screen to track your submitted suggestions and their status.', fr: 'Onglet "Mes suggestions de titre" sur l\'écran d\'Aide pour suivre vos suggestions soumises et leur statut.' },
      { type: 'Added', en: 'Episode title suggestions: suggest a better title for individual episodes from the episode player.', fr: 'Suggestions de titre pour les épisodes : proposez un meilleur titre pour un épisode depuis le lecteur.' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-06-10',
    changes: [
      { type: 'Added', en: 'PiP button now opens an in-app mini player that persists across pages without reloading the video.', fr: 'Le bouton PiP ouvre désormais un mini lecteur intégré qui reste actif entre les pages sans recharger la vidéo.' },
      { type: 'Added', en: 'Mini player now has control buttons for play/pause, expand and close.', fr: 'Le mini lecteur a désormais des boutons lecture/pause, agrandir et fermer.' },
      { type: 'Fixed', en: 'Empty gap between back button and video on the watch page.', fr: 'Espace vide entre le bouton retour et la vidéo sur la page de lecture.' },
      { type: 'Fixed', en: 'Season title showing on other pages while mini player is active.', fr: 'Titre de saison visible sur les autres pages quand le mini lecteur est actif.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-06-02',
    changes: [
      { type: 'Added', en: 'Official release of the app with core features and improvements.', fr: 'Version initiale de l\'app avec les fonctionnalités de base et des améliorations.' },
    ],
  },
]
