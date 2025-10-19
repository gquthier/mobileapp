# Guide de Débogage Supabase

## Problèmes Identifiés et Solutions

### 1. Erreur `getInfoAsync` deprecated
✅ **CORRIGÉ**: Importation changée vers `expo-file-system/legacy`

### 2. Erreurs d'Upload Vidéo

#### Configuration Requise dans Supabase Dashboard

**ÉTAPES OBLIGATOIRES** à faire dans le dashboard Supabase :

1. **Créer le bucket `videos`**
   - Aller dans Storage → Buckets
   - Créer un nouveau bucket nommé `videos`
   - Le rendre public (pour les URLs publiques)

2. **Exécuter le script SQL**
   - Aller dans SQL Editor
   - Copier/coller le contenu de `sql/init.sql`
   - Exécuter le script

3. **Vérifier les Policies**
   - Storage → `videos` bucket → Policies
   - Vérifier que les policies permettent l'upload et la lecture

#### Code de Debug Ajouté

Le nouveau `VideoService` inclut :

- ✅ Logging détaillé à chaque étape
- ✅ Test de connectivité Supabase
- ✅ Conversion Base64 → ArrayBuffer correcte
- ✅ Gestion d'erreur robuste

#### Processus d'Upload Amélioré

```javascript
1. Validation du fichier vidéo local
2. Lecture en Base64
3. Conversion vers ArrayBuffer
4. Upload vers Supabase Storage
5. Génération de l'URL publique
6. Calcul de la durée vidéo
7. Sauvegarde metadata en BDD
```

### 3. Points de Vérification

**Dans les logs de la console, recherchez :**

✅ `🧪 Testing Supabase connection...`
✅ `📦 Available buckets: ['videos']`
✅ `📁 Video file info: { exists: true, size: ... }`
✅ `📦 Base64 data length: ...`
✅ `🔧 ArrayBuffer size: ...`
✅ `✅ Video uploaded successfully`

**Erreurs possibles :**

❌ `Videos bucket not found` → Créer le bucket dans Dashboard
❌ `Database connection error` → Exécuter le script SQL
❌ `Upload error: storage_bucket_not_public` → Rendre le bucket public
❌ `Policy violation` → Vérifier les RLS policies

### 4. Configuration Dashboard Supabase

#### A. Création du Bucket Videos
```sql
-- Dans Storage → Buckets
CREATE BUCKET videos;
ALTER BUCKET videos SET public = true;
```

#### B. Policies de Storage
```sql
-- Dans Storage → videos bucket → Policies
CREATE POLICY "Allow uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Allow downloads" ON storage.objects
FOR SELECT USING (bucket_id = 'videos');
```

#### C. Tables de Base de Données
Utiliser le script complet dans `sql/init.sql`

### 5. Test de Fonctionnement

**Flux de test complet :**

1. Ouvrir l'app et aller sur Record
2. Enregistrer une vidéo courte (5-10s)
3. Entrer un titre
4. Appuyer sur le bouton de validation (check)
5. Vérifier les logs dans la console

**Logs attendus :**
```
📤 Starting video upload to Supabase...
🧪 Testing Supabase connection...
📦 Available buckets: ['videos']
✅ Supabase connection test successful
📁 Video file info: { exists: true, size: 1234567 }
🔄 Reading video file as base64...
📦 Base64 data length: 1646756
🔧 ArrayBuffer size: 1234567
⬆️ Uploading to Supabase Storage...
✅ Video uploaded successfully
🔗 Public URL generated: https://...
⏱️ Video duration: 8s
💾 Saving to database: { title: "Test", ... }
✅ Video record saved successfully
```

### 6. Troubleshooting Commun

**Problème**: `Cannot connect to Supabase`
**Solution**: Vérifier les clés API dans `src/lib/supabase.ts`

**Problème**: `Videos bucket not found`
**Solution**: Créer le bucket dans Storage → Buckets

**Problème**: `Permission denied`
**Solution**: Exécuter le script SQL pour créer les policies

**Problème**: `Video file not found`
**Solution**: Bug dans l'enregistrement vidéo - vérifier les permissions caméra

### 7. Configuration Réseau

**Headers Requis** (normalement automatique avec Supabase client) :
- `apikey: [SUPABASE_ANON_KEY]`
- `Authorization: Bearer [SUPABASE_ANON_KEY]`
- `Content-Type: video/mp4`

**URLs utilisées :**
- Upload: `POST https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/videos/`
- Database: `POST https://eenyzudwktcjpefpoapi.supabase.co/rest/v1/videos`