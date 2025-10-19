# 📊 Monitoring Page - Implementation Complete (Phase 1 MVP)

## ✅ Ce qui a été implémenté

### 1. **Service Backend** (`lib/monitoringService.ts`)

Nouveau service TypeScript avec les méthodes suivantes:

- `getActiveUploads()` - Récupère les uploads des dernières 24h depuis la table `videos`
- `getMonitoringStats()` - Calcule les statistiques en temps réel
- `getTopErrors()` - Top 5 des erreurs les plus fréquentes (24h)
- `getRecentBugs()` - Liste des 20 derniers bugs
- `getUploadErrors()` - Erreurs d'upload (7 derniers jours)
- `getTranscriptionErrors()` - Erreurs de transcription (7 derniers jours)
- `getNetworkErrors()` - Erreurs réseau (24h)

**Note Phase 1**: Le statut des uploads est **déduit** à partir des timestamps et metadata de la table `videos` existante. Il n'y a pas encore de vraie progression en temps réel.

### 2. **Page Monitoring** (`pages/monitoring.tsx`)

Nouvelle page complète avec:

#### **Header**
- Titre "📊 Monitoring Temps Réel"
- Liens de navigation vers Dashboard et Bugs
- Indicateur "Live" avec animation
- Timestamp de dernière mise à jour

#### **Stats Row (5 cards)**
- ⬆️ **Uploads actifs** - Nombre d'uploads en cours
- ✅ **Complétés (24h)** - Uploads réussis + taux de succès
- ❌ **Échecs (24h)** - Uploads échoués + pourcentage
- ⚡ **Vitesse moyenne** - MB/s des derniers uploads
- 🐛 **Bugs nouveaux** - Bugs du jour + critiques

#### **Top Errors Table**
- Table des 5 erreurs les plus fréquentes (24h)
- Affiche: Message d'erreur, Occurrences, Utilisateurs uniques, % du total

#### **Colonne Gauche (60% largeur) - Uploads**
- Liste scrollable des uploads des dernières 24h
- Pour chaque upload:
  - **User info**: Avatar + email + titre vidéo
  - **Status badge**: 🟡 pending, 🔵 uploading, 🟢 completed, 🔴 failed
  - **Type**: 📹 Recorded ou 📸 Imported
  - **Info**: Taille fichier + temps écoulé
  - **Progress bar** (si status = uploading)
  - **Retry badge** (si retryCount > 0)
  - **Error message** (si status = failed)
  - **Boutons**: "Détails" + "Réessayer" (si failed)
- Modal détails avec toutes les infos + metadata JSON

#### **Colonne Droite (40% largeur) - Bugs & Erreurs**

**Section Bugs récents**:
- Liste des 10 derniers bugs
- Affiche: Icône type, message, email, sévérité, timestamp
- Lien "Voir tous les bugs →" vers `/bugs`

**Section Erreurs (Tabs)**:
- 🚫 **Upload** - Erreurs d'upload (table videos avec uploadFailed)
- 🔴 **Transcription** - Jobs échoués (table transcription_jobs)
- ⚠️ **Réseau** - Erreurs réseau (table bug_reports)

### 3. **Navigation améliorée**

- ✅ Bouton "📊 Monitoring" ajouté dans `/pages/index.tsx`
- ✅ Bouton "📊 Monitoring" ajouté dans `/pages/bugs.tsx`
- ✅ Navigation cohérente entre les 3 pages (Dashboard, Monitoring, Bugs)

### 4. **Auto-refresh**

- ⏱️ Rafraîchissement automatique toutes les **5 secondes**
- Mise à jour de toutes les données (uploads, stats, bugs, erreurs)
- Timestamp visible de la dernière mise à jour

## 🎨 Design System

Le design réutilise le système existant du dashboard:

- **Couleurs**: Indigo (primary), Green (success), Red (error), Blue (info), Orange (warning), Purple (accent)
- **Components**: StatCard, Modal, Tables, Badges, Progress bars
- **Animations**: Pulse (live indicator), Smooth transitions, Progress bar animations
- **Responsive**: Grid layout adaptatif (lg:grid-cols-3)

## 🚀 Comment tester

### 1. Démarrer le dashboard

```bash
cd admin-dashboard
npm run dev
```

Le dashboard sera accessible sur: **http://localhost:3001**

### 2. Navigation

- Accueil: http://localhost:3001/ (Dashboard principal)
- Monitoring: http://localhost:3001/monitoring ⬅️ **NOUVELLE PAGE**
- Bugs: http://localhost:3001/bugs

### 3. Ce que vous verrez

**Si vous avez des données dans Supabase:**
- Les uploads des dernières 24h apparaîtront dans la colonne gauche
- Les stats seront calculées automatiquement
- Les bugs récents apparaîtront dans la colonne droite

**Si vous n'avez pas encore de données:**
- Messages "Aucun upload récent (24h)"
- Stats à zéro
- Messages d'empty states

### 4. Tester avec l'app mobile

Pour voir des données réelles:

1. **Enregistrer une vidéo** dans l'app mobile
2. Attendre que l'upload se termine
3. Rafraîchir la page `/monitoring`
4. Vous devriez voir l'upload apparaître avec status "completed"

## 📊 Phase 1 (MVP) - Limitations

### ⚠️ Pas de vraie progression temps réel

Actuellement, le statut des uploads est **déduit** à partir de:

- Si `created_at` < 5min ET pas de `file_path` → status = "uploading"
- Si `metadata.uploadFailed` = true → status = "failed"
- Si `file_path` existe → status = "completed"

**Pourquoi?**

Les données du `ImportQueueService` sont stockées dans **AsyncStorage LOCAL** sur chaque téléphone. Le dashboard admin ne peut pas y accéder directement.

