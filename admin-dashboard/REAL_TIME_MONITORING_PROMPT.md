# 📊 PROMPT MASSIF: Dashboard Admin - Monitoring Temps Réel des Uploads & Logs

## 🎯 CONTEXTE DU PROJET

Tu vas créer une **nouvelle page de monitoring temps réel** pour le dashboard administrateur existant d'une application mobile React Native. Cette application utilise **Supabase** comme backend et permet aux utilisateurs d'enregistrer/importer des vidéos qui sont ensuite uploadées vers Supabase Storage, transcrites avec AssemblyAI, et analysées avec OpenAI.

### 📱 **Architecture Actuelle de l'Application Mobile**

L'application mobile utilise un système d'upload sophistiqué basé sur plusieurs services:

#### **1. VideoBackupService** (`src/services/videoBackupService.ts`)
- **Rôle**: Sauvegarde locale des vidéos AVANT upload pour prévenir toute perte
- **Flow**:
  1. Copie la vidéo dans `/Documents/video_backups/`
  2. Sauvegarde metadata dans AsyncStorage (`@pending_videos`)
  3. Retourne `{ backupUri, videoId }`
- **Format AsyncStorage** (IMPORTANT):
  ```typescript
  interface PendingVideo {
    id: string; // "pending_123456789"
    localUri: string; // Depuis 2025: filename relatif "backup_123.mov" (avant: chemin absolu)
    title: string;
    userId: string;
    createdAt: string; // ISO timestamp
    uploadAttempts: number; // 0-5
    fileSize: number; // bytes
  }
  ```

#### **2. ImportQueueService** (`src/services/importQueueService.ts` + modules dans `src/services/import/`)
- **Rôle**: Orchestration complète de l'upload en background
- **Architecture Modulaire** (refactoring Phase 1-3 COMPLÉTÉ):
  - `ImportQueueManager.ts` (470 lignes): Gestion état & persistence AsyncStorage
  - `VideoUploader.ts` (330 lignes): Upload background vers Supabase Storage
  - `VideoThumbnailGenerator.ts` (286 lignes): Génération thumbnails
  - `VideoRecordManager.ts` (310 lignes): Opérations database

- **Format AsyncStorage** (`@import_queue_state`):
  ```typescript
  interface ImportQueueState {
    items: ImportVideoItem[];
    currentIndex: number;
    isProcessing: boolean;
    totalCount: number;
    completedCount: number;
    failedCount: number;
  }

  interface ImportVideoItem {
    id: string; // "import_123456789_0" ou "recorded_123456789_abc"
    uri: string; // Chemin local de la vidéo
    filename: string;
    title?: string;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    progress: number; // 0-100
    error?: string;
    videoRecord?: VideoRecord; // Une fois complété
    retryCount: number; // 0-3
    metadata?: {
      isRecorded?: boolean;
      isImported?: boolean;
      chapterId?: string;
      duration?: number;
      width?: number;
      height?: number;
      orientation?: 'portrait' | 'landscape';
    };
  }
  ```

#### **3. Pipeline Complète d'Upload**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. RecordScreen (enregistrement vidéo)                          │
│    → handleAutoSaveVideo()                                       │
│    → VideoBackupService.backupVideoLocally()                     │
│         • Copie vers /Documents/video_backups/backup_XXX.mov     │
│         • Sauvegarde dans AsyncStorage @pending_videos           │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. ImportQueueService.addRecordedVideoToQueue()                 │
│    → Crée ImportVideoItem avec metadata                         │
│    → ImportQueueManager.addItems()                              │
│    → Sauvegarde dans AsyncStorage @import_queue_state           │
│    → Lance processQueue() si pas déjà actif                     │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. ImportQueueService.processQueue()                            │
│    → Traite par batch de 2 vidéos concurrentes                  │
│    → Pour chaque item → processItem()                           │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. ImportQueueService.processItem()                             │
│    STEP 1: Validation fichier existe                            │
│    STEP 2: Extraction metadata (duration, orientation)          │
│    STEP 3: VideoUploader.uploadVideo() [UPLOAD BACKGROUND]      │
│            • Timeout dynamique: 10-60min (0.5 MB/s minimum)     │
│            • FileSystem.createUploadTask (BACKGROUND mode)       │
│            • Multipart upload vers Supabase Storage             │
│            • Retry logic: max 3 tentatives                      │
│    STEP 4: VideoRecordManager.createVideoRecord()               │
│            • INSERT dans table `videos`                         │
│    STEP 5: VideoThumbnailGenerator.generateFrames()             │
│            • 3 frames extraits et uploadés                      │
│    STEP 6: TranscriptionJobService.createTranscriptionJob()     │
│            • Job AssemblyAI créé (queue-transcription)          │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Supabase Edge Functions                                      │
│    • process-transcription (orchestration)                      │
│    • transcribe-assemblyai (5GB/10h support)                    │
│    • generate-highlights (OpenAI GPT-4.1 Nano)                  │
│    • generate-user-questions (50 questions/batch)               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ **SCHEMA DATABASE SUPABASE**

