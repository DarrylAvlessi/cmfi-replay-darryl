# Audit de Performance — CMFI Replay

> 6 mai 2026 | React 19.2, Vite 6.2, Firebase 10.7

---

## 1. Bundle & Dépendances

| Sévérité | Problème | Fichier | Impact |
|---|---|---|---|
| 🔴 | Firebase SDK complet, `getAnalytics()` chargé systématiquement | `lib/firebase.ts:3,24` | +200 KB |
| 🟡 | `@heroicons/react` barrel imports | `package.json:14` | Icônes inutilisées |
| 🟡 | `react-toastify` CSS statique | `App.tsx:6` | CSS inutile quand pas de toast |
| 🟢 | `@types/react-router-dom` en prod deps | `package.json:17` | Mauvaise pratique |

**Actions** : Retirer lazy-loader `getAnalytics()`, imports individuels heroicons.

---

## 2. Code Splitting & Lazy Loading

| Sévérité | Problème | Fichier |
|---|---|---|
| 🔴 | **Aucun lazy loading** — 20+ écrans importés statiquement | `App.tsx:9-35` |
| 🟡 | `handlePlay` contient 2 blocs identiques (duplication) | `App.tsx:212-250` |
| 🟡 | `featuredContent` mock importé statiquement | `HomeScreen.tsx:10` |

**Action** : `React.lazy()` + `Suspense` pour tous les écrans sauf Login/Register. Économie estimée : **30-40% du bundle initial**.

---

## 3. Data Fetching & Firestore

| Sévérité | Problème | Fichier |
|---|---|---|
| 🔴 | **N+1 queries** : 10 requêtes pour 10 "most liked/watched" | `HomeScreen.tsx:213-316` |
| 🔴 | **Fetch ALL + shuffle client-side** : télécharge TOUT pour en afficher 10 | `firestore.ts:863-1159` |
| 🔴 | **Recherche côté client** : `searchMovies()` télécharge tous les films | `firestore.ts:888-902` |
| 🔴 | **Waterfall WatchScreen** : 4 requêtes séquentielles (film→épisode→saison→série) | `WatchScreen.tsx:22-94` |
| 🟡 | Pas de cache entre écrans | Global |
| 🟡 | 8 `useEffect` parallèles au montage de HomeScreen | `HomeScreen.tsx:207-432` |
| 🟡 | Catégories fetchées séquentiellement au lieu de `Promise.all` | `HomeScreen.tsx:397-405` |
| 🟡 | `getBookmarkedMovies` : boucle N requêtes au lieu de `in` query | `firestore.ts:904-920` |

**Actions** :
- Remplacer "fetch all + shuffle" par champ `randomSeed` + query ciblée
- Batch N+1 avec `where('uid', 'in', [...])`
- `Promise.all` pour catégories
- Cache simple ou React Query/SWR
- Stocker `uid_serie` dans l'épisode pour éviter le waterfall WatchScreen

---

## 4. Re-renders & State Management

| Sévérité | Problème | Fichier |
|---|---|---|
| 🔴 | **AppContext monolithique** (20+ valeurs) : tout re-rend quand UNE valeur change | `AppContext.tsx:12-43, 549-604` |
| 🟡 | `toggleSidebarCollapse` non-memoized | `AppContext.tsx:545-547` |
| 🟡 | Pas de `React.memo` sur MediaCard, RankedMediaCard, UserAvatar | Composants liste |
| 🟡 | Objets `MediaContent` recréés inline dans `.map()` | `HomeScreen.tsx:585-723` |
| 🟢 | Dizaines de `console.log` en production | Partout |

**Actions** :
- Scinder en 3-4 contextes (Auth, Theme, UI, Subscription)
- `useCallback` pour `toggleSidebarCollapse`
- `React.memo` sur composants de liste
- `useMemo` pour les transformations MediaContent

---

## 5. Images & Médias

| Sévérité | Problème | Fichier |
|---|---|---|
| 🔴 | **Pas de `loading="lazy"`** sur les images de carrousels | `HomeScreen.tsx`, `MediaCard.tsx` |
| 🟡 | Pas de `srcSet` / images responsive (backdrop 1920px+ sur mobile) | Global |
| 🟡 | Pas de fallback/placeholder sur erreur image | `MediaCard.tsx` |
| 🟡 | Hero charge 5+ images blurred en arrière-plan | `Hero.tsx:188-211` |
| 🟡 | PromotionPlayer et AdPlayer sont des doublons quasi-identiques | 173 lignes chacun |

**Actions** : `loading="lazy"` + `srcSet`, fusionner les 2 players pub, placeholder on error.

---

## 6. Build & Configuration

| Sévérité | Problème | Fichier |
|---|---|---|
| 🔴 | **CDN Tailwind en production** : `cdn.tailwindcss.com` génère les styles dans le navigateur (~300 KB JS + runtime) | `index.html:34-52` |
| 🟡 | Pas de `manualChunks` Vite (firebase+react+app = 1 chunk) | `vite.config.ts:43-49` |
| 🟡 | Tailwind `content` ne couvre pas `./components/` ni `./screens/` | `tailwind.config.js:4-7` |
| 🟡 | Pas de compression Brotli/Gzip | `vite.config.ts` |

**Actions** :
- **SUPPRIMER** le CDN Tailwind de `index.html` (Tailwind est déjà compilé par Vite/PostCSS)
- Configurer `manualChunks` (firebase, react-vendor)
- Corriger `content: ["./**/*.{js,ts,jsx,tsx}"]`
- Ajouter `vite-plugin-compression`

---

## 7. Sécurité & Fuites

| Sévérité | Problème | Fichier |
|---|---|---|
| 🟡 | `window.initializeMovieViews` exposé en production | `App.tsx:587-589` |
| 🟡 | Navigation tracking sans debounce (1 write Firestore par navigation) | `App.tsx:102-187` |
| 🟡 | Heartbeat 5 min = 1200 writes/h pour 100 utilisateurs | `AppContext.tsx:253-273` |
| 🟢 | `console.log` avec données sensibles (uid, isAdmin) | `AppContext.tsx:406-413` |

**Actions** : Retirer `window.init*`, debouncer le tracking, réduire heartbeat à 15 min, supprimer les logs sensibles.

---

## 8. Actions prioritaires (top 6)

| # | Action | Économie estimée |
|---|---|---|
| 1 | Supprimer CDN Tailwind de `index.html` | **-300 KB JS, -500ms FCP** |
| 2 | `React.lazy()` sur les 20 écrans | **-30-40% bundle initial** |
| 3 | Remplacer "fetch all + shuffle" par query ciblée | **-80% données Firestore** |
| 4 | Résoudre N+1 queries (batch `in`, Promise.all) | **-70% requêtes Firestore** |
| 5 | `loading="lazy"` sur toutes les images carrousel | **-60% images initiales** |