### Solutions pour Phase 2 (Temps Réel Complet)

Pour avoir la vraie progression en temps réel, il faudrait:

#### **Option A: Créer table `upload_queue` dans Supabase** (RECOMMANDÉ)

```sql
CREATE TABLE upload_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  video_title TEXT,
  filename TEXT NOT NULL,
  file_size BIGINT,
  status TEXT NOT NULL, -- 'pending' | 'uploading' | 'completed' | 'failed'
  progress INTEGER DEFAULT 0, -- 0-100
  upload_speed NUMERIC, -- MB/s
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Modifications app mobile nécessaires:**
- Modifier `VideoUploader.ts` pour INSERT/UPDATE dans `upload_queue`
- Créer record au début de l'upload (status='pending')
- UPDATE progress pendant l'upload
- UPDATE status='completed' à la fin

#### **Option B: Utiliser Supabase Realtime**

Activer les subscriptions WebSocket:

```typescript
const channel = supabase
  .channel('upload_queue_realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'upload_queue'
  }, (payload) => {
    // Update UI in real-time
  })
  .subscribe();
```

## 📈 Métriques disponibles

### Stats en temps réel:
- ✅ Uploads actifs (< 30min sans file_path)
- ✅ Uploads complétés aujourd'hui
- ✅ Uploads échoués aujourd'hui
- ✅ Taux de succès (%)
- ✅ Vitesse upload moyenne (MB/s)
- ✅ Nouveaux bugs aujourd'hui
- ✅ Bugs critiques aujourd'hui

### Erreurs trackées:
- ✅ Échecs d'upload (metadata.uploadFailed)
- ✅ Échecs de transcription (transcription_jobs.status = 'failed')
- ✅ Erreurs réseau (bug_reports.error_type = 'network')
- ✅ Top 5 erreurs les plus fréquentes (24h)

### Historique:
- ✅ Uploads des dernières 24h
- ✅ Erreurs upload des 7 derniers jours
- ✅ Erreurs transcription des 7 derniers jours
- ✅ Erreurs réseau des dernières 24h

## 🔧 Architecture Technique

### Services

```
admin-dashboard/
├── lib/
│   ├── supabase.ts           # Client Supabase (service_role key)
│   ├── adminService.ts        # Stats dashboard principal
│   ├── bugService.ts          # Gestion bugs
│   └── monitoringService.ts   # ✨ NOUVEAU - Monitoring uploads
```

### Pages

```
admin-dashboard/
├── pages/
│   ├── index.tsx              # Dashboard principal (modifié - lien monitoring)
│   ├── bugs.tsx               # Page bugs (modifié - lien monitoring)
│   └── monitoring.tsx         # ✨ NOUVEAU - Page monitoring
```

### Queries Supabase

**getActiveUploads():**
```sql
SELECT v.*, p.email
FROM videos v
JOIN profiles p ON v.user_id = p.id
WHERE v.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY v.created_at DESC;
```

**getMonitoringStats():**
- Count uploads today (videos.created_at >= today)
- Count failed uploads (videos.metadata->>'uploadFailed' = 'true')
- Count active uploads (recent + no file_path)
- Count bugs today (bug_reports.created_at >= today)
- Average upload speed (from metadata)

**getTopErrors():**
```sql
SELECT error_message, COUNT(*) as count, COUNT(DISTINCT user_id) as unique_users
FROM bug_reports
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY error_message
ORDER BY count DESC
LIMIT 5;
```

## 🎯 Prochaines étapes (Phase 2)

Si tu veux implémenter la vraie progression temps réel:

1. **Créer migration** `upload_queue` table (voir SQL ci-dessus)
2. **Modifier `VideoUploader.ts`** dans l'app mobile
3. **Update `monitoringService.ts`** pour query `upload_queue` au lieu de `videos`
4. **Activer Realtime** pour push updates instantanés
5. **Ajouter filtres** (par status, par user, par date range)
6. **Export CSV/JSON** des uploads et erreurs

## 📚 Ressources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Pages Router**: https://nextjs.org/docs/pages
- **Tailwind CSS**: https://tailwindcss.com/docs
- **date-fns**: https://date-fns.org/docs

## ✅ Checklist

- [x] Service `monitoringService.ts` créé
- [x] Page `/monitoring.tsx` créée
- [x] Stats row (5 cards) implémentées
- [x] Top errors table implémentée
- [x] Colonne uploads (60%) implémentée
- [x] Colonne bugs & erreurs (40%) implémentée
- [x] Modal détails upload implémentée
- [x] Auto-refresh (5 secondes) implémenté
- [x] Navigation mise à jour (liens ajoutés)
- [x] Testé - compile sans erreur ✅
- [ ] **Phase 2**: Table `upload_queue` (optionnel)
- [ ] **Phase 2**: Modifications app mobile (optionnel)
- [ ] **Phase 2**: Supabase Realtime (optionnel)

## 🎉 Résultat

Tu as maintenant un **dashboard de monitoring temps réel fonctionnel** qui affiche:

- ✅ Tous les uploads des dernières 24h
- ✅ Statistiques en temps réel (success rate, vitesse, bugs)
- ✅ Top 5 des erreurs les plus fréquentes
- ✅ Liste des bugs récents
- ✅ Erreurs d'upload, transcription et réseau
- ✅ Auto-refresh toutes les 5 secondes
- ✅ Modal détails pour chaque upload
- ✅ Design cohérent avec le reste du dashboard

**Phase 1 (MVP) terminée! 🚀**

Pour aller plus loin, implémente la Phase 2 avec la table `upload_queue` pour avoir la vraie progression en temps réel.
