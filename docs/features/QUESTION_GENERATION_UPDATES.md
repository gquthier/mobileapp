# ✅ Mises à jour du système de génération de questions

## 🎯 Changements effectués

### 1. **Edge Function : Logique flexible de transcriptions**

**Fichier:** `supabase/functions/generate-user-questions/index.ts`

**Avant:**
- Nécessitait 5 récentes + 3 anciennes = 8 transcriptions minimum
- Ne fonctionnait pas pour les nouveaux utilisateurs

**Après:**
- ✅ Fonctionne avec **minimum 3 transcriptions**
- ✅ Si ≤5 transcriptions → utilise toutes celles disponibles
- ✅ Si >5 transcriptions → utilise 5 récentes + 3 aléatoires anciennes
- ✅ Si 0 transcription → génère quand même des questions génériques

**Code modifié:**
```typescript
if (totalTranscriptions === 0) {
  // Génère des questions génériques
} else if (totalTranscriptions <= 5) {
  // Utilise TOUTES les transcriptions disponibles
  selectedTranscriptions = allCompletedTranscriptions;
} else {
  // Utilise 5 récentes + 3 aléatoires anciennes
  selectedTranscriptions = [...recentTranscriptions, ...randomOlder];
}
```

---

### 2. **Service Client : Auto-génération intelligente**

**Fichier:** `src/services/userQuestionsService.ts`

**Nouvelles fonctions ajoutées:**

#### `countCompletedTranscriptions()`
Compte le nombre de transcriptions terminées pour l'utilisateur.

#### `autoGenerateAfterTranscription()`
**Logique automatique:**
- ✅ Si 0 questions ET ≥3 transcriptions → génère premier batch
- ✅ Si ≤5 questions restantes → régénère nouveau batch
- ✅ Tout se passe en arrière-plan (non-bloquant)

**Code:**
```typescript
static async autoGenerateAfterTranscription(): Promise<void> {
  const questionCount = await this.countUnusedQuestions();
  const transcriptionCount = await this.countCompletedTranscriptions();

  // Cas 1: Premier batch dès 3 transcriptions
  if (questionCount === 0 && transcriptionCount >= 3) {
    this.generateNewQuestions(); // En arrière-plan
  }

  // Cas 2: Régénération si ≤5 questions
  if (questionCount > 0 && questionCount <= 5) {
    this.generateNewQuestions(); // En arrière-plan
  }
}
```

#### `initializeQuestionsIfNeeded()` (modifiée)
**Avant:**
- Générait même avec 0 transcription

**Après:**
- ✅ Vérifie le nombre de transcriptions
- ✅ Génère seulement si ≥3 transcriptions
- ✅ Sinon → utilise questions statiques

---

### 3. **RecordScreen : Déclenchement automatique**

**Fichier:** `src/screens/RecordScreen.tsx`

**Ajout après upload vidéo:**
```typescript
// 🔥 Trigger auto-generation of questions after transcription
console.log('🔍 Checking if question generation needed after video upload...');
UserQuestionsService.autoGenerateAfterTranscription().catch((err) => {
  console.log('⚠️ Auto-question generation check failed (non-critical):', err);
});
```

**Quand ça se déclenche:**
- ✅ Après chaque upload de vidéo
- ✅ Après création du job de transcription
- ✅ En arrière-plan (non-bloquant)
- ✅ N'affecte pas la navigation utilisateur

---

### 4. **Fix : Erreur OpenAI JSON**

**Problème:**
```
Response input messages must contain the word 'json'
to use 'text.format' of type 'json_object'
```

**Solution:**
Ajout d'instructions explicites dans l'input OpenAI:
```typescript
input: `Please analyze these video transcriptions and
       generate 50 personalized introspection questions in JSON format.

${transcriptionsText}

IMPORTANT: Return your response as a JSON object with this exact structure:
{
  "questions": [
    {"q": "Your question here"},
    ...
  ]
}`
```

---

## 🔄 Nouveau flux de génération

### Scénario 1: Nouvel utilisateur

```
1. Utilisateur crée compte
2. Enregistre vidéo 1 → 0 questions, 0 transcriptions → Questions statiques
3. Enregistre vidéo 2 → 0 questions, 1 transcription → Questions statiques
4. Enregistre vidéo 3 → 0 questions, 2 transcriptions → Questions statiques
5. Enregistre vidéo 4 → 0 questions, 3 transcriptions → 🔥 AUTO-GÉNÈRE 50 QUESTIONS!
6. Utilisateur a maintenant des questions personnalisées basées sur ses 3 premières vidéos
```

