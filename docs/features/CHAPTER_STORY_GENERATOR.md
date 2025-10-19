# Chapter Story Generator - Documentation Complète

## 🎯 Vue d'Ensemble

Le **Chapter Story Generator** est un système d'IA qui transforme automatiquement les transcriptions vidéo d'un chapitre en un récit autobiographique complet, comprenant :

1. **Titre littéraire** (3 mots maximum) - Évocateur et axé sur la croissance
2. **Résumé court** (1 phrase) - L'idée principale et le défi surmonté
3. **Description détaillée** (10 phrases max) - Récit autobiographique en première personne
4. **Mots-clés** (10 maximum) - Termes simples représentatifs du chapitre

## 🏗️ Architecture du Système

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP (React Native)                 │
├─────────────────────────────────────────────────────────────┤
│  ChapterDetailScreen                                         │
│    └─> chapterStoryService.extractChapterStory()           │
│                                                              │
│  chapterStoryService.ts                                      │
│    ├─> extractChapterStory(chapterId)                      │
│    ├─> extractChapterStoryIfNeeded(chapterId)              │
│    └─> shouldRegenerateStory(chapterId)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP POST
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  SUPABASE EDGE FUNCTIONS                     │
├─────────────────────────────────────────────────────────────┤
│  extract-chapter-keywords/index.ts                           │
│    1. Récupère le chapitre et ses vidéos                    │
│    2. Récupère toutes les transcriptions complétées         │
│    3. Appelle OpenAI Responses API avec le prompt          │
│    4. Parse et valide la réponse JSON                       │
│    5. Met à jour la table chapters via RPC                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ OpenAI Responses API
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    OPENAI GPT-4.1 NANO                       │
├─────────────────────────────────────────────────────────────┤
│  Prompt: "Chapter Story Generator"                          │
│  Input: Chapter metadata + video transcriptions             │
│  Output: {                                                   │
│    chapter_title: "...",                                    │
│    short_summary: "...",                                    │
│    detailed_description: "...",                             │
│    keywords: [...],                                         │
│    ...                                                      │
│  }                                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Stockage dans DB
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  SUPABASE POSTGRES DB                        │
├─────────────────────────────────────────────────────────────┤
│  chapters table                                              │
│    ├─ keywords (JSONB)                                      │
│    ├─ ai_title (TEXT)                                       │
│    ├─ ai_short_summary (TEXT)                               │
│    ├─ ai_detailed_description (TEXT)                        │
│    └─ ai_extracted_at (TIMESTAMP)                           │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Structure des Fichiers

### 1. Documentation IA
```
docs/ai-assistants/chapter-keywords-extractor.md
```
- **Rôle** : Prompt engineering complet pour l'assistant IA
- **Contenu** :
  - Instructions détaillées pour générer titre, résumé, description, mots-clés
  - Exemples concrets avec INPUT/OUTPUT JSON
  - Règles strictes et checklists de validation

### 2. Migration Database
```
supabase/migrations/016_add_chapter_keywords.sql
```
- **Rôle** : Ajoute les colonnes AI à la table `chapters`
- **Colonnes ajoutées** :
  - `keywords` (JSONB) - Array de mots-clés
  - `ai_title` (TEXT) - Titre littéraire
  - `ai_short_summary` (TEXT) - Résumé court
  - `ai_detailed_description` (TEXT) - Description détaillée
  - `ai_extracted_at` (TIMESTAMP) - Date d'extraction
- **Fonction SQL** : `update_chapter_ai_content()` pour mise à jour atomique

### 3. Edge Function
```
supabase/functions/extract-chapter-keywords/index.ts
```
- **Rôle** : Orchestration de l'extraction IA
- **Étapes** :
  1. Validation du `chapterId`
  2. Récupération des vidéos et transcriptions
  3. Appel OpenAI avec le prompt spécialisé
  4. Validation et nettoyage des résultats
  5. Mise à jour de la base de données

### 4. Service TypeScript
```
src/services/chapterStoryService.ts
```
- **Rôle** : Interface app → Edge Function
- **Fonctions principales** :
  - `extractChapterStory(chapterId)` - Extraction forcée
  - `extractChapterStoryIfNeeded(chapterId)` - Extraction intelligente
  - `shouldRegenerateStory(chapterId)` - Check si régénération nécessaire
  - `getChapterWithStory(chapterId)` - Récupération des données existantes

