# 📋 Brief Complet : Système de Génération de Questions Personnalisées

## 🎯 Vue d'ensemble

Le système génère **50 questions personnalisées** pour chaque utilisateur basées sur leurs transcriptions vidéo. Ces questions sont affichées dans l'écran d'enregistrement pour aider l'utilisateur à démarrer une réflexion.

---

## 🏗️ Architecture Complète

### 1️⃣ **Base de données** (`user_questions`)

**Table structure:**
```sql
CREATE TABLE user_questions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  question_text TEXT NOT NULL,
  batch_number INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP
);
```

**Concepts clés:**
- **batch_number**: Numéro du lot de 50 questions (1, 2, 3...)
- **order_index**: Position dans le lot (0-49)
- **is_used**: `true` quand l'utilisateur a cliqué sur la flèche → pour passer à la question suivante

**Fonctions SQL:**
- `get_user_current_batch(user_id)` → Retourne le dernier numéro de batch
- `count_unused_questions(user_id)` → Compte les questions non utilisées

---

### 2️⃣ **Edge Function** (`generate-user-questions`)

**Localisation:** `/supabase/functions/generate-user-questions/index.ts`

**Flux d'exécution:**

```
1. Reçoit userId depuis l'app
    ↓
2. Récupère 5 dernières vidéos de l'utilisateur
    ↓
3. Récupère leurs transcriptions complètes
    ↓
4. Récupère 3 vidéos aléatoires parmi les anciennes
    ↓
5. Récupère leurs transcriptions complètes
    ↓
6. Combine toutes les transcriptions en un texte
    ↓
7. Envoie à OpenAI Responses API avec prompt ID
    ↓
8. Parse la réponse JSON {"questions": [{"q": "..."}, ...]}
    ↓
9. Insère 50 questions dans user_questions table
    ↓
10. Retourne succès avec le numéro de batch
```

**Requête OpenAI:**
```javascript
POST https://api.openai.com/v1/responses
{
  prompt: {
    id: "pmpt_68dda6ed3cc88197a11c5a8e5e6e9a290c27f60155d435b1",
    version: "1"
  },
  input: "[RECENT VIDEO 1]\nTranscription...\n\n---\n\n[OLDER VIDEO 2]...",
  model: "gpt-4.1-nano",
  temperature: 0.7
}
```

**Format de réponse attendu:**
```json
{
  "questions": [
    {"q": "Comment te sens-tu aujourd'hui ?"},
    {"q": "Qu'est-ce qui t'a le plus marqué cette semaine ?"},
    ...
  ]
}
```

---

### 3️⃣ **Service Client** (`userQuestionsService.ts`)

**Localisation:** `/src/services/userQuestionsService.ts`

**Méthodes principales:**

#### `getNextQuestion()`
- Récupère la **première** question non utilisée (is_used = false)
- Triée par batch_number puis order_index
- Retourne `null` si aucune question disponible

#### `markQuestionAsUsed(questionId)`
- Marque la question comme utilisée (is_used = true)
- Appelée quand l'utilisateur clique sur la flèche →

#### `countUnusedQuestions()`
- Compte combien de questions non utilisées restent
- Utilise la fonction SQL `count_unused_questions()`

#### `needsNewQuestions()`
- Retourne `true` si ≤5 questions restent
- **Seuil critique** : 5 questions

#### `generateNewQuestions()`
- Appelle l'Edge Function `generate-user-questions`
- Passe le userId dans le body
- Génère un nouveau batch de 50 questions

#### `checkAndGenerateIfNeeded()`
- Vérifie le nombre de questions restantes
- Si ≤5 questions → déclenche génération **en arrière-plan**
- Non bloquant : ne bloque pas l'interface

#### `initializeQuestionsIfNeeded()`
- Appelée au premier lancement de l'app
- Si count = 0 → génère le premier batch
- Utilisée pour les nouveaux utilisateurs

---

### 4️⃣ **Intégration RecordScreen** (`RecordScreen.tsx`)

**Cycle de vie:**

```
1. Mount du RecordScreen
    ↓
2. useEffect → initializeQuestions()
    ↓
3. Si count = 0 → génère premier batch
    ↓
4. Utilisateur ouvre les suggestions (icône 💡)
    ↓
5. loadNextQuestion() → charge première question
    ↓
6. Affiche currentQuestion.question_text
    ↓
7. Utilisateur clique sur flèche →
    ↓
8. getNewQuestion() :
    - Marque la question actuelle comme utilisée
    - Vérifie si ≤5 questions restent
    - Si oui → déclenche génération en arrière-plan
    - Charge la question suivante
    ↓
9. Répète jusqu'à épuisement
```