### Scénario 2: Utilisateur existant

```
1. Utilisateur a 45 questions non utilisées
2. Clique 40 fois sur la flèche → pour passer les questions
3. Il reste 5 questions → 🔥 AUTO-GÉNÈRE 50 NOUVELLES QUESTIONS en arrière-plan
4. L'utilisateur continue à utiliser les 5 questions restantes
5. Quand il arrive à la question 51, ce sont les nouvelles questions générées
```

### Scénario 3: Après chaque vidéo

```
1. Utilisateur enregistre une vidéo
2. Vidéo uploadée → Transcription créée (job)
3. En arrière-plan, le système vérifie:
   - Combien de questions restantes?
   - Combien de transcriptions disponibles?
4. Si seuil atteint → AUTO-GÉNÈRE sans bloquer l'utilisateur
```

---

## 📊 Seuils et conditions

| Transcriptions | Questions | Action |
|----------------|-----------|--------|
| 0-2 | 0 | ⚠️ Questions statiques uniquement |
| ≥3 | 0 | ✅ Génère premier batch (50 questions) |
| N/A | 1-5 | ✅ Régénère nouveau batch en arrière-plan |
| N/A | >5 | ✅ Aucune action nécessaire |

---

## 🎯 Avantages

1. **Expérience fluide pour nouveaux users**
   - Commence avec questions statiques
   - Bascule automatiquement vers questions IA dès 3 vidéos

2. **Toujours des questions disponibles**
   - Régénération avant épuisement (à 5 questions)
   - Pas d'interruption pour l'utilisateur

3. **100% automatique et transparent**
   - Tout se passe en arrière-plan
   - Aucune action manuelle requise
   - Pas de blocage de l'interface

4. **Optimisé pour la qualité**
   - Minimum 3 transcriptions pour éviter questions génériques
   - Utilise toujours les vidéos les plus récentes
   - Ajoute de la diversité avec anciennes vidéos aléatoires

---

## 🧪 Comment tester

### Test 1: Nouvel utilisateur
1. Créer nouveau compte
2. Enregistrer 3 vidéos courtes
3. Attendre que les 3 transcriptions se terminent (2-3 min chacune)
4. Vérifier les logs: `🚀 First batch: generating questions with 3+ transcriptions`
5. Ouvrir les suggestions → devrait afficher questions IA personnalisées

### Test 2: Régénération automatique
1. Avec un compte existant ayant des questions
2. Marquer 46 questions comme utilisées (cliquer 46× sur la flèche)
3. Vérifier les logs: `⚠️ Only 4 questions left - triggering regeneration`
4. Nouveau batch de 50 questions généré en arrière-plan

### Test 3: Fallback statique
1. Nouveau compte avec 0 ou 1-2 vidéos
2. Ouvrir suggestions
3. Devrait afficher questions statiques
4. Logs: `⚠️ User only has X transcriptions (need 3+) - will use static questions`

---

## 📝 Logs à surveiller

**Génération déclenchée:**
```
🔍 Checking if question generation needed after video upload...
📊 Current state: 4 questions, 5 transcriptions
⚠️ Only 4 questions left - triggering regeneration
🚀 Triggering question generation for user: xxx
```

**Génération réussie:**
```
✅ Found 5 completed transcriptions
📝 Using all 5 available transcriptions
🧠 Generating questions with AI...
✅ Generated 50 questions successfully
✅ Generated batch #2 with 50 questions
```

**Fallback statique:**
```
⚠️ User only has 2 transcriptions (need 3+) - will use static questions
```

---

## 🚀 Déploiement

✅ **Edge Function redéployée:** `generate-user-questions`
✅ **Code client mis à jour:** `userQuestionsService.ts`
✅ **Integration RecordScreen:** Auto-trigger après upload
✅ **Brief complet créé:** `QUESTION_GENERATION_SYSTEM_BRIEF.md`

---

## ⚠️ Note importante

**Génération quotidienne automatique:**
- ❌ **Pas encore implémentée**
- Système actuel = déclenchement à la demande (seuils)
- Pour génération quotidienne, voir suggestions dans `QUESTION_GENERATION_SYSTEM_BRIEF.md`

Options possibles:
1. pg_cron job dans Supabase
2. Vérification au lancement de l'app (si > 24h)
3. Webhook externe quotidien

**Le système actuel fonctionne très bien sans génération quotidienne**, car il régénère automatiquement dès que nécessaire après chaque nouvelle vidéo.