### 5. Types TypeScript
```
src/lib/supabase.ts
```
- **Rôle** : Types TypeScript pour type-safety
- **Interface `Chapter`** mise à jour avec :
  - `keywords?: string[] | null`
  - `ai_title?: string | null`
  - `ai_short_summary?: string | null`
  - `ai_detailed_description?: string | null`
  - `ai_extracted_at?: string | null`

## 🚀 Déploiement

### Étape 1 : Appliquer la Migration Database

```bash
cd mobileapp
npx supabase db push
```

Cela va créer les nouvelles colonnes dans la table `chapters` et la fonction SQL `update_chapter_ai_content`.

### Étape 2 : Déployer l'Edge Function

```bash
npx supabase functions deploy extract-chapter-keywords
```

**Important** : Assurez-vous que la variable d'environnement `OPENAI_API_KEY` est configurée dans Supabase :

```bash
npx supabase secrets set OPENAI_API_KEY=sk-...
```

### Étape 3 : Créer le Prompt OpenAI

Le prompt ID utilisé dans l'Edge Function est : `pmpt_68db8a9f4c7d91849d2c7f8b5e6a9c201dbf14522e68fed`

**Action requise** : Créer ce prompt dans la console OpenAI avec le contenu de `docs/ai-assistants/chapter-keywords-extractor.md`

## 💻 Utilisation dans l'App

### Exemple 1 : Extraction Basique

```typescript
import { extractChapterStory } from '../services/chapterStoryService';

// Dans ChapterDetailScreen
const handleGenerateStory = async () => {
  setIsGenerating(true);

  const result = await extractChapterStory(chapterId);

  if (result.success) {
    console.log('✅ Histoire générée !');
    console.log(`Titre: ${result.chapter_title}`);
    console.log(`Résumé: ${result.short_summary}`);
    console.log(`Keywords: ${result.keywords?.join(', ')}`);

    // Recharger le chapitre pour afficher le nouveau contenu
    await loadChapterData();
  } else {
    Alert.alert('Erreur', result.error || 'Échec de la génération');
  }

  setIsGenerating(false);
};
```

### Exemple 2 : Extraction Intelligente (Évite Régénération Inutile)

```typescript
import { extractChapterStoryIfNeeded } from '../services/chapterStoryService';

// Dans ChapterDetailScreen useEffect
useEffect(() => {
  const initChapterStory = async () => {
    const result = await extractChapterStoryIfNeeded(chapterId);

    if (result.success && result.chapter_title) {
      // Histoire disponible (existante ou nouvellement générée)
      setChapterTitle(result.chapter_title);
      setSummary(result.short_summary);
      setDescription(result.detailed_description);
      setKeywords(result.keywords);
    }
  };

  initChapterStory();
}, [chapterId]);
```

### Exemple 3 : Check Manuel de Régénération

```typescript
import { shouldRegenerateStory } from '../services/chapterStoryService';

const checkStoryStatus = async () => {
  const needsUpdate = await shouldRegenerateStory(chapterId);

  if (needsUpdate) {
    // Afficher un badge "Update available" dans l'UI
    setShowUpdateBadge(true);
  }
};
```

## 🎨 Intégration UI (ChapterDetailScreen)

### Option 1 : Affichage du Titre AI

```typescript
// Afficher le titre AI au lieu du titre manuel
<Text style={styles.chapterTitle}>
  {chapter.ai_title || chapter.title}
</Text>

{chapter.ai_title && (
  <Text style={styles.aiGeneratedBadge}>✨ Titre généré par IA</Text>
)}
```

### Option 2 : Section Description Autobiographique

```typescript
{chapter.ai_detailed_description && (
  <View style={styles.storySection}>
    <Text style={styles.sectionTitle}>Mon Histoire</Text>

    {/* Résumé court */}
    <Text style={styles.shortSummary}>
      {chapter.ai_short_summary}
    </Text>

    {/* Description détaillée (collapsible) */}
    <TouchableOpacity onPress={() => setShowFullStory(!showFullStory)}>
      <Text style={styles.detailedDescription} numberOfLines={showFullStory ? undefined : 3}>
        {chapter.ai_detailed_description}
      </Text>
      <Text style={styles.readMore}>
        {showFullStory ? 'Voir moins' : 'Lire plus...'}
      </Text>
    </TouchableOpacity>
  </View>
)}
```