### **Tables Principales**

#### **1. `videos` table**
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  file_path TEXT NOT NULL, -- URL publique Supabase Storage
  thumbnail_path TEXT,
  thumbnail_frames TEXT[], -- 3-6 frames pour animation
  duration INTEGER, -- secondes
  metadata JSONB, -- { isRecorded, isImported, orientation, width, height, chapterId, location }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **2. `transcription_jobs` table**
```sql
CREATE TABLE transcription_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'pending' | 'processing' | 'completed' | 'failed'
  transcript_text TEXT,
  transcript_highlight JSONB, -- Array de highlights { title, summary, importance, start_time }
  language TEXT,
  assembly_ai_id TEXT, -- ID AssemblyAI pour polling
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

#### **3. `profiles` table**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  language TEXT DEFAULT 'en', -- 'en' | 'fr' | 'es' | 'de'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **4. `bug_reports` table** (déjà existant)
```sql
CREATE TABLE bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT,
  error_type TEXT, -- 'crash' | 'network' | 'ui' | 'api' | 'other'
  error_message TEXT NOT NULL,
  error_stack TEXT,
  severity TEXT DEFAULT 'medium', -- 'critical' | 'high' | 'medium' | 'low'
  status TEXT DEFAULT 'new', -- 'new' | 'investigating' | 'resolved' | 'ignored'
  screen_name TEXT,
  component_name TEXT,
  action TEXT,
  app_version TEXT,
  device_info JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎯 **OBJECTIF: NOUVELLE PAGE `/monitoring`**

Tu dois créer une nouvelle page **`/monitoring`** (ou `/uploads`) dans le dashboard admin qui affiche **en temps réel** :

### **COLONNE GAUCHE (60% largeur): UPLOADS EN COURS**

**🎯 Objectif**: Visualiser tous les uploads actifs/pending/failed de TOUS les utilisateurs en temps réel.

#### **Données à Afficher par Upload:**

1. **User Info**:
   - Email utilisateur (depuis `profiles.email`)
   - Avatar initiales (ex: "JD" pour John Doe)
   - Badge couleur selon statut global utilisateur

2. **Video Info**:
   - Nom de la vidéo (title)
   - Type: "📹 Recorded" ou "📸 Imported"
   - Taille fichier (MB)
   - Durée estimée (si disponible)

3. **Upload Progress**:
   - **Status Badge**:
     - 🟡 `pending`: Orange "En attente"
     - 🔵 `uploading`: Bleu "Upload en cours"
     - 🟢 `completed`: Vert "Complété"
     - 🔴 `failed`: Rouge "Échec"
   - **Progress Bar**: 0-100% (animée pour status='uploading')
   - **Vitesse upload**: MB/s (si uploading)
   - **Temps écoulé**: "2m 34s" / "Complété il y a 5m"

4. **Retry Info** (si applicable):
   - Badge "Tentative 2/3" si retryCount > 0

5. **Actions**:
   - Bouton "Détails" → Modal avec logs complets
   - Bouton "Réessayer" (si failed)

#### **Sources de Données**:

**Option A: Polling Database Supabase (RECOMMANDÉ)**
- **Query principale**:
  ```sql
  SELECT
    v.id,
    v.title,
    v.file_path,
    v.duration,
    v.metadata,
    v.created_at,
    p.email,
    p.id as user_id,
    tj.status as transcription_status,
    tj.error_message as transcription_error
  FROM videos v
  LEFT JOIN profiles p ON v.user_id = p.id
  LEFT JOIN transcription_jobs tj ON v.id = tj.video_id
  WHERE v.created_at >= NOW() - INTERVAL '24 hours'
  ORDER BY v.created_at DESC;
  ```

- **Déduire le statut d'upload**:
  - Si `created_at` < 5 minutes ago ET `file_path` existe → `completed`
  - Si `created_at` < 30 minutes ago ET pas de `file_path` → `uploading` (assumption)
  - Utiliser `metadata.uploadFailed` pour détecter `failed`

**Option B: WebSocket/Realtime Supabase (AVANCÉ)**
- Utiliser `supabase.channel()` pour écouter les insertions en temps réel dans `videos`
- Exemple:
  ```typescript
  const channel = supabase
    .channel('videos_realtime')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'videos'
    }, (payload) => {
      console.log('New video uploaded!', payload.new);
      // Update state
    })
    .subscribe();
  ```

**⚠️ LIMITATION IMPORTANTE**:
Les données `ImportQueueService` sont dans **AsyncStorage LOCAL** sur chaque téléphone mobile. Le dashboard admin **NE PEUT PAS** accéder directement à AsyncStorage des utilisateurs.

**Solutions pour afficher la vraie progression**:

