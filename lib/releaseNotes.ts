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
  
]