### Option 3 : Mots-clés avec Pills (Existant)

```typescript
{/* Keywords pills - déjà implémenté aux lignes 575-613 */}
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {chapter.keywords?.map((keyword, index) => (
    <View key={index} style={styles.keywordPill}>
      <Icon name={getIconForKeyword(keyword)} size={16} />
      <Text style={styles.keywordText}>{keyword}</Text>
    </View>
  ))}
</ScrollView>
```

### Option 4 : Bouton de Génération

```typescript
<TouchableOpacity
  style={styles.generateButton}
  onPress={handleGenerateStory}
  disabled={isGenerating}
>
  {isGenerating ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <>
      <Icon name="sparkles" size={20} color="#fff" />
      <Text style={styles.generateButtonText}>
        Générer l'histoire du chapitre
      </Text>
    </>
  )}
</TouchableOpacity>
```

## ⚙️ Configuration et Paramètres

### Régénération Automatique

Le système régénère automatiquement si :

1. **Aucun contenu AI n'existe** - Première génération
2. **Nouvelles vidéos ajoutées** - Depuis la dernière extraction
3. **Extraction ancienne** - Plus de 7 jours

Pour changer la durée de validité (7 jours par défaut) :

```typescript
// Dans chapterStoryService.ts
const daysSinceExtraction = (Date.now() - extractionDate.getTime()) / (1000 * 60 * 60 * 24);

if (daysSinceExtraction > 7) { // ← Modifier ici (ex: 30 jours)
  return true;
}
```

### Prompt ID OpenAI

Si vous créez un nouveau prompt OpenAI, mettez à jour l'ID dans l'Edge Function :

```typescript
// Dans supabase/functions/extract-chapter-keywords/index.ts
const promptId = "pmpt_VOTRE_NOUVEAU_PROMPT_ID"; // ← Modifier ici
const promptVersion = "1";
```

## 🧪 Tests

### Test 1 : Chapitre avec 50 Vidéos

```bash
# Via console Supabase
SELECT * FROM update_chapter_ai_content(
  'chapter-uuid-here',
  '["Keyword1", "Keyword2"]'::jsonb,
  'Titre Test',
  'Résumé de test en une phrase.',
  'Description détaillée en première personne...'
);
```

### Test 2 : Via l'App

```typescript
// Dans ChapterDetailScreen
const testExtraction = async () => {
  console.log('🧪 Test: Extraction de l\'histoire du chapitre...');

  const result = await extractChapterStory('your-chapter-id');

  console.log('📊 Résultats:', {
    success: result.success,
    title: result.chapter_title,
    summaryLength: result.short_summary?.length,
    descriptionLength: result.detailed_description?.length,
    keywordsCount: result.keywords?.length,
    confidence: result.confidence_score
  });
};
```

### Test 3 : Vérification des Contraintes

```typescript
// Valider que le titre a max 3 mots
const titleWords = result.chapter_title.split(/\s+/);
console.assert(titleWords.length <= 3, 'Le titre doit avoir max 3 mots');

// Valider que les keywords sont des mots simples
result.keywords.forEach(kw => {
  console.assert(!kw.includes(' '), `"${kw}" n'est pas un mot simple`);
});

