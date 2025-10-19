# 🔧 Scripts Utilitaires

## 📁 Structure des Scripts

Les scripts sont organisés par catégorie :

### 🗄️ Database (Base de Données)
Scripts SQL pour configurer et maintenir la base de données Supabase

- **fix-rls-policies.sql** - Correction des Row Level Security policies
- **create-profile-trigger.sql** - Trigger de création de profil utilisateur
- **create-storage-bucket.sql** - Création du bucket de stockage vidéo
- **apply-thumbnail-trigger.sql** - Trigger pour génération de thumbnails
- **setup-database.js** - Script d'initialisation de la base de données

### 🔄 Migrations
Scripts pour migrer les données et structures

- **apply-chapter-migration.sh** - Migration du système de chapitres
- **apply-user-questions-migration.sh** - Migration des questions utilisateur
- **apply-language-update.sh** - Mise à jour des langues
- **apply-migration-api.sh** - Migration via API
- **apply-migration.js** - Script de migration JavaScript
- **apply_migration.py** - Script de migration Python
- **deploy-thumbnail-system.sh** - Déploiement du système de thumbnails
- **fix-supabase-policies.sh** - Correction des policies Supabase

### 🧪 Testing
Scripts de test pour différentes fonctionnalités

#### Tests de Transcription
- **test-assemblyai.js** - Test complet AssemblyAI
- **test-assemblyai-simple.js** - Test simple AssemblyAI
- **debug-transcription.js** - Script de débogage transcription

#### Tests Utilisateurs
- **create-test-user.js** - Création d'utilisateur de test
- **fix-user-profile.js** - Correction de profil utilisateur

### 🛠️ Utilitaires
Scripts utilitaires généraux

- **open-xcode.sh** - Ouvrir le projet dans Xcode

## 🚀 Utilisation

### Scripts de Base de Données

```bash
# Initialiser la base de données
node scripts/database/setup-database.js
```

### Scripts de Migration

```bash
# Migrer le système de chapitres
./scripts/migrations/apply-chapter-migration.sh
```

### Scripts de Test

```bash
# Tester AssemblyAI
node scripts/testing/test-assemblyai.js
```
