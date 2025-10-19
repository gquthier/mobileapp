# 📖 End of Chapter Master Prompt - Enhanced with Style Imitation

**Version:** 2.0 (October 2025)
**Purpose:** Generate personalized chapter summaries that imitate user's speaking style
**Output:** Literary title, short summary, detailed description, keywords, challenges, growth, lessons learned

---

## 🎯 OBJECTIF PRINCIPAL

Analyser l'ensemble des transcriptions d'un chapitre de vie et générer:
1. **Titre littéraire** captivant (ai_title)
2. **Résumé court** engageant (ai_short_summary) - 2-3 phrases
3. **Description détaillée** narrative (ai_detailed_description) - 3-4 paragraphes
4. **Mots-clés** représentatifs (keywords) - 5-8 mots
5. **Défis rencontrés** (challenges) - maximum 5 phrases
6. **Croissance observée** (growth) - maximum 5 phrases
7. **Leçons apprises** (lessons_learned) - maximum 5 phrases

**IMPÉRATIF:** Tous les textes générés doivent IMITER EXACTEMENT le style de parole de l'utilisateur.

---

## 🗣️ IMITATION DU STYLE DE PAROLE

### Principe Fondamental
Avant de générer quoi que ce soit, tu dois:
1. **Analyser le style de parole** de l'utilisateur dans TOUTES les transcriptions
2. **Identifier les patterns linguistiques**: vocabulaire, tournures de phrases, idiomes, niveau de langue
3. **Reproduire ce style** dans TOUS les textes générés (titre, résumé, description, défis, croissance, leçons)

### Éléments à Analyser
- **Vocabulaire**: Mots courants vs sophistiqués, argot, expressions favorites
- **Ton**: Formel vs informel, émotionnel vs factuel, introspectif vs descriptif
- **Structure des phrases**: Courtes vs longues, simples vs complexes
- **Idiomes et expressions**: Phrases récurrentes, tics de langage
- **Niveau de langue**: Familier, courant, soutenu
- **Temps verbaux**: Présent, passé composé, imparfait (préférences)
- **Pronoms**: Je/J'ai, on, nous (usage et fréquence)

### Exemples de Reproduction de Style

**Style informel et enthousiaste:**
- ❌ "J'ai entrepris une profonde réflexion sur mes objectifs professionnels"
- ✅ "J'ai vraiment kiffé réfléchir à ce que je veux faire de ma vie pro"

**Style introspectif et nuancé:**
- ❌ "J'ai fait beaucoup de progrès cette semaine"
- ✅ "Je sens que quelque chose a bougé en moi, une sorte de déclic qui s'est fait doucement"

**Style factuel et direct:**
- ❌ "J'ai traversé une période de transformation personnelle intense"
- ✅ "J'ai changé pas mal de trucs dans ma routine et ça a marché"

---

## 📊 STRUCTURE DES DONNÉES D'ENTRÉE

### Données Reçues
```json
{
  "chapter": {
    "id": "uuid",
    "title": "Titre du chapitre",
    "description": "Description optionnelle",
    "started_at": "2025-01-15",
    "ended_at": "2025-02-28",
    "user_id": "uuid"
  },
  "transcriptions": [
    {
      "video_id": "uuid",
      "video_title": "Titre vidéo",
      "video_created_at": "2025-01-20T14:30:00Z",
      "transcript_text": "Texte complet de la transcription...",
      "segments": [
        {
          "start": 0.5,
          "end": 3.2,
          "text": "Segment de texte"
        }
      ],
      "highlights": [
        {
          "title": "Titre du highlight",
          "text": "Texte du highlight",
          "start_time": 67,
          "end_time": 89,
          "importance": 8
        }
      ]
    }
  ]
}
```

---

## 🎨 PROCESSUS DE GÉNÉRATION

### Partie 1: Analyse du Style de Parole
**OBLIGATOIRE - À faire en premier**

1. **Lecture complète** de toutes les transcriptions
2. **Identification des patterns**:
   - Relève les mots et expressions récurrents
   - Note le ton général (enthousiaste, réfléchi, anxieux, positif, etc.)
   - Analyse la structure des phrases (courtes/longues, simples/complexes)
   - Identifie le niveau de langue (familier, courant, soutenu)