1. **Créer une table `upload_queue` dans Supabase** (RECOMMANDÉ):
   ```sql
   CREATE TABLE upload_queue (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
     video_title TEXT,
     filename TEXT,
     file_size BIGINT, -- bytes
     status TEXT NOT NULL, -- 'pending' | 'uploading' | 'completed' | 'failed'
     progress INTEGER DEFAULT 0, -- 0-100
     upload_speed NUMERIC, -- MB/s
     retry_count INTEGER DEFAULT 0,
     error_message TEXT,
     metadata JSONB,
     started_at TIMESTAMPTZ DEFAULT NOW(),
     completed_at TIMESTAMPTZ,
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

   **Modifications app mobile** (à documenter dans le prompt):
   - Modifier `ImportQueueService.processItem()` pour:
     1. Créer un enregistrement dans `upload_queue` au début (status='pending')
     2. UPDATE `progress` + `status='uploading'` pendant l'upload
     3. UPDATE `status='completed'` + `completed_at` à la fin
     4. UPDATE `status='failed'` + `error_message` en cas d'erreur

2. **Utiliser les données `videos` existantes** (FALLBACK):
   - Afficher les vidéos créées dans les dernières 24h
   - Déduire le statut basé sur timestamps
   - Pas de vraie progression, mais historique

---

### **COLONNE DROITE (40% largeur): LOGS & BUGS**

**🎯 Objectif**: Visualiser tous les bugs, erreurs et logs critiques en temps réel.

#### **Section 1: BUGS RÉCENTS (Top 50%)**

Réutiliser le système existant de `bug_reports` (déjà implémenté dans `/bugs`).

**Affichage compact**:
- Liste scrollable des derniers bugs (limit 20)
- Chaque item:
  - 🐛 Icône type (💥 crash, 🌐 network, 🔌 api, 🎨 ui)
  - Message d'erreur (tronqué à 60 caractères)
  - Email utilisateur
  - Badge sévérité (🔥 critical, ⚠️ high, ⚙️ medium, ℹ️ low)
  - Badge statut (🆕 new, 🔍 investigating, ✅ resolved)
  - Timestamp relatif ("Il y a 5m")
  - Click → Modal détails (réutiliser modal de `/bugs`)

**Query**:
```sql
SELECT *
FROM bug_reports
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  created_at DESC
LIMIT 20;
```

#### **Section 2: ERREURS UPLOAD (Bottom 50%)**

Afficher les erreurs spécifiques aux uploads (extraites depuis plusieurs sources).

**Sources de données**:

1. **`videos` avec `metadata.uploadFailed = true`**:
   ```sql
   SELECT v.*, p.email
   FROM videos v
   JOIN profiles p ON v.user_id = p.id
   WHERE v.metadata->>'uploadFailed' = 'true'
   AND v.created_at >= NOW() - INTERVAL '7 days'
   ORDER BY v.created_at DESC;
   ```

2. **`bug_reports` avec `error_type = 'network'` ou contenant "upload"**:
   ```sql
   SELECT *
   FROM bug_reports
   WHERE (error_type = 'network' OR error_message ILIKE '%upload%')
   AND created_at >= NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

3. **`transcription_jobs` avec `status = 'failed'`**:
   ```sql
   SELECT tj.*, v.title, p.email
   FROM transcription_jobs tj
   JOIN videos v ON tj.video_id = v.id
   JOIN profiles p ON v.user_id = p.id
   WHERE tj.status = 'failed'
   AND tj.created_at >= NOW() - INTERVAL '7 days'
   ORDER BY tj.created_at DESC;
   ```

**Affichage**:
- Tabs pour switcher entre:
  - "🚫 Échecs Upload" (uploads failed)
  - "🔴 Échecs Transcription" (transcription failed)
  - "⚠️ Erreurs Réseau" (network errors from bug_reports)

- Chaque erreur:
  - User email
  - Video title (si disponible)
  - Message d'erreur
  - Timestamp
  - Badge type erreur
  - Bouton "Détails" → Modal

---

## 📈 **STATISTIQUES EN HAUT DE PAGE**

Dashboard-style cards au-dessus des 2 colonnes:

### **Row 1: Stats Upload Temps Réel**

```typescript
<div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
  <StatCard
    title="Uploads actifs"
    value={uploadsInProgress}
    icon="⬆️"
    color="bg-blue-500"
    subtitle={`${uploadsPending} en attente`}
  />
  <StatCard
    title="Complétés (24h)"
    value={uploadsCompletedToday}
    icon="✅"
    color="bg-green-500"
    subtitle={`${successRate}% succès`}
  />
  <StatCard
    title="Échecs (24h)"
    value={uploadsFailedToday}
    icon="❌"
    color="bg-red-500"
    subtitle={`${failedUploadRate}% des uploads`}
  />
  <StatCard
    title="Vitesse moy."
    value={`${avgUploadSpeed.toFixed(1)} MB/s`}
    icon="⚡"
    color="bg-purple-500"
    subtitle="Dernières 10 uploads"
  />
  <StatCard
    title="Bugs nouveaux"
    value={newBugsToday}
    icon="🐛"
    color="bg-orange-500"
    subtitle={`${criticalBugsToday} critiques`}
  />
</div>
```

