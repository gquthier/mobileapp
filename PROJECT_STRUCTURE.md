# 📁 Structure du Projet

## 🗂️ Organisation des Fichiers

Le projet a été réorganisé pour une meilleure maintenabilité. Voici la structure actuelle :

```
mobileapp/
├── 📚 docs/                        # Documentation complète
│   ├── features/                   # Documentation des fonctionnalités
│   ├── setup/                      # Guides d'installation
│   ├── troubleshooting/            # Guides de dépannage
│   └── README.md                   # Index de la documentation
│
├── 🔧 scripts/                     # Scripts utilitaires
│   ├── database/                   # Scripts SQL
│   ├── migrations/                 # Scripts de migration
│   ├── testing/                    # Scripts de test
│   └── README.md                   # Guide d'utilisation des scripts
│
├── 🗄️ archive/                     # Fichiers archivés
│   ├── backups/                    # Sauvegardes (*.backup, old package-lock)
│   └── old-configs/                # Anciennes configurations
│
├── 🎨 assets/                      # Ressources médias
│   ├── icons/                      # Icônes de l'app
│   ├── logos/                      # Logos
│   ├── ui-elements/                # Éléments d'interface
│   ├── icon.png                    # Icône principale
│   ├── adaptive-icon.png           # Icône Android
│   ├── splash-icon.png             # Splash screen
│   └── favicon.png                 # Favicon
│
├── 📱 src/                         # Code source de l'application
│   ├── components/                 # Composants React réutilisables
│   ├── screens/                    # Écrans de l'application
│   ├── navigation/                 # Configuration de navigation
│   ├── services/                   # Services backend
│   ├── contexts/                   # Contextes React
│   ├── hooks/                      # Hooks personnalisés
│   ├── styles/                     # Système de design
│   ├── types/                      # Types TypeScript
│   ├── data/                       # Données statiques
│   └── lib/                        # Librairies et utilitaires
│
├── 🔥 supabase/                    # Backend Supabase
│   ├── functions/                  # Edge Functions (IA)
│   └── migrations/                 # Migrations de base de données
│
├── 🤖 admin-dashboard/             # Dashboard administrateur
│
├── 📄 Configuration Files (Racine)
│   ├── CLAUDE.md                   # 📘 Documentation principale du projet
│   ├── package.json                # Dépendances npm
│   ├── app.json                    # Configuration Expo
│   ├── tsconfig.json               # Configuration TypeScript
│   ├── eas.json                    # Configuration EAS Build
│   ├── .gitignore                  # Git ignore rules
│   └── App.tsx                     # Point d'entrée de l'app
│
└── 📝 PROJECT_STRUCTURE.md         # Ce fichier
```

## 🎯 Fichiers Clés

### Documentation Principale
- **CLAUDE.md** - Analyse complète du projet, architecture, et guide de compréhension

### Configuration
- **package.json** - Dépendances et scripts npm
- **app.json** - Configuration Expo (nom, version, permissions)
- **tsconfig.json** - Configuration TypeScript
- **eas.json** - Configuration pour builds de production

### Code Source
- **App.tsx** - Point d'entrée, initialisation des fonts et contextes
- **src/navigation/AppNavigator.tsx** - Configuration de la navigation principale
- **src/lib/supabase.ts** - Client Supabase et types de base de données

## 📚 Accès Rapide à la Documentation

### Pour Démarrer
```bash
# Installation
cat docs/setup/SETUP_INSTRUCTIONS.md

# Configuration finale
cat docs/setup/FINAL_SETUP.md
```

### Comprendre une Fonctionnalité
```bash
# Système de questions
cat docs/features/USER_QUESTIONS_SYSTEM.md

# Système de chapitres
cat docs/features/CHAPTER_SYSTEM_IMPLEMENTATION.md
```

### Résoudre un Problème
```bash
# Nettoyer le cache
cat docs/troubleshooting/CACHE_CLEAR_COMMANDS.md

# Debug transcription
cat docs/troubleshooting/TRANSCRIPTION-FIXED.md
```

## 🔧 Utiliser les Scripts

### Scripts de Base de Données
```bash
# Voir tous les scripts SQL
ls scripts/database/

# Exécuter une migration
./scripts/migrations/apply-chapter-migration.sh
```

### Scripts de Test
```bash
# Tester AssemblyAI
node scripts/testing/test-assemblyai.js

# Créer un utilisateur de test
node scripts/testing/create-test-user.js
```

## 📊 Statistiques

- **30 fichiers** de documentation organisés
- **35 scripts** utilitaires classés
- **5 fichiers** archivés (backups)
- **Assets** organisés par catégorie

## 🆘 Aide

Pour toute question, consultez :
1. **CLAUDE.md** - Vue d'ensemble du projet
2. **docs/README.md** - Index de la documentation
3. **scripts/README.md** - Guide des scripts utilitaires
