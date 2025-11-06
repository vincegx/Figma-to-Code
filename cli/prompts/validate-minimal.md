---
description: Validation visuelle Figma → Web
---

# Validation - {{test_id}}

## Tâche

1. **Lire les screenshots**
   - `src/generated/tests/{{test_id}}/img/figma-screenshot.png` (référence Figma)
   - `src/generated/tests/{{test_id}}/{{web_screenshot}}` (rendu actuel à valider)

2. **Comparer pixel par pixel - Checklist complète**

**Couleurs:**
- Backgrounds, text, borders identiques?
- Gradients: angles, couleurs, stops?

**Espacements:**
- Padding, margin, gap identiques?

**Typographie:**
- Font: family, size, weight, line-height?
- Letter spacing, text transform?

**Effets visuels:**
- Shadows: offset (x,y), blur, spread, couleur?
- Opacity, blend modes?

**Layout:**
- Positioning (absolute/relative/flex)?
- Dimensions (width, height)?
- Z-index correct?

**Images & Assets:**
- Toutes chargées? Positions/sizes correctes?

**Borders:**
- Width, radius, style identiques?
- Stroke alignment (inside/outside/center)?

3. **SI différences détectées**

**A. Identifier précisément:**
- **Où:** Quel élément visuel
- **Quoi:** Quelle propriété (ex: gradient angle)
- **Figma:** Valeur attendue (ex: 47deg)
- **Web:** Valeur actuelle (ex: 45deg)

**B. Corriger Component-final.tsx:**
- Lire le fichier
- Utiliser Edit tool pour corriger TOUTES les différences détectées
- Modifier UNIQUEMENT ce qui est nécessaire pour atteindre 100% de fidélité

**Corrections à appliquer (tout automatiquement):**
- Tailwind classes (colors, spacing, fonts, shadows, etc.)
- Inline styles CSS (gradients, custom values)
- Attributs HTML (width, height)
- Structure JSX/HTML si nécessaire (ajouter/supprimer éléments)
- Logique TypeScript si nécessaire (conditions, boucles)

4. **Afficher résumé**

Format de sortie :
```
VALIDATION_CORRECTIONS_START
1. [Élément] - [Propriété] - [Avant → Après]
2. [Élément] - [Propriété] - [Avant → Après]
VALIDATION_CORRECTIONS_END
```

Si aucune différence :
```
VALIDATION_CORRECTIONS_START
Aucune correction - Fidélité 100%
VALIDATION_CORRECTIONS_END
```

---

## Notes importantes

- **VALIDATION ITÉRATIVE:** Ce prompt peut être exécuté plusieurs fois (max 2 itérations)
- **PRÉCISION:** Sois très précis (ex: "gradient 45deg → 47deg", pas "gradient incorrect")
- **NE PAS REGÉNÉRER:** Ne relance PAS capture-screenshot.js (géré par bash)
- **CORRECTIONS CIBLÉES:** Modifie UNIQUEMENT ce qui est nécessaire (Tailwind/CSS/HTML)
- **RÉFÉRENCE:** Figma = vérité absolue, Web doit être identique à 100%
- **FORMAT:** Utilise Edit tool (pas Write), préserve la structure existante
- **ITÉRATION 2:** Si c'est la 2e itération, {{web_screenshot}} sera web-render-final.png