### **Row 2: Erreurs Courantes (Top 5)**

Table compacte affichant les 5 erreurs les plus fréquentes dans les dernières 24h:

```typescript
<div className="bg-white p-4 rounded-lg shadow mb-6">
  <h3 className="text-lg font-semibold mb-3">🔥 Erreurs les plus fréquentes (24h)</h3>
  <table className="w-full text-sm">
    <thead>
      <tr className="text-left text-gray-600">
        <th className="pb-2">Erreur</th>
        <th className="pb-2 text-right">Occurrences</th>
        <th className="pb-2 text-right">Utilisateurs</th>
        <th className="pb-2 text-right">% Total</th>
      </tr>
    </thead>
    <tbody>
      {topErrors.map((error, idx) => (
        <tr key={idx} className="border-t">
          <td className="py-2 font-medium">{error.message}</td>
          <td className="py-2 text-right">{error.count}</td>
          <td className="py-2 text-right">{error.uniqueUsers}</td>
          <td className="py-2 text-right">{error.percentage}%</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Query pour top errors**:
```sql
SELECT
  error_message,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users,
  ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM bug_reports WHERE created_at >= NOW() - INTERVAL '24 hours')), 1) as percentage
FROM bug_reports
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY error_message
ORDER BY count DESC
LIMIT 5;
```

---

## 🔧 **SPÉCIFICATIONS TECHNIQUES**

### **Technologies à Utiliser**

**Frontend (déjà dans le dashboard existant)**:
- **Next.js 14** (App Router ou Pages Router - utilise Pages Router comme existant)
- **TypeScript**
- **Tailwind CSS** (déjà configuré)
- **Recharts** (pour graphiques si besoin)
- **date-fns** (pour formatage dates)

**Backend**:
- **Supabase** (PostgreSQL + Realtime + Storage)
- **Supabase JS Client** (v2.57.4 déjà installé)

### **Nouveau Service: `monitoringService.ts`**

Créer un service dans `/lib/monitoringService.ts`:

```typescript
import { supabase } from './supabase';

export interface UploadMonitorItem {
  id: string;
  userId: string;
  userEmail: string;
  videoTitle: string;
  filename: string;
  fileSize: number; // bytes
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number; // 0-100
  uploadSpeed?: number; // MB/s
  retryCount: number;
  errorMessage?: string;
  startedAt: string; // ISO timestamp
  completedAt?: string;
  elapsedTime?: number; // seconds
  metadata?: any;
}

export interface MonitoringStats {
  uploadsInProgress: number;
  uploadsPending: number;
  uploadsCompletedToday: number;
  uploadsFailedToday: number;
  avgUploadSpeed: number;
  successRate: number;
  newBugsToday: number;
  criticalBugsToday: number;
}

export interface ErrorSummary {
  message: string;
  count: number;
  uniqueUsers: number;
  percentage: number;
}

export class MonitoringService {
  /**
   * Get all active/recent uploads (last 24h)
   */
  static async getActiveUploads(): Promise<UploadMonitorItem[]> {
    // TODO: Implement based on approach chosen (upload_queue table or videos table)
    // Option A: Query upload_queue table (if created)
    // Option B: Query videos table + deduce status from timestamps
  }

  /**
   * Get monitoring statistics
   */
  static async getMonitoringStats(): Promise<MonitoringStats> {
    // TODO: Implement
  }

  /**
   * Get top 5 most common errors in last 24h
   */
  static async getTopErrors(): Promise<ErrorSummary[]> {
    // TODO: Implement query shown above
  }

  /**
   * Get recent bugs (last 20)
   */
  static async getRecentBugs(limit: number = 20) {
    // TODO: Reuse logic from existing bugService.ts
  }

  /**
   * Get upload errors (failed uploads)
   */
  static async getUploadErrors() {
    // TODO: Query videos with metadata.uploadFailed = true
  }

  /**
   * Get transcription errors (failed jobs)
   */
  static async getTranscriptionErrors() {
    // TODO: Query transcription_jobs with status = 'failed'
  }

  /**
   * Subscribe to realtime updates (optional advanced feature)
   */
  static subscribeToUploads(callback: (payload: any) => void) {
    // TODO: Use Supabase Realtime if upload_queue table exists
    return supabase
      .channel('upload_queue_realtime')
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'upload_queue'
      }, callback)
      .subscribe();
  }
}
```

### **Nouvelle Page: `/pages/monitoring.tsx`**

Structure de la page:

```typescript
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MonitoringService, UploadMonitorItem, MonitoringStats } from '../lib/monitoringService';

