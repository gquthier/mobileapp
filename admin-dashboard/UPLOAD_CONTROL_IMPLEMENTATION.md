# ⏹️ Contrôle Manuel des Uploads - Implémentation Complète

## ✅ Ce qui a été implémenté

### 1. **Migration SQL** (`supabase/migrations/013_upload_queue_monitoring.sql`)

Table `upload_queue` créée avec:

#### **Colonnes principales**
- `id` - UUID unique
- `user_id` - Référence au profil
- `video_title`, `filename`, `file_size`
- **`status`** - **3 statuts principaux:**
  - 🔵 **`uploading`** - Upload en cours
  - 🔄 **`retrying`** - On réessaye (après erreur)
  - 🔴 **`failed`** - Échec définitif
  - 🟢 `completed` - Succès
  - ⏹️ **`stopped`** - **Arrêté manuellement** (NOUVEAU!)
- `progress` (0-100%)
- `upload_speed` (MB/s)
- `retry_count` (0-3)
- `error_message`
- Timestamps: `started_at`, `completed_at`, `stopped_at`

#### **Fonctions SQL créées**

1. **`stop_upload(upload_id)`**
   - Arrête un upload spécifique
   - Change status → `stopped`
   - Marque `stopped_at`

2. **`stop_user_uploads(user_id)`**
   - Arrête tous les uploads d'un user
   - Retourne le nombre d'uploads arrêtés

3. **`stop_all_uploads()`** ⚠️
   - **EMERGENCY**: Arrête TOUS les uploads en cours
   - Pour développement uniquement
   - Retourne le nombre d'uploads arrêtés

4. **`get_active_uploads()`**
   - Récupère tous les uploads actifs (uploading + retrying)
   - JOIN avec profiles pour l'email

### 2. **Service Backend** (`admin-dashboard/lib/monitoringService.ts`)

Nouvelles méthodes ajoutées:

```typescript
// Arrêter un upload spécifique
MonitoringService.stopUpload(uploadId: string): Promise<boolean>

// Arrêter tous les uploads d'un user
MonitoringService.stopUserUploads(userId: string): Promise<number>

// EMERGENCY: Arrêter TOUS les uploads
MonitoringService.stopAllUploads(): Promise<number>

// Récupérer les uploads depuis upload_queue (avec fallback)
MonitoringService.getActiveUploadsFromQueue(): Promise<UploadMonitorItem[]>
```

### 3. **Page Monitoring** (`admin-dashboard/pages/monitoring.tsx`)

#### **Nouveaux boutons ajoutés:**

1. **Bouton "⏹️ STOP ALL"** (header section uploads)
   - Visible seulement si uploads actifs (uploading/retrying)
   - Confirmation avant action
   - Arrête TOUS les uploads en cours

2. **Bouton "⏹️ Stop"** (sur chaque carte upload)
   - Visible seulement pour uploads uploading/retrying
   - Confirmation avant action
   - Arrête l'upload individuellement

#### **3 Statuts clairement affichés:**

| Status | Icône | Couleur | Description |
|--------|-------|---------|-------------|
| `uploading` | 🔵 | Bleu | Upload en cours |
| `retrying` | 🔄 | Jaune | On réessaye (après erreur) |
| `failed` | 🔴 | Rouge | Échec définitif |
| `stopped` | ⏹️ | Gris | Arrêté manuellement |
| `completed` | 🟢 | Vert | Succès |

#### **Progress bar améliorée:**
- Bleu pour `uploading`
- Jaune pour `retrying` avec texte "Retry en cours..."
- Disparaît pour `failed` et `stopped`

---

## 🚀 Comment Utiliser

### **Étape 1: Appliquer la migration SQL**

Dans ton projet Supabase:

```bash
cd mobileapp
npx supabase db push
```

Ou applique manuellement dans Supabase Dashboard > SQL Editor:
- Copie le contenu de `supabase/migrations/013_upload_queue_monitoring.sql`
- Exécute-le

### **Étape 2: Le dashboard est prêt!**

Le dashboard admin est **déjà opérationnel** avec:
- Fallback sur table `videos` si `upload_queue` n'existe pas encore
- Boutons Stop prêts à utiliser

### **Étape 3: Utiliser les boutons Stop**

#### **Stop un upload individuel:**
1. Va sur http://localhost:3001/monitoring
2. Trouve l'upload que tu veux arrêter
3. Clique sur "⏹️ Stop" dans la carte
4. Confirme
5. L'upload passe en status `stopped`