**Fallback système:**
- Si aucune question IA disponible → utilise questions statiques
- Variable `fallbackToStatic` = true
- Questions statiques depuis `introspectionQuestions.ts`

---

## 🔄 Quand les questions sont générées

### ❌ **PAS automatique toutes les 24h**

**État actuel:**
- Les questions ne sont PAS générées automatiquement toutes les 24h
- Elles sont générées **à la demande** uniquement

**Déclencheurs actuels:**
1. **Premier lancement** (count = 0) → `initializeQuestionsIfNeeded()`
2. **Seuil critique** (≤5 questions) → `checkAndGenerateIfNeeded()`
3. **Manuel** via l'Edge Function (si appelé directement)

### ✅ **Ce qui devrait être fait pour la génération quotidienne**

Pour implémenter la génération toutes les 24h, il faudrait :

**Option 1: Supabase Cron Job (Edge Function)**
```sql
-- pg_cron dans Supabase
SELECT cron.schedule(
  'generate-daily-questions',
  '0 0 * * *', -- Tous les jours à minuit
  $$
  SELECT net.http_post(
    url := 'https://eenyzudwktcjpefpoapi.supabase.co/functions/v1/generate-user-questions',
    body := jsonb_build_object('userId', user_id)
  )
  FROM auth.users;
  $$
);
```

**Option 2: Background Job dans l'app**
- Stocker `last_generation_date` dans la table users
- Au lancement de l'app, vérifier si > 24h
- Si oui, déclencher génération

**Option 3: Webhook externe (type n8n, Zapier)**
- Webhook quotidien qui appelle l'Edge Function pour tous les users

---

## 🐛 Erreur Actuelle

**Message:**
```
Response input messages must contain the word 'json' in some form
to use 'text.format' of type 'json_object'.
```

**Cause:**
- OpenAI Responses API nécessite le mot "json" dans l'input
- L'input actuel est juste les transcriptions brutes
- Aucune mention de format JSON

**Localisation du problème:**
- Ligne 195 dans `generate-user-questions/index.ts`
- L'input est juste `transcriptionsText`

**Solution:**
Ajouter une instruction explicite dans l'input :
```javascript
input: `Please analyze these video transcriptions and generate 50 personalized introspection questions in JSON format.

${transcriptionsText || "No previous transcriptions available."}

Return a JSON object with this structure:
{
  "questions": [
    {"q": "Your question here"},
    ...
  ]
}`
```

---

## 📊 Flux de données complet

```
USER ACTION (Click →)
    ↓
RecordScreen.getNewQuestion()
    ↓
UserQuestionsService.markQuestionAsUsed(id)
    ↓
Supabase UPDATE user_questions SET is_used = true
    ↓
UserQuestionsService.countUnusedQuestions()
    ↓
Supabase SELECT count_unused_questions(user_id)
    ↓
Si ≤5 questions:
    ↓
UserQuestionsService.generateNewQuestions()
    ↓
Supabase Edge Function invoke('generate-user-questions')
    ↓
Edge Function récupère transcriptions
    ↓
Edge Function → OpenAI Responses API
    ↓
OpenAI retourne 50 questions en JSON
    ↓
Edge Function insère dans user_questions
    ↓
Nouveau batch disponible pour l'utilisateur
```

---

## 🔑 Points Clés

1. **Batch de 50 questions** : Toujours généré en lot complet
2. **Seuil de 5** : Régénération déclenchée à 5 questions restantes
3. **Non bloquant** : Génération en arrière-plan pendant que l'utilisateur continue
4. **Fallback** : Questions statiques si IA indisponible
5. **Ordre respecté** : Questions affichées dans l'ordre du batch (order_index)
6. **Personnalisées** : Basées sur 5 récentes + 3 anciennes transcriptions
7. **❌ Pas automatique** : Pas de génération quotidienne pour l'instant

---

## 📝 TODO pour génération quotidienne

- [ ] Ajouter colonne `last_question_generation` dans table profiles
- [ ] Créer fonction de vérification au lancement de l'app
- [ ] Si > 24h depuis dernière génération → déclencher
- [ ] Ou implémenter pg_cron job dans Supabase
- [ ] Ou utiliser webhook externe quotidien

---

## 🎯 Résumé pour l'utilisateur

**Aujourd'hui le système:**
1. Génère 50 questions à la fois
2. Basées sur tes 5 dernières + 3 anciennes vidéos
3. Se déclenche quand il reste ≤5 questions
4. Ou au premier lancement de l'app
5. **N'est PAS encore automatique toutes les 24h**

**Pour avoir la génération quotidienne, il faut ajouter:**
- Un système de scheduling (cron job ou vérification au lancement)
- Une date de dernière génération stockée quelque part
