# 📊 Dashboard Admin - Mobile App

Dashboard administrateur web pour monitorer l'utilisation de l'application mobile.

## ⚠️ Important

Ce dashboard est **séparé du projet mobile** et ne doit **PAS être inclus dans la soumission Apple**. Il s'agit d'un outil interne d'administration uniquement.

## ⚠️ Configuration REQUISE

**Le dashboard ne fonctionnera PAS sans la clé SERVICE_ROLE de Supabase!**

Suivez les instructions dans [SETUP.md](./SETUP.md) pour configurer la connexion Supabase.

### Résumé rapide:
1. Récupérez votre `service_role` key dans Supabase Dashboard → Settings → API
2. Créez `.env.local` avec: `NEXT_PUBLIC_SUPABASE_SERVICE_KEY=votre_clé`
3. Relancez le serveur

## 🚀 Installation

```bash
cd admin-dashboard
npm install
```

## 🏃 Lancement en développement

```bash
npm run dev
```

Le dashboard sera accessible sur **http://localhost:3001**

## 📦 Build pour production

```bash
npm run build
npm start
```

## 📊 Statistiques disponibles

### Vue d'ensemble
- **Utilisateurs total** - Nombre total d'utilisateurs inscrits
- **Utilisateurs actifs** - Actifs sur 7 et 30 jours
- **Vidéos total** - Nombre total de vidéos uploadées
- **Durée totale** - Temps total de vidéos enregistrées

### Métriques utilisateurs
- **Moyenne vidéos/user** - Moyenne et médiane de vidéos par utilisateur
- **Durée moyenne vidéo** - Durée moyenne des vidéos
- **Utilisateur star** - Utilisateur le plus actif
- **Taux d'activité** - Pourcentage d'utilisateurs actifs

### Transcription & IA
- **Transcriptions** - Total et statut (complétées, en cours, échouées)
- **Taux de succès** - Pourcentage de transcriptions réussies
- **Highlights générés** - Nombre de moments clés extraits
- **Questions générées** - Nombre de questions personnalisées créées

### Coûts API
- **AssemblyAI** - Coût estimé de la transcription
  - Minutes transcrites
  - Coût par minute: ~$0.015
- **OpenAI** - Coût estimé des highlights et questions
  - Coût par requête: ~$0.00015 par 1K tokens
- **Total** - Somme des coûts estimés

### Upload & Stockage
- **Vidéos uploadées** - Enregistrées directement dans l'app
- **Vidéos importées** - Importées depuis la galerie
- **Échecs d'upload** - Nombre d'échecs avec backup local
- **Stockage** - Estimation du stockage utilisé (GB)

### Format des vidéos
- **Orientation** - Portrait vs. Paysage (graphique pie)
- **Source** - Enregistrées vs. Importées (graphique pie)

### Croissance
- **Graphique de croissance** - Évolution sur 30 jours
  - Nouveaux utilisateurs par jour
  - Nouvelles vidéos par jour
- **Métriques mensuelles** - Utilisateurs et vidéos ce mois

### Langues
- **Langues populaires** - Top 5 des langues utilisées dans les transcriptions (graphique bar)

## 🔒 Sécurité

Ce dashboard se connecte directement à Supabase avec les mêmes credentials que l'app mobile. **Ne partagez jamais ce dashboard publiquement**.

Pour une utilisation en production, il est recommandé de :
1. Créer un service role key Supabase dédié
2. Ajouter une authentification admin
3. Héberger sur un sous-domaine privé avec authentification

## 🛠️ Technologies utilisées

- **Next.js 14** - Framework React pour le web
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS utility-first
- **Recharts** - Bibliothèque de graphiques
- **Supabase** - Backend et base de données

## 📁 Structure du projet

```
admin-dashboard/
├── pages/
│   ├── index.tsx          # Page principale du dashboard
│   └── _app.tsx           # Configuration de l'app Next.js
├── lib/
│   ├── supabase.ts        # Client Supabase
│   └── adminService.ts    # Service pour récupérer les stats
├── styles/
│   └── globals.css        # Styles globaux avec Tailwind
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── next.config.js
```

## 🔄 Rafraîchissement des données

Le dashboard se rafraîchit automatiquement toutes les 60 secondes. Vous pouvez aussi tirer vers le bas (pull-to-refresh) pour forcer un rafraîchissement manuel.

## 🐛 Debugging

Si les statistiques ne s'affichent pas:
1. Vérifiez que Supabase est accessible
2. Vérifiez les credentials dans `lib/supabase.ts`
3. Ouvrez la console du navigateur (F12) pour voir les erreurs
4. Vérifiez que les tables existent dans Supabase

## 📝 Ajout de nouvelles statistiques

Pour ajouter une nouvelle statistique:

1. Ajoutez-la à l'interface `AdminStats` dans `lib/adminService.ts`
2. Ajoutez la logique de récupération dans `AdminService`
3. Affichez-la dans `pages/index.tsx` avec un composant `StatCard` ou un graphique

## 🌐 Déploiement

Le dashboard peut être déployé sur:
- **Vercel** (recommandé pour Next.js)
- **Netlify**
- **Hébergement custom avec Node.js**

```bash
# Déploiement sur Vercel
npm install -g vercel
vercel
```

## ⚡ Performance

- Toutes les requêtes sont parallélisées pour un chargement rapide
- Les graphiques utilisent ResponsiveContainer pour s'adapter à tous les écrans
- Le dashboard est optimisé pour les mobiles, tablettes et desktop

## 📞 Support

Pour toute question ou problème, vérifiez:
1. Les logs de la console
2. Les erreurs réseau dans l'onglet Network
3. La connexion à Supabase

---

**🎉 Dashboard prêt à l'emploi!** Lancez `npm run dev` et ouvrez http://localhost:3001