// Valider que la description est en première personne
const hasFirsPersonFR = /\b(je|j'|ma|mon|mes)\b/i.test(result.detailed_description);
const hasFirstPersonEN = /\b(I |I'|my |me )\b/i.test(result.detailed_description);
console.assert(
  hasFirsPersonFR || hasFirstPersonEN,
  'La description doit être en première personne'
);
```

## 📊 Format des Données

### Input (vers Edge Function)

```typescript
{
  chapterId: "uuid-du-chapitre"
}
```

### Output (de l'Edge Function)

```typescript
{
  success: true,
  chapter_title: "Désert et Détermination",
  short_summary: "Face à l'isolement et aux difficultés financières à Dubai...",
  detailed_description: "J'ai débarqué à Dubai avec une valise pleine d'espoirs...",
  keywords: ["Dubai", "Anxious", "Lonely", "Broke", "Determined", "Growth", "Family", "Resilience", "Transformation", "Desert"],
  analysis_summary: "Period of career transition in Dubai marked by...",
  total_videos_analyzed: 47,
  primary_themes: ["Career", "Emotions", "Finance", "Family", "Growth"],
  confidence_score: 0.92
}
```

### Stockage en Database

```sql
SELECT
  id,
  title,
  keywords,                    -- JSONB: ["Keyword1", "Keyword2", ...]
  ai_title,                    -- TEXT: "Désert et Détermination"
  ai_short_summary,            -- TEXT: "Face à l'isolement..."
  ai_detailed_description,     -- TEXT: "J'ai débarqué à Dubai..."
  ai_extracted_at              -- TIMESTAMP: 2025-10-18 14:30:00
FROM chapters
WHERE id = 'chapter-uuid';
```

## 🐛 Dépannage

### Problème 1 : "OpenAI API key not configured"

**Solution** : Configurer la clé API dans Supabase

```bash
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase functions deploy extract-chapter-keywords
```

### Problème 2 : "Missing required fields in response"

**Cause** : Le prompt OpenAI n'est pas correctement configuré ou l'IA ne respecte pas le format

**Solution** :
1. Vérifier que le prompt ID est correct
2. Vérifier le contenu du prompt dans la console OpenAI
3. Tester manuellement avec l'API OpenAI

### Problème 3 : "No videos in chapter to analyze"

**Cause** : Le chapitre ne contient aucune vidéo

**Solution** : C'est normal, le système retourne `success: true` avec `message: "No videos in chapter"` et `keywords: []`

### Problème 4 : Titre avec plus de 3 mots

**Cause** : L'IA a retourné un titre trop long

**Solution** : L'Edge Function tronque automatiquement à 3 mots. Vérifier les logs :

```typescript
console.log(`⚠️ Chapter title has ${titleWords.length} words, truncating to 3`);
```

## 📈 Métriques et Performance

### Temps d'Exécution Estimé

- **10 vidéos** : ~5-10 secondes
- **50 vidéos** : ~15-25 secondes
- **100+ vidéos** : ~30-45 secondes

### Coût OpenAI (GPT-4.1 Nano)

- **Input** : ~$0.50 / 1M tokens
- **Output** : ~$1.00 / 1M tokens
- **Coût moyen par chapitre** : ~$0.01 - $0.05 (selon nombre de vidéos)

### Cache et Optimisations

- ✅ **Pas de régénération** si contenu à jour (< 7 jours)
- ✅ **Check intelligent** avec `shouldRegenerateStory()`
- ✅ **Stockage en DB** pour éviter re-calculs

## 🔮 Améliorations Futures

### Phase 2 : Génération Automatique

Déclencher automatiquement la génération quand :
- L'utilisateur termine un chapitre (`ended_at` est défini)
- Le chapitre atteint 10+ vidéos avec transcriptions

```typescript
// Hook dans videoService.ts après upload
if (video.chapter_id) {
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, video_count')
    .eq('id', video.chapter_id)
    .single();

  if (chapter && chapter.video_count >= 10) {
    // Déclencher génération en background
    extractChapterStoryIfNeeded(chapter.id).catch(console.error);
  }
}
```

### Phase 3 : Édition Manuelle

Permettre à l'utilisateur d'éditer le titre/résumé/description générés :

```typescript
const handleEditStory = async (field: 'title' | 'summary' | 'description', newValue: string) => {
  const updates: any = {};

  if (field === 'title') updates.ai_title = newValue;
  if (field === 'summary') updates.ai_short_summary = newValue;
  if (field === 'description') updates.ai_detailed_description = newValue;

  await supabase
    .from('chapters')
    .update(updates)
    .eq('id', chapterId);
};
```

### Phase 4 : Historique des Versions

Stocker les versions précédentes pour permettre rollback :

```sql
CREATE TABLE chapter_story_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID REFERENCES chapters(id),
  version_number INT,
  ai_title TEXT,
  ai_short_summary TEXT,
  ai_detailed_description TEXT,
  keywords JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

**Version** : 1.0
**Date** : 2025-10-18
**Auteur** : Claude Code
**Status** : ✅ Prêt pour déploiement