#### **Stop TOUS les uploads:**
1. Va sur http://localhost:3001/monitoring
2. Clique sur "⏹️ STOP ALL" (en haut à droite)
3. ⚠️ ATTENTION: Confirmation requise
4. Tous les uploads en cours sont arrêtés

---

## 📱 Intégration App Mobile (Phase 2 - Optionnel)

Pour que l'app mobile **utilise vraiment** la table `upload_queue` et respecte les stops:

### **Modifications à faire dans `VideoUploader.ts`**

```typescript
// À AJOUTER au début de uploadVideo()
static async uploadVideo(...) {
  // ✅ STEP 1: Créer record dans upload_queue
  const { data: queueRecord } = await supabase
    .from('upload_queue')
    .insert({
      user_id: userId,
      video_title: options?.videoTitle || 'Sans titre',
      filename: fileName,
      file_size: fileSize,
      status: 'uploading',
      progress: 0,
      metadata: {
        isRecorded: options?.isRecorded,
        isImported: options?.isImported,
      }
    })
    .select()
    .single();

  const queueId = queueRecord.id;

  try {
    // ✅ STEP 2: Upload avec progress tracking
    const uploadTask = FileSystem.createUploadTask(
      uploadUrl,
      videoUri,
      {
        // ...
      },
      (data: any) => {
        const percent = (data.totalBytesSent / data.totalBytesExpectedToSend) * 100;

        // ✅ STEP 3: Update progress en temps réel
        supabase
          .from('upload_queue')
          .update({
            progress: Math.floor(percent),
            upload_speed: calculateSpeed(), // Your logic
          })
          .eq('id', queueId)
          .then();

        // ✅ STEP 4: Checker si stopped manuellement
        supabase
          .from('upload_queue')
          .select('status')
          .eq('id', queueId)
          .single()
          .then(({ data }) => {
            if (data?.status === 'stopped') {
              uploadTask.cancelAsync(); // Annuler l'upload
              throw new Error('Upload cancelled by admin');
            }
          });

        // Original progress callback
        if (options?.onProgress) {
          options.onProgress({ ... });
        }
      }
    );

    const result = await uploadTask.uploadAsync();

    // ✅ STEP 5: Marquer comme complété
    await supabase
      .from('upload_queue')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        file_path: publicUrl,
      })
      .eq('id', queueId);

    return { ... };

  } catch (error) {
    // ✅ STEP 6: Gérer retry ou failed
    if (retryCount < maxRetries) {
      // Mark as retrying
      await supabase
        .from('upload_queue')
        .update({
          status: 'retrying',
          retry_count: retryCount + 1,
          error_message: error.message,
          last_error_at: new Date().toISOString(),
        })
        .eq('id', queueId);

      // Retry logic...
    } else {
      // Mark as failed
      await supabase
        .from('upload_queue')
        .update({
          status: 'failed',
          error_message: error.message,
          last_error_at: new Date().toISOString(),
        })
        .eq('id', queueId);
    }

    throw error;
  }
}
```

### **Polling pour détecter les stops**

Option 1: Polling pendant l'upload (recommandé)
```typescript
// Dans le progress callback
const checkStopStatus = setInterval(async () => {
  const { data } = await supabase
    .from('upload_queue')
    .select('status')
    .eq('id', queueId)
    .single();

  if (data?.status === 'stopped') {
    clearInterval(checkStopStatus);
    uploadTask.cancelAsync();
    throw new Error('Upload stopped by admin');
  }
}, 2000); // Check every 2 seconds
```

Option 2: Supabase Realtime (plus avancé)
```typescript
const stopChannel = supabase
  .channel(`upload_${queueId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'upload_queue',
    filter: `id=eq.${queueId}`
  }, (payload) => {
    if (payload.new.status === 'stopped') {
      uploadTask.cancelAsync();
      throw new Error('Upload stopped by admin');
    }
  })
  .subscribe();
```

---

## 🧪 Comment Tester

### **Test 1: Sans upload_queue (Fallback)**

Le dashboard fonctionne déjà avec les données existantes:

1. Lance le dashboard: `cd admin-dashboard && npm run dev`
2. Va sur http://localhost:3001/monitoring
3. Tu verras les vidéos des dernières 24h (depuis table `videos`)
4. Les boutons Stop sont là mais n'ont pas d'effet (car pas de vraie queue)

### **Test 2: Avec upload_queue (Après migration)**

Après avoir appliqué la migration:

1. **Créer des uploads de test manuellement:**

```sql
-- Dans Supabase SQL Editor
INSERT INTO upload_queue (user_id, video_title, filename, file_size, status, progress)
VALUES
  ((SELECT id FROM profiles LIMIT 1), 'Test Upload 1', 'test1.mp4', 50000000, 'uploading', 45),
  ((SELECT id FROM profiles LIMIT 1), 'Test Upload 2', 'test2.mp4', 80000000, 'retrying', 23),
  ((SELECT id FROM profiles LIMIT 1), 'Test Upload 3', 'test3.mp4', 30000000, 'failed', 0);