3. **Création du profil linguistique**:
   - Vocabulaire type: [liste de mots caractéristiques]
   - Expressions favorites: [expressions récurrentes]
   - Structure de phrase: [pattern identifié]
   - Ton dominant: [description du ton]

### Partie 2: Génération du Titre Littéraire (ai_title)
**Style:** Utilise le vocabulaire et le ton de l'utilisateur

1. **Identification du thème central**:
   - Lis tous les highlights et transcriptions
   - Identifie le fil rouge qui relie toutes les vidéos
   - Note les émotions dominantes

2. **Création du titre**:
   - **Longueur**: 3-8 mots
   - **Style**: Utilise le niveau de langue de l'utilisateur
   - **Ton**: Reproduis le ton émotionnel observé dans les transcriptions
   - **Exemples adaptés au style**:
     - Style poétique: "Les Murmures d'un Hiver Introspectif"
     - Style direct: "Le Mois où J'ai Tout Remis en Question"
     - Style informel: "Ma Phase 'Fuck it, on y va'"

### Partie 3: Génération du Résumé Court (ai_short_summary)
**Style:** PREMIÈRE PERSONNE + style de parole de l'utilisateur

1. **Longueur**: 2-3 phrases maximum
2. **Contenu**:
   - Phrase 1: Contexte et émotion principale (avec le vocabulaire de l'utilisateur)
   - Phrase 2: Action/évolution clé (avec les tournures de phrases de l'utilisateur)
   - Phrase 3 (optionnelle): Impact ou réalisation (avec le ton de l'utilisateur)

3. **Exemples selon le style**:

**Style enthousiaste et familier:**
> "Ce mois-ci, j'ai vraiment kiffé explorer de nouvelles façons de bosser. J'ai testé plein de trucs différents et honnêtement, ça m'a ouvert les yeux sur ce qui me fait vraiment vibrer. Je me sens hyper motivé pour la suite!"

**Style introspectif et nuancé:**
> "J'ai passé ces semaines à observer mes patterns, à noter ce qui résonnait vraiment en moi. Quelque chose s'est dénoué doucement, une sorte de clarté qui émerge du brouillard. Je sens que je commence à mieux comprendre où je veux aller."

**Style factuel et direct:**
> "J'ai changé ma routine du matin et testé différentes méthodes de productivité. Les résultats sont là: je suis plus concentré et moins stressé. Ça valait le coup de faire ces ajustements."

### Partie 4: Génération de la Description Détaillée (ai_detailed_description)
**Style:** PREMIÈRE PERSONNE + style narratif de l'utilisateur

1. **Structure**: 3-4 paragraphes avec le style de l'utilisateur
2. **Paragraphe 1**: Introduction et contexte émotionnel (avec vocabulaire observé)
3. **Paragraphe 2**: Développement des événements clés (avec tournures de phrases observées)
4. **Paragraphe 3**: Réflexions et réalisations (avec le ton introspectif ou factuel observé)
5. **Paragraphe 4**: Conclusion et perspectives (avec expressions caractéristiques)

**Exemple complet - Style introspectif et poétique:**

> "Ce chapitre a commencé dans une sorte de brouillard intérieur. Je me sentais comme suspendu entre deux mondes, cherchant ma place sans vraiment savoir où regarder. Les premières vidéos témoignent de cette errance, de ces questions sans réponses qui tournaient en boucle.
>
> Puis, quelque chose s'est déplacé. Pas brutalement, mais par touches subtiles. J'ai commencé à voir des patterns dans mes comportements, des fils rouges qui reliaient mes doutes à des peurs plus anciennes. Chaque conversation enregistrée devenait un miroir un peu plus clair.
>
> La transformation s'est faite en douceur. J'ai appris à accueillir l'incertitude plutôt qu'à la combattre. Les highlights de cette période montrent une évolution dans mon rapport à moi-même: moins de jugement, plus de curiosité bienveillante. J'ai découvert que la croissance ne fait pas toujours de bruit.
>
> Aujourd'hui, je regarde ce chapitre comme une mue nécessaire. Je ne suis plus tout à fait la même personne, et ça me va. Les questions restent, mais elles ne me pèsent plus de la même manière. Je commence à entrevoir une forme de paix avec le fait de ne pas tout contrôler."

**Exemple complet - Style direct et factuel:**

> "J'ai démarré ce mois avec un objectif clair: améliorer ma routine et être plus productif. Les premières semaines, j'ai testé différentes méthodes de travail pour voir ce qui marchait vraiment.
>
> Les résultats ont été rapides. En changeant ma routine du matin et en structurant mieux mes journées, j'ai gagné environ 2 heures de concentration par jour. J'ai aussi noté une baisse significative de mon niveau de stress.
>
> Ce qui m'a le plus aidé, c'est de tracker mes habitudes quotidiennement. Ça m'a permis de voir concrètement ce qui fonctionnait et ce qui ne servait à rien. J'ai aussi compris que dormir 7h minimum changeait vraiment la donne.
>
> Au final, ce chapitre m'a prouvé qu'avec de la discipline et du suivi, on peut vraiment changer ses patterns. Je continue ces nouvelles habitudes parce qu'elles marchent. Point."

### Partie 5: Génération des Mots-clés (keywords)
**Style:** Neutre (liste de mots)

1. **Nombre**: 5-8 mots-clés
2. **Sources**:
   - Thèmes récurrents dans les transcriptions
   - Émotions dominantes
   - Actions principales
   - Concepts clés

3. **Format**: Tableau de strings
4. **Exemples**:
```json
["introspection", "créativité", "doute", "transformation", "routine", "mindfulness", "écriture"]
```

### Partie 6: Extraction des Défis (challenges)
**Style:** PREMIÈRE PERSONNE + style de parole de l'utilisateur

1. **Nombre**: Maximum 5 phrases (peut être moins si moins de défis identifiés)
2. **Contenu**: Défis majeurs rencontrés pendant le chapitre
3. **Format**: Chaque défi = 1 phrase concise (10-20 mots)
4. **Ton**: Utilise le vocabulaire et les expressions de l'utilisateur

**Exemples selon le style:**

**Style informel et direct:**
```json
{
  "challenges": [
    "J'ai vraiment galéré à me lever tôt le matin",
    "Arrêter de scroller mon phone avant de dormir, c'était chaud",
    "Me concentrer plus de 2h d'affilée sans perdre le focus"
  ]
}
```

**Style introspectif et nuancé:**
```json
{
  "challenges": [
    "Apprendre à accueillir l'incertitude sans vouloir tout contrôler",
    "Faire la paix avec mes parts d'ombre que je préférais ignorer",
    "Trouver l'équilibre entre ambition et acceptation de mes limites",
    "Lâcher prise sur le besoin constant de productivité"
  ]
}
```

**Style factuel et structuré:**
```json
{
  "challenges": [
    "Maintenir une routine stricte 7 jours sur 7",
    "Gérer les interruptions dans mes plages de deep work",
    "Équilibrer vie pro et temps pour moi",
    "Rester discipliné même les weekends"
  ]
}
```

### Partie 7: Extraction de la Croissance (growth)
**Style:** PREMIÈRE PERSONNE + style de parole de l'utilisateur

1. **Nombre**: Maximum 5 phrases (peut être moins si moins d'évolutions identifiées)
2. **Contenu**: Évolutions notables, progrès, changements positifs
3. **Format**: Chaque évolution = 1 phrase concise (10-20 mots)
4. **Ton**: Utilise le vocabulaire et les expressions de l'utilisateur

**Exemples selon le style:**

**Style enthousiaste et optimiste:**
```json
{
  "growth": [
    "J'ai kiffé découvrir que je suis capable de tenir une routine stricte",
    "Ma capacité de concentration a genre triplé en 3 semaines",
    "Je me sens tellement plus aligné avec mes vraies valeurs",
    "J'ai appris à dire non sans culpabiliser, c'est énorme"
  ]
}
```

**Style introspectif et poétique:**
```json
{
  "growth": [
    "J'ai appris à danser avec mes doutes plutôt qu'à les combattre",
    "Une forme de douceur envers moi-même a émergé doucement",
    "Je sens que je commence à habiter mon corps autrement",
    "Ma relation au temps s'est transformée, moins d'urgence, plus de présence"
  ]
}
```

**Style factuel et mesurable:**
```json
{
  "growth": [
    "J'ai augmenté mon temps de deep work de 2h à 5h par jour",
    "Mon niveau de stress a baissé de façon mesurable",
    "J'ai intégré 4 nouvelles habitudes qui tiennent depuis 3 semaines",
    "Ma qualité de sommeil s'est nettement améliorée"
  ]
}
```

### Partie 8: Extraction des Leçons Apprises (lessons_learned)
**Style:** PREMIÈRE PERSONNE + style de parole de l'utilisateur

1. **Nombre**: Maximum 5 phrases (peut être moins si moins de leçons identifiées)
2. **Contenu**: Leçons, insights, réalisations importantes
3. **Format**: Chaque leçon = 1 phrase concise (10-20 mots)
4. **Ton**: Utilise le vocabulaire et les expressions de l'utilisateur

**Exemples selon le style:**

**Style pragmatique et actionnable:**
```json
{
  "lessons_learned": [
    "La constance bat l'intensité à tous les coups",
    "Dormir 7h minimum, c'est non-négociable pour bien performer",
    "Tracker mes habitudes m'aide vraiment à rester discipliné",
    "Les petits changements répétés créent des grands résultats"
  ]
}
```

**Style philosophique et profond:**
```json
{
  "lessons_learned": [
    "La croissance n'est pas linéaire, elle ressemble plus à une spirale",
    "Accepter mes limites m'a rendu paradoxalement plus libre",
    "Le silence intérieur se cultive comme un jardin, avec patience",
    "Je n'ai pas besoin de tout comprendre pour avancer",
    "La vulnérabilité est une force, pas une faiblesse"
  ]
}
```

**Style émotionnel et personnel:**
```json
{
  "lessons_learned": [
    "J'ai le droit de changer d'avis sans me sentir coupable",
    "Mes émotions sont des messagères, pas des ennemies",
    "Demander de l'aide ne fait pas de moi quelqu'un de faible",
    "Je mérite de prendre soin de moi autant que je prends soin des autres"
  ]
}
```

---

## 📤 FORMAT DE SORTIE

### Structure JSON Complète
```json
{
  "ai_title": "Titre littéraire captivant (3-8 mots, style utilisateur)",
  "ai_short_summary": "Résumé court en 2-3 phrases (première personne, style utilisateur)",
  "ai_detailed_description": "Description détaillée en 3-4 paragraphes (première personne, style narratif utilisateur)",
  "keywords": ["mot1", "mot2", "mot3", "mot4", "mot5"],
  "challenges": [
    "Phrase 1 décrivant un défi majeur (style utilisateur)",
    "Phrase 2 décrivant un autre défi (style utilisateur)",
    "..."
  ],
  "growth": [
    "Phrase 1 décrivant une évolution notable (style utilisateur)",
    "Phrase 2 décrivant une autre évolution (style utilisateur)",
    "..."
  ],
  "lessons_learned": [
    "Phrase 1 décrivant une leçon apprise (style utilisateur)",
    "Phrase 2 décrivant une autre leçon (style utilisateur)",
    "..."
  ]
}
```

### Exemple Complet de Sortie

**Profil linguistique identifié:** Style introspectif, vocabulaire nuancé, ton contemplatif, phrases moyennes à longues, niveau de langue courant-soutenu

```json
{
  "ai_title": "Les Murmures d'un Hiver Introspectif",
  "ai_short_summary": "J'ai passé ces semaines à observer mes patterns, à noter ce qui résonnait vraiment en moi. Quelque chose s'est dénoué doucement, une sorte de clarté qui émerge du brouillard. Je sens que je commence à mieux comprendre où je veux aller.",
  "ai_detailed_description": "Ce chapitre a commencé dans une sorte de brouillard intérieur. Je me sentais comme suspendu entre deux mondes, cherchant ma place sans vraiment savoir où regarder. Les premières vidéos témoignent de cette errance, de ces questions sans réponses qui tournaient en boucle.\n\nPuis, quelque chose s'est déplacé. Pas brutalement, mais par touches subtiles. J'ai commencé à voir des patterns dans mes comportements, des fils rouges qui reliaient mes doutes à des peurs plus anciennes. Chaque conversation enregistrée devenait un miroir un peu plus clair.\n\nLa transformation s'est faite en douceur. J'ai appris à accueillir l'incertitude plutôt qu'à la combattre. Les highlights de cette période montrent une évolution dans mon rapport à moi-même: moins de jugement, plus de curiosité bienveillante. J'ai découvert que la croissance ne fait pas toujours de bruit.\n\nAujourd'hui, je regarde ce chapitre comme une mue nécessaire. Je ne suis plus tout à fait la même personne, et ça me va. Les questions restent, mais elles ne me pèsent plus de la même manière. Je commence à entrevoir une forme de paix avec le fait de ne pas tout contrôler.",
  "keywords": ["introspection", "transformation", "doute", "clarté", "patterns", "croissance", "acceptance"],
  "challenges": [
    "Apprendre à accueillir l'incertitude sans vouloir tout contrôler",
    "Faire la paix avec mes parts d'ombre que je préférais ignorer",
    "Trouver l'équilibre entre ambition et acceptation de mes limites",
    "Lâcher prise sur le besoin constant de productivité"
  ],
  "growth": [
    "J'ai appris à danser avec mes doutes plutôt qu'à les combattre",
    "Une forme de douceur envers moi-même a émergé doucement",
    "Je sens que je commence à habiter mon corps autrement",
    "Ma relation au temps s'est transformée, moins d'urgence, plus de présence"
  ],
  "lessons_learned": [
    "La croissance n'est pas linéaire, elle ressemble plus à une spirale",
    "Accepter mes limites m'a rendu paradoxalement plus libre",
    "Le silence intérieur se cultive comme un jardin, avec patience",
    "Je n'ai pas besoin de tout comprendre pour avancer",
    "La vulnérabilité est une force, pas une faiblesse"
  ]
}
```

---

## ✅ CHECKLIST DE VALIDATION

Avant de renvoyer le JSON final, vérifie:

### Style et Ton
- [ ] J'ai analysé le style de parole de l'utilisateur dans TOUTES les transcriptions
- [ ] J'ai identifié le vocabulaire, les expressions et le ton caractéristiques
- [ ] TOUS les textes générés utilisent le style de l'utilisateur (pas un style générique)
- [ ] Le titre reflète le ton émotionnel observé dans les transcriptions
- [ ] Le résumé court utilise les tournures de phrases de l'utilisateur
- [ ] La description détaillée reproduit le niveau de langue de l'utilisateur
- [ ] Les défis, croissance et leçons utilisent le vocabulaire exact de l'utilisateur

### Contenu et Structure
- [ ] Le titre est captivant et représente le thème central (3-8 mots)
- [ ] Le résumé court fait 2-3 phrases en PREMIÈRE PERSONNE
- [ ] La description détaillée fait 3-4 paragraphes en PREMIÈRE PERSONNE
- [ ] Il y a 5-8 mots-clés pertinents
- [ ] J'ai identifié 1-5 défis majeurs (pas de remplissage artificiel)
- [ ] J'ai identifié 1-5 évolutions notables (basées sur les transcriptions)
- [ ] J'ai identifié 1-5 leçons apprises (insights réels, pas génériques)

### Qualité et Précision
- [ ] Tous les éléments sont basés sur les transcriptions réelles
- [ ] Aucun contenu générique ou inventé
- [ ] Le JSON est bien formaté et valide
- [ ] Chaque phrase de défi/croissance/leçon fait 10-20 mots
- [ ] Le ton est cohérent à travers tous les champs
- [ ] Les émotions reflètent fidèlement le contenu des vidéos

### Format Technique
- [ ] Le JSON contient exactement 7 champs (ai_title, ai_short_summary, ai_detailed_description, keywords, challenges, growth, lessons_learned)
- [ ] Les tableaux challenges/growth/lessons_learned contiennent maximum 5 éléments chacun
- [ ] Aucun caractère spécial non échappé dans le JSON
- [ ] Les sauts de ligne dans ai_detailed_description utilisent `\n`

---

## 🚨 ERREURS FRÉQUENTES À ÉVITER

### ❌ Style Générique au Lieu du Style de l'Utilisateur
**Mauvais:**
> "J'ai entrepris une profonde réflexion sur mes objectifs professionnels et personnels au cours de cette période transformative."

**Bon (si l'utilisateur parle de façon informelle):**
> "J'ai vraiment kiffé réfléchir à ce que je veux faire de ma vie, autant au boulot que perso."

### ❌ Remplissage Artificiel des Tableaux
**Mauvais:** Forcer 5 éléments dans challenges/growth/lessons même s'il n'y en a que 2-3 de pertinents

**Bon:** Mettre seulement les défis/évolutions/leçons réellement identifiés dans les transcriptions (peut être 2, 3 ou 5)

### ❌ Leçons Génériques et Banales
**Mauvais:**
```json
{
  "lessons_learned": [
    "Il faut toujours croire en soi",
    "La vie est faite de hauts et de bas",
    "Il ne faut jamais abandonner"
  ]
}
```

**Bon (basé sur transcriptions réelles):**
```json
{
  "lessons_learned": [
    "Dormir 7h minimum, c'est non-négociable pour bien performer",
    "Tracker mes habitudes m'aide vraiment à rester discipliné",
    "La vulnérabilité dans mes relations m'a rapproché des gens"
  ]
}
```

### ❌ Ignorer le Contexte Temporel
**Mauvais:** Ne pas mentionner la durée du chapitre ou les dates

**Bon:** Intégrer subtilement la période dans la narration
> "Ces trois semaines de janvier ont été..."
> "Entre début février et mi-mars, j'ai..."

### ❌ Ton Inconsistant Entre les Sections
**Mauvais:** Titre poétique + résumé factuel + description enthousiaste + leçons pessimistes

**Bon:** Maintenir le même ton et niveau de langue à travers TOUS les champs générés

---

## 🎯 MÉTHODOLOGIE COMPLÈTE

### Étape 1: Analyse du Style (OBLIGATOIRE - 15-20% du temps)
1. Lis TOUTES les transcriptions en entier
2. Note le vocabulaire récurrent (au moins 10 mots/expressions caractéristiques)
3. Identifie le ton dominant (échelle: très factuel → très émotionnel)
4. Analyse la structure des phrases (courtes/moyennes/longues)
5. Détermine le niveau de langue (familier/courant/soutenu)
6. Crée un profil linguistique mental de l'utilisateur

### Étape 2: Identification du Thème Central (10% du temps)
1. Relis les highlights de toutes les vidéos
2. Cherche le fil rouge qui relie toutes les expériences
3. Note les 3-4 thèmes principaux
4. Identifie le thème dominant qui englobera les autres

### Étape 3: Génération du Titre (5% du temps)
1. Utilise le vocabulaire identifié à l'étape 1
2. Capture le thème central de l'étape 2
3. Reproduis le ton émotionnel de l'utilisateur
4. Vise 3-8 mots percutants

### Étape 4: Rédaction du Résumé Court (10% du temps)
1. Phrase 1: Contexte + émotion (avec vocabulaire utilisateur)
2. Phrase 2: Action/évolution clé (avec tournures utilisateur)
3. Phrase 3 (opt): Impact/réalisation (avec ton utilisateur)
4. Vérifie: PREMIÈRE PERSONNE + style cohérent

### Étape 5: Rédaction de la Description Détaillée (20% du temps)
1. Paragraphe 1: Introduction émotionnelle (style utilisateur)
2. Paragraphe 2: Développement événements (style utilisateur)
3. Paragraphe 3: Réflexions/réalisations (style utilisateur)
4. Paragraphe 4: Conclusion/perspectives (style utilisateur)
5. Vérifie: PREMIÈRE PERSONNE + narratif + style cohérent

### Étape 6: Extraction des Défis (10% du temps)
1. Relis les transcriptions en cherchant les difficultés mentionnées
2. Identifie 1-5 défis majeurs (pas les petits obstacles)
3. Formule chaque défi en 1 phrase (10-20 mots)
4. Utilise EXACTEMENT le vocabulaire et le ton de l'utilisateur
5. Vérifie: PREMIÈRE PERSONNE + style cohérent

### Étape 7: Extraction de la Croissance (10% du temps)
1. Relis les transcriptions en cherchant les évolutions positives
2. Identifie 1-5 changements/progrès notables
3. Formule chaque évolution en 1 phrase (10-20 mots)
4. Utilise EXACTEMENT le vocabulaire et le ton de l'utilisateur
5. Vérifie: PREMIÈRE PERSONNE + style cohérent

### Étape 8: Extraction des Leçons (10% du temps)
1. Relis les transcriptions en cherchant les insights/réalisations
2. Identifie 1-5 leçons vraiment apprises (évite le générique)
3. Formule chaque leçon en 1 phrase (10-20 mots)
4. Utilise EXACTEMENT le vocabulaire et le ton de l'utilisateur
5. Vérifie: PREMIÈRE PERSONNE + style cohérent

### Étape 9: Sélection des Mots-clés (5% du temps)
1. Liste 15-20 mots-clés potentiels
2. Sélectionne les 5-8 plus représentatifs
3. Mélange thèmes, émotions, et actions
4. Vérifie: Chaque mot apparaît dans les transcriptions

### Étape 10: Validation Finale (10% du temps)
1. Relis TOUS les champs générés
2. Vérifie la cohérence du style à travers TOUS les champs
3. Confirme que TOUT est basé sur les transcriptions réelles
4. Valide le format JSON
5. Applique la checklist complète

---

## 📚 EXEMPLES COMPLETS PAR TYPE DE STYLE

### Exemple 1: Style Introspectif et Poétique

**Profil linguistique:**
- Vocabulaire: nuancé, métaphorique ("brouillard", "danser", "murmures")
- Ton: contemplatif, introspectif, doux
- Phrases: moyennes à longues, structure complexe
- Niveau: courant-soutenu
- Expressions: "quelque chose s'est déplacé", "par touches subtiles", "forme de..."

**Output:**
```json
{
  "ai_title": "Les Murmures d'un Hiver Introspectif",
  "ai_short_summary": "J'ai passé ces semaines à observer mes patterns, à noter ce qui résonnait vraiment en moi. Quelque chose s'est dénoué doucement, une sorte de clarté qui émerge du brouillard. Je sens que je commence à mieux comprendre où je veux aller.",
  "ai_detailed_description": "[Voir exemple complet ci-dessus dans Partie 4]",
  "keywords": ["introspection", "transformation", "doute", "clarté", "patterns", "croissance", "acceptance"],
  "challenges": [
    "Apprendre à accueillir l'incertitude sans vouloir tout contrôler",
    "Faire la paix avec mes parts d'ombre que je préférais ignorer",
    "Trouver l'équilibre entre ambition et acceptation de mes limites"
  ],
  "growth": [
    "J'ai appris à danser avec mes doutes plutôt qu'à les combattre",
    "Une forme de douceur envers moi-même a émergé doucement",
    "Ma relation au temps s'est transformée, moins d'urgence, plus de présence"
  ],
  "lessons_learned": [
    "La croissance n'est pas linéaire, elle ressemble plus à une spirale",
    "Accepter mes limites m'a rendu paradoxalement plus libre",
    "Le silence intérieur se cultive comme un jardin, avec patience"
  ]
}
```

### Exemple 2: Style Direct et Factuel

**Profil linguistique:**
- Vocabulaire: simple, concret, mesurable
- Ton: pragmatique, factuel, orienté résultats
- Phrases: courtes à moyennes, structure simple
- Niveau: courant-familier
- Expressions: "ça a marché", "Point.", "Les résultats sont là"

**Output:**
```json
{
  "ai_title": "Le Mois où J'ai Optimisé Ma Vie",
  "ai_short_summary": "J'ai changé ma routine du matin et testé différentes méthodes de productivité. Les résultats sont là: je suis plus concentré et moins stressé. Ça valait le coup de faire ces ajustements.",
  "ai_detailed_description": "[Voir exemple complet ci-dessus dans Partie 4]",
  "keywords": ["routine", "productivité", "discipline", "résultats", "concentration", "optimisation"],
  "challenges": [
    "Maintenir une routine stricte 7 jours sur 7",
    "Gérer les interruptions dans mes plages de deep work",
    "Rester discipliné même les weekends"
  ],
  "growth": [
    "J'ai augmenté mon temps de deep work de 2h à 5h par jour",
    "Mon niveau de stress a baissé de façon mesurable",
    "Ma qualité de sommeil s'est nettement améliorée"
  ],
  "lessons_learned": [
    "La constance bat l'intensité à tous les coups",
    "Dormir 7h minimum, c'est non-négociable pour bien performer",
    "Tracker mes habitudes m'aide vraiment à rester discipliné"
  ]
}
```

### Exemple 3: Style Enthousiaste et Informel

**Profil linguistique:**
- Vocabulaire: familier, expressif ("kiffer", "hyper", "genre")
- Ton: enthousiaste, optimiste, énergique
- Phrases: moyennes, structure simple avec exclamations
- Niveau: familier-courant
- Expressions: "vraiment kiffé", "c'est énorme", "ça m'a ouvert les yeux"

**Output:**
```json
{
  "ai_title": "Ma Phase 'Fuck it, On Y Va!'",
  "ai_short_summary": "Ce mois-ci, j'ai vraiment kiffé explorer de nouvelles façons de bosser. J'ai testé plein de trucs différents et honnêtement, ça m'a ouvert les yeux sur ce qui me fait vraiment vibrer. Je me sens hyper motivé pour la suite!",
  "ai_detailed_description": "J'ai démarré ce chapitre avec une envie de changement. Genre, vraiment. J'en avais marre de faire toujours la même chose et de me sentir coincé dans ma routine. Donc j'ai décidé de tout remettre en question et de tester des nouvelles approches.\n\nLes premières semaines, j'ai un peu tâtonné. J'ai essayé des méthodes de productivité différentes, changé mes horaires, bougé mon setup de travail. Parfois ça marchait, parfois non, mais j'apprenais à chaque fois. C'était hyper stimulant de sortir de ma zone de confort comme ça.\n\nEt puis boom, j'ai trouvé un rythme qui me correspond vraiment. Je me lève plus tôt, je bosse par blocs de 90 minutes, et je prends des vraies pauses. Résultat: je suis genre trois fois plus productif et surtout, je kiffe ce que je fais. C'est fou comme des petits ajustements peuvent tout changer.\n\nAujourd'hui, je regarde ce chapitre et je me dis que j'ai vraiment évolué. Je me connais mieux, je sais ce qui me fait vibrer, et j'ai plus peur d'expérimenter. La suite s'annonce ouf!",
  "keywords": ["changement", "expérimentation", "productivité", "motivation", "zone-confort", "évolution"],
  "challenges": [
    "J'ai vraiment galéré à me lever tôt le matin",
    "Arrêter de scroller mon phone avant de dormir, c'était chaud",
    "Me concentrer plus de 2h d'affilée sans perdre le focus"
  ],
  "growth": [
    "J'ai kiffé découvrir que je suis capable de tenir une routine stricte",
    "Ma capacité de concentration a genre triplé en 3 semaines",
    "Je me sens tellement plus aligné avec mes vraies valeurs"
  ],
  "lessons_learned": [
    "Sortir de sa zone de confort, c'est inconfortable mais ça vaut le coup",
    "J'ai le droit de changer d'avis sans me sentir coupable",
    "Les petits changements répétés créent des grands résultats"
  ]
}
```

---

## 🔄 WORKFLOW COMPLET

```
1. RÉCEPTION DES DONNÉES
   ↓
2. ANALYSE COMPLÈTE DU STYLE (obligatoire)
   - Lire toutes les transcriptions
   - Identifier vocabulaire, ton, structure, niveau de langue
   - Créer profil linguistique
   ↓
3. IDENTIFICATION DES THÈMES
   - Fil rouge principal
   - Thèmes secondaires
   ↓
4. GÉNÉRATION AVEC STYLE
   - Titre (style utilisateur)
   - Résumé court (style utilisateur, première personne)
   - Description détaillée (style utilisateur, première personne)
   ↓
5. EXTRACTION DES INSIGHTS
   - Défis (1-5, style utilisateur, première personne)
   - Croissance (1-5, style utilisateur, première personne)
   - Leçons (1-5, style utilisateur, première personne)
   ↓
6. MOTS-CLÉS
   - Sélection 5-8 mots
   ↓
7. VALIDATION
   - Checklist complète
   - Cohérence du style
   - Format JSON
   ↓
8. SORTIE JSON FINALE
```

---

**Version:** 2.0
**Dernière mise à jour:** Octobre 2025
**Auteur:** Guillaume Quthier
**Modèle recommandé:** GPT-4.1 Nano ou supérieur
**Utilisation:** Edge Function Supabase - End of Chapter Analysis
