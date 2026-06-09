export interface ReleaseNoteChange {
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
    version: '1.0.0',
    date: '2026-06-02',
    changes: [
      { en: 'Official release of the app with core features and improvements.', fr: 'Version initiale de l\'app avec les fonctionnalités de base et des améliorations.' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-15',
    changes: [
      { en: 'Added support for exporting replays in multiple formats.', fr: 'Ajout du support pour l\'exportation des replays dans plusieurs formats.' },
      { en: 'Improved performance when loading large replay files.', fr: 'Amélioration des performances lors du chargement de gros fichiers de replay.' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-08-30',
    changes: [
      { en: 'Introduced a new user interface for easier navigation.', fr: 'Introduction d\'une nouvelle interface utilisateur pour une navigation plus facile.' },
      { en: 'Fixed various bugs and improved overall stability.', fr: 'Correction de divers bugs et amélioration de la stabilité générale.' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-15',
    changes: [
      { en: 'Added dark mode support for better visual comfort.', fr: 'Ajout du support du mode sombre pour un meilleur confort visuel.' },
      { en: 'Enhanced the replay analysis tools with more detailed statistics.', fr: 'Amélioration des outils d\'analyse des replays avec des statistiques plus détaillées.' },
    ],
  }
  
]