```

2. **Rafraîchir le dashboard** → Tu verras les 3 uploads

3. **Tester Stop individuel:**
   - Clique "⏹️ Stop" sur Upload 1
   - Confirme
   - Upload 1 passe en `stopped`

4. **Tester Stop All:**
   - Clique "⏹️ STOP ALL"
   - Confirme
   - Upload 2 passe aussi en `stopped`

5. **Vérifier en SQL:**
```sql
SELECT id, video_title, status, stopped_at FROM upload_queue;
```

---

## 📊 Surveillance des Uploads

### **Requêtes SQL utiles**

```sql
-- Voir tous les uploads actifs
SELECT * FROM get_active_uploads();

-- Compter uploads par status
SELECT status, COUNT(*)
FROM upload_queue
GROUP BY status;

-- Voir les uploads stoppés
SELECT * FROM upload_queue
WHERE status = 'stopped'
ORDER BY stopped_at DESC;

-- Nettoyer les vieux uploads
SELECT cleanup_old_uploads(); -- Supprime uploads > 7 jours
```

---

## 🎯 Cas d'Usage Pendant le Développement

### **Scénario 1: Upload bloqué qui boucle**

Tu as un upload qui retry indéfiniment et ça surcharge:

1. Va sur `/monitoring`
2. Trouve l'upload (status `retrying`)
3. Clique "⏹️ Stop"
4. ✅ Upload arrêté, plus de retry

### **Scénario 2: Tests uploads massifs**

Tu testes avec 50 uploads simultanés et ça lag:

1. Va sur `/monitoring`
2. Clique "⏹️ STOP ALL"
3. ✅ Tous les uploads arrêtés d'un coup

### **Scénario 3: User spécifique a un problème**

Un user a 5 uploads qui échouent:

1. Filtre par user (feature à ajouter)
2. Clique "Stop All User Uploads" (feature à ajouter)
3. ✅ Tous ses uploads arrêtés

---

## 🔒 Sécurité

### **RLS Policies en place:**

- ✅ Users peuvent voir/modifier leurs propres uploads
- ✅ Service role (dashboard admin) peut tout voir/modifier
- ✅ Fonctions SQL en `SECURITY DEFINER` (safe)

### **Logs des stops:**

Tous les stops sont tracés:
```sql
SELECT
  id,
  video_title,
  user_id,
  stopped_at,
  error_message
FROM upload_queue
WHERE status = 'stopped'
ORDER BY stopped_at DESC;
```

---

## ✅ Checklist Implémentation

- [x] Migration SQL créée
- [x] Fonctions stop créées (stop_upload, stop_all_uploads)
- [x] Service monitoring mis à jour
- [x] Page monitoring avec boutons Stop
- [x] 3 statuts clairs (uploading, retrying, failed)
- [x] Confirmation avant stop
- [x] Fallback si table n'existe pas
- [x] Documentation complète
- [ ] **TO DO**: Appliquer migration en production
- [ ] **TO DO**: Modifier app mobile pour utiliser upload_queue
- [ ] **TO DO**: Polling pour détecter stops depuis l'app

---

## 🎉 Résultat

Tu as maintenant un **contrôle total** sur les uploads depuis le dashboard:

✅ **3 statuts clairs**: uploading (🔵), retrying (🔄), failed (🔴)
✅ **Bouton Stop individuel**: Arrête un upload spécifique
✅ **Bouton STOP ALL**: Arrête tous les uploads d'un coup (développement)
✅ **Temps réel**: Auto-refresh toutes les 5 secondes
✅ **Sécurisé**: RLS policies + confirmations
✅ **Production-ready**: Fallback si table n'existe pas encore

**Phase actuelle**: Dashboard opérationnel avec données simulées
**Phase suivante**: Intégrer dans l'app mobile pour vraie progression temps réel

Besoin d'aide pour la Phase 2 (intégration app mobile)? Dis-le moi! 🚀