export default function MonitoringPage() {
  const [uploads, setUploads] = useState<UploadMonitorItem[]>([]);
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    // TODO: Load uploads + stats
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">📊 Monitoring Temps Réel</h1>
              <p className="text-gray-600 mt-1">Uploads, logs et bugs en direct</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/">Dashboard</Link>
              <Link href="/bugs">Bugs</Link>
              <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 font-medium text-sm">Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      {/* TODO: Implement stats cards */}

      {/* Top Errors Table */}
      {/* TODO: Implement top errors */}

      {/* Main Content: 2 Columns */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN: Uploads (60% - 2 cols) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">⬆️ Uploads en cours</h2>
              {/* TODO: List uploads */}
            </div>
          </div>

          {/* RIGHT COLUMN: Logs & Bugs (40% - 1 col) */}
          <div className="lg:col-span-1">
            {/* Bugs Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">🐛 Bugs récents</h2>
              {/* TODO: List bugs */}
            </div>

            {/* Errors Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">⚠️ Erreurs Upload</h2>
              {/* TODO: Tabs + error lists */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎨 **DESIGN & UX**

### **Design System (Déjà Existant)**

Réutiliser le design system existant du dashboard:
- **Colors**:
  - Primary: `bg-indigo-600` / `text-indigo-600`
  - Success: `bg-green-500` / `text-green-600`
  - Warning: `bg-yellow-500` / `text-yellow-600`
  - Error: `bg-red-500` / `text-red-600`
  - Info: `bg-blue-500` / `text-blue-600`

- **Shadows**: `shadow`, `shadow-lg`
- **Rounded**: `rounded-lg` (12px)
- **Spacing**: Grid gap-4, gap-6, gap-8

### **Composants Réutilisables**

#### **1. StatCard** (déjà existant dans `/pages/index.tsx`)
Réutiliser le composant existant

#### **2. UploadCard** (NOUVEAU)
```typescript
function UploadCard({ upload }: { upload: UploadMonitorItem }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-3 hover:shadow-md transition-shadow">
      {/* User Info + Video Info + Progress + Actions */}
    </div>
  );
}
```

#### **3. BugListItem** (NOUVEAU - compact version de bug card)
```typescript
function BugListItem({ bug }) {
  return (
    <div className="border-b border-gray-100 py-3 cursor-pointer hover:bg-gray-50">
      {/* Icon + Message + User + Timestamp */}
    </div>
  );
}
```

### **Animations**

- **Progress bar**: Animation smooth avec `transition-all duration-300`
- **Status badges**: Pulse animation pour `uploading` status
- **Live indicator**: `animate-pulse` sur le dot vert
- **New items**: Fade-in animation quand nouveau upload apparaît

---

## 🚀 **IMPLÉMENTATION STEP-BY-STEP**

### **PHASE 1: Setup Minimal (Sans upload_queue table)**

**Objectif**: Créer la page avec données existantes uniquement

1. **Créer `/lib/monitoringService.ts`**:
   - Implémenter méthodes basiques avec queries sur `videos`, `bug_reports`, `transcription_jobs`
   - Pas de vraie progression, juste historique 24h

2. **Créer `/pages/monitoring.tsx`**:
   - Structure layout 2 colonnes
   - Stats row basiques
   - Liste uploads basée sur `videos` (dernières 24h)
   - Liste bugs réutilisant `bugService.ts`

3. **Ajouter lien dans navigation**:
   - Modifier header du dashboard principal (`/pages/index.tsx`)
   - Ajouter bouton "📊 Monitoring" à côté de "🐛 Bugs"

**Résultat**: Dashboard fonctionnel affichant historique, sans vraie progression temps réel.

---

### **PHASE 2: Table `upload_queue` (Temps Réel Complet)**

**Objectif**: Implémenter vraie progression avec table dédiée

#### **STEP 1: Migration Database**

Créer fichier SQL `supabase/migrations/XXX_create_upload_queue.sql`:

```sql
-- Create upload_queue table for real-time upload monitoring
CREATE TABLE upload_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  video_title TEXT,
  filename TEXT NOT NULL,
  file_size BIGINT, -- bytes
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'uploading' | 'completed' | 'failed'
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  upload_speed NUMERIC, -- MB/s
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'uploading', 'completed', 'failed'))
);

-- Index for performance
CREATE INDEX idx_upload_queue_user_id ON upload_queue(user_id);
CREATE INDEX idx_upload_queue_status ON upload_queue(status);
CREATE INDEX idx_upload_queue_started_at ON upload_queue(started_at DESC);

-- RLS Policies
ALTER TABLE upload_queue ENABLE ROW LEVEL SECURITY;

-- Users can only see their own uploads
CREATE POLICY "Users can view own uploads"
  ON upload_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own uploads
CREATE POLICY "Users can insert own uploads"
  ON upload_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own uploads
CREATE POLICY "Users can update own uploads"
  ON upload_queue FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_upload_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_upload_queue_updated_at
  BEFORE UPDATE ON upload_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_upload_queue_updated_at();

-- Cleanup old completed uploads (keep only last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_upload_queue()
RETURNS void AS $$
BEGIN
  DELETE FROM upload_queue
  WHERE status IN ('completed', 'failed')
  AND completed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Run cleanup daily (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-upload-queue', '0 2 * * *', 'SELECT cleanup_old_upload_queue()');
```

Appliquer la migration:
```bash
supabase db push
```

#### **STEP 2: Modifications App Mobile**

**Fichier à modifier**: `src/services/import/VideoUploader.ts`

Ajouter méthodes pour créer/update records dans `upload_queue`:

```typescript
// Au début de uploadVideo():
private static async createUploadQueueRecord(
  userId: string,
  videoTitle: string,
  fileName: string,
  fileSize: number
): Promise<string> {
  const { data, error } = await supabase
    .from('upload_queue')
    .insert({
      user_id: userId,
      video_title: videoTitle,
      filename: fileName,
      file_size: fileSize,
      status: 'pending',
      progress: 0,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

// Pendant l'upload (dans progress callback):
private static async updateUploadProgress(
  queueId: string,
  progress: number,
  uploadSpeed?: number
): Promise<void> {
  await supabase
    .from('upload_queue')
    .update({
      status: 'uploading',
      progress: Math.floor(progress),
      upload_speed: uploadSpeed,
    })
    .eq('id', queueId);
}

// À la fin de l'upload (succès):
private static async completeUploadQueue(queueId: string): Promise<void> {
  await supabase
    .from('upload_queue')
    .update({
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
    })
    .eq('id', queueId);
}

// En cas d'erreur:
private static async failUploadQueue(
  queueId: string,
  errorMessage: string,
  retryCount: number
): Promise<void> {
  await supabase
    .from('upload_queue')
    .update({
      status: 'failed',
      error_message: errorMessage,
      retry_count: retryCount,
    })
    .eq('id', queueId);
}
```

**Intégration dans `uploadVideo()`**:

```typescript
static async uploadVideo(
  videoUri: string,
  fileName: string,
  userId: string,
  options?: UploadOptions
): Promise<UploadResult> {
  // ✅ STEP 1: Create upload_queue record
  const queueId = await this.createUploadQueueRecord(
    userId,
    options?.videoTitle || 'Untitled',
    fileName,
    fileSize
  );

  try {
    // ✅ STEP 2: Upload with progress tracking
    const uploadTask = FileSystem.createUploadTask(
      uploadUrl,
      videoUri,
      {
        // ...
      },
      (data: any) => {
        const percent = (data.totalBytesSent / data.totalBytesExpectedToSend) * 100;
        const uploadSpeed = // Calculate MB/s based on elapsed time

        // ✅ Update upload_queue in real-time
        this.updateUploadProgress(queueId, percent, uploadSpeed).catch(console.error);

        // Original progress callback
        if (options?.onProgress) {
          options.onProgress({ ... });
        }
      }
    );

    const result = await uploadTask.uploadAsync();

    // ✅ STEP 3: Mark as completed
    await this.completeUploadQueue(queueId);

    return { fileName, fileSize, publicUrl: ... };

  } catch (error) {
    // ✅ STEP 4: Mark as failed
    await this.failUploadQueue(queueId, error.message, retryCount);
    throw error;
  }
}
```

#### **STEP 3: Mettre à jour `monitoringService.ts`**

Implémenter les queries sur `upload_queue`:

```typescript
static async getActiveUploads(): Promise<UploadMonitorItem[]> {
  const { data, error } = await supabase
    .from('upload_queue')
    .select(`
      *,
      profiles!inner (
        email
      )
    `)
    .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('started_at', { ascending: false });

  if (error) throw error;

  return data.map(item => ({
    id: item.id,
    userId: item.user_id,
    userEmail: item.profiles.email,
    videoTitle: item.video_title,
    filename: item.filename,
    fileSize: item.file_size,
    status: item.status,
    progress: item.progress,
    uploadSpeed: item.upload_speed,
    retryCount: item.retry_count,
    errorMessage: item.error_message,
    startedAt: item.started_at,
    completedAt: item.completed_at,
    elapsedTime: item.completed_at
      ? (new Date(item.completed_at).getTime() - new Date(item.started_at).getTime()) / 1000
      : (Date.now() - new Date(item.started_at).getTime()) / 1000,
    metadata: item.metadata,
  }));
}
```

#### **STEP 4: Activer Realtime (Optionnel)**

Dans `/pages/monitoring.tsx`:

```typescript
useEffect(() => {
  // Initial load
  loadData();

  // Subscribe to realtime changes
  const channel = MonitoringService.subscribeToUploads((payload) => {
    console.log('Realtime update:', payload);
    // Update state based on event type (INSERT, UPDATE, DELETE)
    if (payload.eventType === 'INSERT') {
      setUploads(prev => [payload.new, ...prev]);
    } else if (payload.eventType === 'UPDATE') {
      setUploads(prev =>
        prev.map(u => u.id === payload.new.id ? { ...u, ...payload.new } : u)
      );
    }
  });

  return () => {
    channel.unsubscribe();
  };
}, []);
```

---

### **PHASE 3: Polish & Features Avancées**

1. **Filtres & Recherche**:
   - Filter par status (pending, uploading, completed, failed)
   - Filter par utilisateur (search email)
   - Filter par date range

2. **Export CSV/JSON**:
   - Bouton "Export" pour exporter les uploads en CSV
   - Bouton "Export Logs" pour erreurs

3. **Notifications Desktop**:
   - Utiliser `Notification API` pour notifier nouveaux bugs critiques
   - Demander permission au chargement de la page

4. **Dark Mode**:
   - Toggle dark mode (optionnel)

5. **Graphiques Avancés**:
   - Graphique upload speed over time (LineChart)
   - Distribution des erreurs (PieChart)
   - Timeline des uploads (Gantt-style)

---

## ✅ **CHECKLIST D'IMPLÉMENTATION**

### **Phase 1: MVP (Données Existantes)**

- [ ] Créer `/lib/monitoringService.ts` avec queries basiques
- [ ] Implémenter `getActiveUploads()` basé sur table `videos`
- [ ] Implémenter `getMonitoringStats()`
- [ ] Implémenter `getTopErrors()`
- [ ] Implémenter `getRecentBugs()` (réutiliser `bugService.ts`)
- [ ] Créer `/pages/monitoring.tsx` avec structure 2 colonnes
- [ ] Implémenter Stats Row (5 cards)
- [ ] Implémenter Top Errors Table
- [ ] Implémenter Left Column: Liste uploads (historique 24h)
- [ ] Implémenter Right Column: Bugs récents
- [ ] Implémenter Right Column: Erreurs upload (tabs)
- [ ] Ajouter lien navigation dans header dashboard
- [ ] Tester avec données réelles
- [ ] Auto-refresh toutes les 5 secondes

### **Phase 2: Temps Réel Complet**

- [ ] Créer migration SQL `upload_queue` table
- [ ] Appliquer migration dans Supabase
- [ ] Modifier `VideoUploader.ts`:
  - [ ] Ajouter `createUploadQueueRecord()`
  - [ ] Ajouter `updateUploadProgress()`
  - [ ] Ajouter `completeUploadQueue()`
  - [ ] Ajouter `failUploadQueue()`
  - [ ] Intégrer dans `uploadVideo()` main flow
- [ ] Tester app mobile avec nouvelle table
- [ ] Mettre à jour `monitoringService.ts` pour query `upload_queue`
- [ ] Implémenter `subscribeToUploads()` pour Realtime
- [ ] Activer Realtime dans `/pages/monitoring.tsx`
- [ ] Tester progression temps réel
- [ ] Ajouter cleanup automatique (7 jours)

### **Phase 3: Polish**

- [ ] Ajouter filtres (status, user, date)
- [ ] Implémenter recherche
- [ ] Ajouter export CSV/JSON
- [ ] Ajouter notifications desktop (bugs critiques)
- [ ] Ajouter graphiques avancés
- [ ] Dark mode toggle (optionnel)
- [ ] Mobile responsive design
- [ ] Loading states + error handling
- [ ] Empty states (no uploads, no bugs)

---

## 📚 **RESSOURCES & RÉFÉRENCES**

### **Documentation Supabase**
- [Realtime](https://supabase.com/docs/guides/realtime)
- [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

### **Documentation Next.js**
- [Pages Router](https://nextjs.org/docs/pages)
- [API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)

### **Documentation Tailwind CSS**
- [Utility Classes](https://tailwindcss.com/docs)

### **Fichiers Existants à Consulter**
- `/pages/index.tsx` - Dashboard principal (design reference)
- `/pages/bugs.tsx` - Page bugs (structure similar)
- `/lib/adminService.ts` - Service existant (patterns)
- `/lib/bugService.ts` - Bug handling (reuse logic)
- Mobile app:
  - `src/services/import/VideoUploader.ts` (upload logic)
  - `src/services/import/ImportQueueManager.ts` (queue state)
  - `src/services/videoBackupService.ts` (backup logic)

---

## 🎁 **BONUS: IDÉES FEATURES SUPPLÉMENTAIRES**

1. **Upload Speed Test**:
   - Bouton "Test Vitesse" qui upload un fichier test et mesure la vitesse
   - Affiche graphique vitesse réseau au fil du temps

2. **User Activity Timeline**:
   - Timeline par utilisateur montrant tous ses uploads chronologiquement
   - Click sur user → vue dédiée

3. **Alert System**:
   - Configurer des alertes (ex: "Si > 5 échecs en 10min, notification")
   - Email notifications pour admins

4. **Compare Mode**:
   - Comparer performance upload entre différentes périodes
   - "Aujourd'hui vs Hier" ou "Cette semaine vs Semaine dernière"

5. **Retry Failed Uploads (Remote)**:
   - Bouton admin "Force Retry" qui envoie notification push à l'app mobile
   - L'app mobile re-tente l'upload automatiquement

6. **Video Preview**:
   - Dans modal détails upload, afficher thumbnail ou preview vidéo
   - Stream vidéo directement depuis Supabase Storage

7. **User Profiling**:
   - Profil détaillé par utilisateur:
     - Historique uploads
     - Taux de succès
     - Vitesse upload moyenne
     - Bugs remontés

---

## 🚨 **POINTS D'ATTENTION & PIÈGES À ÉVITER**

### **1. Performance**

- ⚠️ **Problème**: Requêtes lourdes si beaucoup d'uploads
- ✅ **Solution**:
  - Limiter à 50-100 uploads max affichés
  - Paginer si > 100 items
  - Indexes sur `upload_queue` (user_id, status, started_at)

### **2. Realtime Limits**

- ⚠️ **Problème**: Supabase Realtime a des limites (connections, messages/sec)
- ✅ **Solution**:
  - Combiner Realtime + Polling (Realtime pour nouveaux items, polling pour updates)
  - Throttle updates (max 1 update/seconde par upload)

### **3. RLS Security**

- ⚠️ **Problème**: Dashboard admin doit voir TOUS les uploads (pas juste les siens)
- ✅ **Solution**:
  - Utiliser `service_role` key dans dashboard (PAS anon key)
  - Ou créer policy admin: `(auth.jwt() ->> 'role' = 'admin')`

### **4. Stale Data**

- ⚠️ **Problème**: Uploads peuvent rester "uploading" si app crash
- ✅ **Solution**:
  - Cleanup job qui marque comme "failed" les uploads > 30min en status "uploading"
  - App mobile doit cleanup au restart (update status si stale)

### **5. Testing**

- ⚠️ **Problème**: Difficile de tester sans vrais uploads
- ✅ **Solution**:
  - Créer script de seed avec fake uploads
  - Ou ajouter bouton "Generate Fake Uploads" (dev only)

---

## 📝 **EXEMPLE COMPLET DE QUERY COMPLEXE**

Query pour récupérer uploads avec toutes les infos nécessaires:

```sql
WITH upload_stats AS (
  SELECT
    uq.id,
    uq.user_id,
    uq.video_title,
    uq.filename,
    uq.file_size,
    uq.status,
    uq.progress,
    uq.upload_speed,
    uq.retry_count,
    uq.error_message,
    uq.started_at,
    uq.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(uq.completed_at, NOW()) - uq.started_at)) as elapsed_seconds,
    p.email as user_email,
    p.first_name,
    p.last_name,
    v.id as video_id,
    v.thumbnail_path,
    tj.status as transcription_status
  FROM upload_queue uq
  LEFT JOIN profiles p ON uq.user_id = p.id
  LEFT JOIN videos v ON v.file_path ILIKE '%' || uq.filename || '%'
  LEFT JOIN transcription_jobs tj ON v.id = tj.video_id
  WHERE uq.started_at >= NOW() - INTERVAL '24 hours'
)
SELECT
  *,
  CASE
    WHEN status = 'uploading' AND elapsed_seconds > 1800 THEN true
    ELSE false
  END as is_stale
FROM upload_stats
ORDER BY
  CASE
    WHEN status = 'uploading' THEN 1
    WHEN status = 'pending' THEN 2
    WHEN status = 'failed' THEN 3
    WHEN status = 'completed' THEN 4
  END,
  started_at DESC
LIMIT 100;
```

---

## 🎯 **RÉSUMÉ: TON TRAVAIL**

Tu dois:

1. **Créer une nouvelle page `/monitoring`** dans le dashboard admin existant
2. **Implémenter 2 colonnes**:
   - Gauche (60%): Liste uploads en cours/récents avec progress bars
   - Droite (40%): Bugs + Erreurs upload
3. **Afficher stats en haut**: Uploads actifs, complétés, échecs, vitesse, bugs
4. **Auto-refresh** toutes les 5 secondes (ou Realtime si Phase 2)
5. **Réutiliser design** du dashboard existant (Tailwind + composants existants)

**Phase 1** (MVP): Utiliser tables existantes (`videos`, `bug_reports`, `transcription_jobs`)

**Phase 2** (Complet): Créer table `upload_queue` + modifier app mobile + Realtime

**Phase 3** (Polish): Filtres, export, notifications, graphiques

---

## ✨ **BON COURAGE!**

Ce prompt contient TOUT ce dont tu as besoin pour implémenter cette feature. Si tu as des questions ou besoin de clarifications:

1. Consulte les fichiers existants mentionnés
2. Regarde la structure database Supabase
3. Teste avec des données de dev first
4. Itère phase par phase

**Tu as toutes les clés en main. Go build! 🚀**
