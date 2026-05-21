# Audit des Polices - CMFI Replay

**Date:** 20 mai 2026  
**Contexte:** Application de streaming de documentaires et enseignements chrétiens

---

## Configuration Actuelle

### Police Principale
- **Nom:** Poppins
- **Catégorie:** Sans-serif géométrique
- **Variantes chargées:** 300 (Light), 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
- **Source:** Google Fonts
- **Utilisation:** Police par défaut pour tout l'interface (font-family: 'Poppins', sans-serif)

### Implémentation
```html
<!-- index.html -->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

```javascript
// tailwind.config.js
fontFamily: {
  sans: ['Poppins', 'sans-serif'],
}
```

---

## Analyse de Poppins

### Caractéristiques
- **Style:** Moderne, géométrique, arrondi
- **Origine:** Créée en 2014 par Indian Type Foundry
- **Inspiration:** Design inspiré par les années 1920 (géométrique)
- **Lisibilité:** Excellente sur écrans, bonne lisibilité à petite taille
- **Personnalité:** Amicale, accessible, contemporaine, tech-oriented

### Points Forts
✅ **Lisibilité optimale** - Très lisible sur tous les écrans et tailles  
✅ **Performance** - Font web optimisée, chargement rapide  
✅ **Versatilité** - 5 poids disponibles pour une bonne hiérarchie typographique  
✅ **Modernité** - Convient aux interfaces modernes et streaming  
✅ **Support international** - Bon support des caractères latins

### Points Faibles pour le Contexte Chrétien
❌ **Manque de chaleur** - Design géométrique peut paraître froid/industriel  
❌ **Absence de tradition** - Aucune connotation historique ou spirituelle  
❌ **Trop "tech"** - Associée aux startups et applications modernes génériques  
❌ **Manque de dignité** - Style arrondi peut manquer de solennité pour contenu religieux  
❌ **Identité faible** - Très utilisée, peu distinctive

---

## Adéquation au Contexte

### Type de Contenu
- Documentaires chrétiens
- Enseignements bibliques
- Séries spirituelles
- Podcasts religieux

### Public Cible
- Chrétiens pratiquants
- Chercheurs spirituels
- Public francophone international
- Divers tranches d'âge

### Analyse Contextuelle
| Aspect | Évaluation | Notes |
|--------|------------|-------|
| **Lisibilité** | ⭐⭐⭐⭐⭐ | Excellente pour le streaming |
| **Chaleur** | ⭐⭐ | Manque de chaleur humaine |
| **Tradition** | ⭐ | Aucune référence chrétienne |
| **Modernité** | ⭐⭐⭐⭐⭐ | Très moderne, peut-être trop |
| **Sérénité** | ⭐⭐ | Style dynamique, pas apaisant |
| **Autorité** | ⭐⭐⭐ | Correcte mais pas impressionnante |
| **Accessibilité** | ⭐⭐⭐⭐⭐ | Très accessible et lisible |

---

## Recommandations

### Option A: Conserver Poppins avec Améliorations
**Si vous voulez garder la modernité:**

1. **Ajouter une police serif pour les titres**
   - Utiliser Poppins pour le corps de texte (UI, boutons, navigation)
   - Ajouter une police serif élégante pour les titres principaux
   - Créer un contraste entre moderne (UI) et traditionnel (contenu)

2. **Polices serif recommandées:**
   - **Crimson Pro** - Moderne mais avec chaleur, excellente lisibilité
   - **Merriweather** - Conçue pour écrans, très lisible, sérénité
   - **Lora** - Élégante, contemporaine, chaleur subtile
   - **Playfair Display** - Très élégante, connotation premium

### Option B: Transition vers une Police Plus Chaleureuse
**Pour plus d'identité chrétienne:**

1. **Police principale recommandée:**
   - **Inter** - Plus humaine que Poppins, excellente lisibilité
   - **Source Sans Pro** - Plus douce, moins géométrique
   - **Nunito** - Plus arrondie et chaleureuse

2. **Combinaison avec serif:**
   - Inter + Crimson Pro (moderne + tradition)
   - Source Sans Pro + Merriweather (équilibré)

### Option C: Palette Typographique Chrétienne Premium
**Pour une identité forte:**

```
Titres Héro/H1: Playfair Display (700)
Titres H2/H3: Lora (600)
Corps de texte: Inter (400)
UI/Navigation: Inter (500/600)
Citations: Crimson Pro (italic)
```

---

## Exemple d'Implémentation Recommandée

### Configuration Tailwind
```javascript
// tailwind.config.js
fontFamily: {
  // Police principale pour UI et corps
  sans: ['Inter', 'sans-serif'],
  
  // Police pour les titres
  serif: ['Lora', 'serif'],
  
  // Police pour les titres héro
  display: ['Playfair Display', 'serif'],
}
```

### Chargement des Polices
```html
<!-- index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Lora:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
```

### Utilisation dans les Composants
```tsx
// Titres héro
<h1 className="font-display text-4xl md:text-6xl">CMFI Replay</h1>

// Titres de sections
<h2 className="font-serif text-2xl font-semibold">Enseignements</h2>

// Corps de texte
<p className="font-sans text-base">Description du contenu...</p>

// UI et navigation
<button className="font-sans font-medium">Connexion</button>
```

---

## Comparaison des Options

| Option | Modernité | Chaleur | Tradition | Lisibilité | Performance | Recommandation |
|--------|-----------|---------|-----------|------------|-------------|----------------|
| **Poppins actuel** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Inter + Lora** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Source Sans + Merriweather** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Playfair + Inter** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## Recommandation Finale

### 🏆 Choix Recommandé: Inter + Lora

**Raisons:**
1. **Inter** - Plus humaine et chaleureuse que Poppins, tout en restant moderne
2. **Lora** - Apporte chaleur, tradition et élégance aux titres
3. **Équilibre parfait** - Moderne pour l'UI, traditionnel pour le contenu
4. **Excellente lisibilité** - Les deux polices sont optimisées pour écrans
5. **Performance** - Chargement rapide, fichiers optimisés
6. **Identité chrétienne** - Lora évoque la sérénité et la tradition sans être archaïque

### Implémentation Prioritaire
1. Remplacer Poppins par Inter pour l'UI et le corps
2. Ajouter Lora pour les titres de sections et descriptions
3. Garder Poppins en fallback si nécessaire
4. Tester sur mobile et desktop
5. Ajuster les poids selon les besoins

---

## Prochaines Étapes

1. **Tester la combinaison Inter + Lora** sur une page pilote
2. **Recueillir les retours** des utilisateurs
3. **Ajuster les tailles et poids** selon le feedback
4. **Déployer progressivement** sur toutes les pages
5. **Documenter les guidelines** d'utilisation typographique

---

## Conclusion

Poppins est une police technique excellente mais manque d'âme pour une plateforme chrétienne. La combinaison **Inter + Lora** offrirait un équilibre parfait entre modernité (nécessaire pour le streaming) et chaleur (essentielle pour l'identité chrétienne), tout en maintenant une lisibilité optimale sur tous les appareils.
