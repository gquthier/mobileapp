# 📊 Dashboard Admin PRO - Proposition Complète des Métriques

## 🎯 Objectif
Créer un dashboard de pilotage professionnel avec **le maximum de données exploitables** pour comprendre l'usage de l'application, l'engagement des utilisateurs, et optimiser l'expérience.

---

## 📋 TABLE DES MATIÈRES

1. [Métriques Utilisateurs](#1-métriques-utilisateurs)
2. [Métriques d'Engagement & Rétention](#2-métriques-dengagement--rétention)
3. [Métriques Vidéos & Contenu](#3-métriques-vidéos--contenu)
4. [Métriques de Temps & Délais](#4-métriques-de-temps--délais)
5. [Métriques d'Upload & Performance](#5-métriques-dupload--performance)
6. [Métriques de Transcription & IA](#6-métriques-de-transcription--ia)
7. [Métriques de Gamification (Momentum)](#7-métriques-de-gamification-momentum)
8. [Métriques de Qualité & Bugs](#8-métriques-de-qualité--bugs)
9. [Métriques Financières & ROI](#9-métriques-financières--roi)
10. [Analytics Avancés & Prédictions](#10-analytics-avancés--prédictions)
11. [Visualisations & Graphiques](#11-visualisations--graphiques)

---

## 1. Métriques Utilisateurs

### 1.1 Vue d'ensemble

| Métrique | Description | Source |
|----------|-------------|--------|
| **Total Utilisateurs** | Nombre total d'inscrits | `COUNT(profiles)` |
| **Utilisateurs Actifs (7j)** | Utilisateurs avec au moins 1 vidéo dans les 7 derniers jours | `JOIN videos WHERE created_at >= NOW() - 7 days` |
| **Utilisateurs Actifs (30j)** | Utilisateurs avec au moins 1 vidéo dans les 30 derniers jours | `JOIN videos WHERE created_at >= NOW() - 30 days` |
| **Utilisateurs Actifs Aujourd'hui** | Utilisateurs ayant uploadé une vidéo aujourd'hui | `videos.created_at >= TODAY` |
| **Taux d'Activation** | % d'utilisateurs avec au moins 1 vidéo | `(users_with_videos / total_users) * 100` |
| **Utilisateurs Inactifs** | Users sans vidéo depuis > 30 jours | Requête custom |
| **Utilisateurs Zombies** | Users avec 0 vidéos | `LEFT JOIN videos WHERE videos.id IS NULL` |

### 1.2 Acquisition & Croissance

| Métrique | Description | Source |
|----------|-------------|--------|
| **Nouveaux Utilisateurs (Aujourd'hui)** | Inscrits aujourd'hui | `profiles.created_at >= TODAY` |
| **Nouveaux Utilisateurs (7j)** | Inscrits dans les 7 derniers jours | `profiles.created_at >= NOW() - 7 days` |
| **Nouveaux Utilisateurs (30j)** | Inscrits dans les 30 derniers jours | `profiles.created_at >= NOW() - 30 days` |
| **Taux de Croissance Hebdo** | Variation % des inscriptions semaine vs semaine précédente | Comparaison temporelle |
| **Taux de Croissance Mensuel** | Variation % des inscriptions mois vs mois précédent | Comparaison temporelle |
| **Graphique Croissance (30j)** | Nouveaux users par jour (30 derniers jours) | Time series |

### 1.3 Segmentation Utilisateurs

| Métrique | Description | Source |
|----------|-------------|--------|
| **Distribution par Langue** | Répartition FR/EN/ES/DE | `profiles.language` |
| **Distribution Géographique** | Si timezone disponible | `profiles.timezone` |
| **Utilisateurs Power** | Users avec > 50 vidéos | `GROUP BY user_id HAVING COUNT(videos) > 50` |
| **Utilisateurs Réguliers** | Users avec 10-50 vidéos | Idem |
| **Utilisateurs Occasionnels** | Users avec 1-9 vidéos | Idem |
| **Utilisateurs VIP** | Top 10% par nombre de vidéos | Percentile calculation |
| **Utilisateurs avec Chapitres** | Users ayant créé au moins 1 chapitre | `DISTINCT user_id FROM chapters` |
| **Utilisateurs avec Life Areas** | Users trackant des domaines de vie | `DISTINCT user_id FROM life_areas` |

### 1.4 Comportement Utilisateurs

| Métrique | Description | Source |
|----------|-------------|--------|
| **Vidéos Moyenne par User** | Nombre moyen de vidéos par user | `AVG(COUNT(videos) per user)` |
| **Médiane Vidéos par User** | Médiane de vidéos par user | `PERCENTILE_CONT(0.5)` |
| **Distribution Vidéos** | Histogramme: combien de users ont X vidéos | Buckets: 1-5, 6-10, 11-25, 26-50, 50+ |
| **Durée Totale Moyenne** | Durée totale moyenne de vidéos par user | `AVG(SUM(duration) per user)` |
| **Fréquence Moyenne** | Vidéos par semaine en moyenne | Calcul temporel |
| **Utilisateur le Plus Actif** | User avec le plus de vidéos | `ORDER BY COUNT(videos) DESC LIMIT 1` |
| **Utilisateur Streak Max** | User avec le plus long streak | `momentum_scores.longest_streak DESC` |

---

## 2. Métriques d'Engagement & Rétention

### 2.1 Rétention Globale

| Métrique | Description | Source |
|----------|-------------|--------|
| **Rétention J+1** | % users ayant uploadé J+1 après inscription | Cohorte analysis |
| **Rétention J+7** | % users actifs 7j après inscription | Cohorte analysis |
| **Rétention J+30** | % users actifs 30j après inscription | Cohorte analysis |
| **Rétention J+90** | % users actifs 90j après inscription | Cohorte analysis |
| **Taux de Churn Mensuel** | % users inactifs depuis > 30j | `(inactive_users / total_users) * 100` |
| **Courbe de Rétention** | Graphique rétention par cohorte | Cohorte mensuelle |

### 2.2 Engagement Quotidien

| Métrique | Description | Source |
|----------|-------------|--------|
| **DAU (Daily Active Users)** | Users actifs aujourd'hui | `DISTINCT user_id WHERE created_at >= TODAY` |
| **WAU (Weekly Active Users)** | Users actifs cette semaine | `DISTINCT user_id WHERE created_at >= NOW() - 7 days` |
| **MAU (Monthly Active Users)** | Users actifs ce mois | `DISTINCT user_id WHERE created_at >= NOW() - 30 days` |
| **Ratio DAU/MAU** | Stickiness de l'app (DAU / MAU) | Calcul |
| **Ratio WAU/MAU** | Engagement hebdo / mensuel | Calcul |
| **Sessions Moyennes par User** | Vidéos par session (si tracking sessions) | À implémenter |

### 2.3 Patterns d'Usage

| Métrique | Description | Source |
|----------|-------------|--------|
| **Jours les Plus Actifs** | Quel jour de la semaine? | `EXTRACT(DOW FROM created_at)` |
| **Heures les Plus Actives** | Quelle heure de la journée? | `EXTRACT(HOUR FROM created_at)` |
| **Streak Moyen** | Nombre moyen de jours consécutifs | `AVG(momentum_scores.streak_days)` |
| **% Users avec Streak Actif** | Users avec streak > 0 | `COUNT WHERE streak_days > 0` |
| **Distribution Streaks** | 1-3j, 4-7j, 8-14j, 15-30j, 30j+ | Buckets |
| **Temps Moyen Entre Vidéos** | Délai moyen entre 2 uploads consécutifs | `AVG(video_n.created_at - video_n-1.created_at)` |

---

## 3. Métriques Vidéos & Contenu

### 3.1 Volume de Contenu

| Métrique | Description | Source |
|----------|-------------|--------|
| **Total Vidéos** | Nombre total de vidéos uploadées | `COUNT(videos)` |
| **Vidéos Aujourd'hui** | Vidéos uploadées aujourd'hui | `videos.created_at >= TODAY` |
| **Vidéos Cette Semaine** | Vidéos uploadées cette semaine | `videos.created_at >= NOW() - 7 days` |
| **Vidéos Ce Mois** | Vidéos uploadées ce mois | `videos.created_at >= NOW() - 30 days` |
| **Croissance Vidéos (30j)** | Graphique vidéos par jour | Time series |
| **Taux de Croissance Vidéos** | Variation % mois vs mois précédent | Comparaison temporelle |

### 3.2 Caractéristiques Vidéos

| Métrique | Description | Source |
|----------|-------------|--------|
| **Durée Totale (heures)** | Somme de toutes les durées | `SUM(videos.duration) / 3600` |
| **Durée Moyenne par Vidéo** | Moyenne des durées | `AVG(videos.duration)` |
| **Médiane Durée Vidéo** | Médiane des durées | `PERCENTILE_CONT(0.5)` |
| **Distribution Durées** | <1min, 1-3min, 3-5min, 5-10min, >10min | Buckets |
| **Vidéo la Plus Longue** | Max duration | `MAX(duration)` |
| **Vidéo la Plus Courte** | Min duration (excl. <5s) | `MIN(duration WHERE duration > 5)` |
| **% Vidéos Courtes (<2min)** | Ratio vidéos < 120s | Calcul |
| **% Vidéos Longues (>5min)** | Ratio vidéos > 300s | Calcul |

### 3.3 Types de Contenu

| Métrique | Description | Source |
|----------|-------------|--------|
| **Vidéos Enregistrées** | Vidéos recordées in-app | `metadata->>'isRecorded' = true` |
| **Vidéos Importées** | Vidéos importées de la galerie | `metadata->>'isImported' = true` |
| **Ratio Enregistrées/Importées** | % enregistrées vs importées | Calcul |
| **Orientation Portrait** | Vidéos en portrait | `metadata->>'orientation' = 'portrait'` |
| **Orientation Paysage** | Vidéos en paysage | `metadata->>'orientation' = 'landscape'` |
| **Ratio Portrait/Paysage** | % portrait vs paysage | Calcul |

### 3.4 Organisation du Contenu

| Métrique | Description | Source |
|----------|-------------|--------|
| **Total Chapitres** | Nombre total de chapitres | `COUNT(chapters)` |
| **Chapitres par User** | Moyenne de chapitres par user | `AVG(COUNT(chapters) per user)` |
| **Chapitres Actifs** | Chapitres avec is_current = true | `WHERE is_current = true` |
| **Vidéos par Chapitre** | Moyenne de vidéos par chapitre | `AVG(COUNT(videos) per chapter)` |
| **Chapitre le Plus Rempli** | Chapitre avec le plus de vidéos | `ORDER BY COUNT(videos) DESC` |
| **Durée Moyenne des Chapitres** | Combien de temps dure un chapitre (en jours) | `AVG(ended_at - started_at)` |
| **% Vidéos Non-Chapitrisées** | Vidéos sans chapter_id | `WHERE chapter_id IS NULL` |
| **Total Thèmes** | Nombre total de thèmes | `COUNT(themes)` |
| **Thèmes par Chapitre** | Moyenne de thèmes par chapitre | `AVG(COUNT(themes) per chapter)` |

---

## 4. Métriques de Temps & Délais

### 4.1 Temps d'Upload

| Métrique | Description | Source |
|----------|-------------|--------|
| **Délai Moyen d'Upload** | Temps moyen pour uploader une vidéo | **À TRACKER** - Timestamp début upload → fin upload |
| **Délai Médian d'Upload** | Médiane du temps d'upload | Idem |
| **Distribution Délais Upload** | <30s, 30s-1min, 1-2min, 2-5min, >5min | Buckets |
| **Upload le Plus Rapide** | Min upload time | MIN |
| **Upload le Plus Lent** | Max upload time | MAX |
| **Uploads > 5min** | Nombre d'uploads qui prennent > 5min | Threshold count |
| **% Uploads Lents** | % uploads > 2min | Calcul |

### 4.2 Temps de Transcription

| Métrique | Description | Source |
|----------|-------------|--------|
| **Délai Moyen Transcription** | `completed_at - created_at` | `transcription_jobs.completed_at - created_at` |
| **Délai Médian Transcription** | Médiane | PERCENTILE_CONT |
| **Distribution Délais Transcription** | <1min, 1-3min, 3-5min, 5-10min, >10min | Buckets |
| **Transcription la Plus Rapide** | Min time | MIN |
| **Transcription la Plus Lente** | Max time | MAX |
| **Transcriptions en Attente** | Jobs avec status='pending' | `WHERE status = 'pending'` |
| **Délai Moyen Pending→Processing** | Temps en queue | Calcul timestamps |

### 4.3 Patterns Temporels Utilisateurs

| Métrique | Description | Source |
|----------|-------------|--------|
| **Temps Moyen Entre Inscr. et 1ère Vidéo** | Activation time | `MIN(videos.created_at) - profiles.created_at` |
| **% Users 1ère Vidéo J+0** | Activation immédiate | Cohorte analysis |
| **% Users 1ère Vidéo J+1** | Activation lendemain | Cohorte analysis |
| **Temps Moyen Entre 2 Vidéos** | Fréquence inter-uploads | `videos[n].created_at - videos[n-1].created_at` |
| **Médiane Temps Entre 2 Vidéos** | Médiane fréquence | PERCENTILE_CONT |
| **Durée Vie Moyenne d'un User** | Dernière vidéo - 1ère vidéo | `MAX(created_at) - MIN(created_at) per user` |

---

## 5. Métriques d'Upload & Performance

### 5.1 Succès & Échecs

| Métrique | Description | Source |
|----------|-------------|--------|
| **Total Uploads** | Tentatives d'upload | `COUNT(videos)` |
| **Uploads Réussis** | Uploads complétés | `WHERE metadata->>'uploadFailed' != 'true'` |
| **Uploads Échoués** | Uploads failed | `WHERE metadata->>'uploadFailed' = 'true'` |
| **Taux de Succès Upload** | % uploads réussis | `(successful / total) * 100` |
| **Taux d'Échec Upload** | % uploads échoués | `(failed / total) * 100` |
| **Uploads avec Retry** | Uploads nécessitant retry | `WHERE metadata->>'retryCount' > 0` |
| **Nombre Moyen de Retries** | Moyenne de tentatives | `AVG(metadata->>'retryCount')` |

### 5.2 Performance Réseau

| Métrique | Description | Source |
|----------|-------------|--------|
| **Vitesse Upload Moyenne** | MB/s moyen | `AVG(metadata->>'uploadSpeed')` |
| **Vitesse Upload Médiane** | Médiane MB/s | PERCENTILE_CONT |
| **Distribution Vitesses** | <1 MB/s, 1-5, 5-10, 10-20, >20 | Buckets |
| **Upload le Plus Rapide** | Max speed | MAX |
| **Upload le Plus Lent** | Min speed | MIN |
| **% Uploads Lents (<1 MB/s)** | Uploads avec mauvaise connexion | Threshold count |

### 5.3 Taille des Fichiers

| Métrique | Description | Source |
|----------|-------------|--------|
| **Taille Totale Stockée** | Somme de toutes les vidéos (GB) | `SUM(metadata->>'fileSize') / 1024^3` |
| **Taille Moyenne par Vidéo** | Moyenne (MB) | `AVG(metadata->>'fileSize') / 1024^2` |
| **Médiane Taille Vidéo** | Médiane (MB) | PERCENTILE_CONT |
| **Distribution Tailles** | <50MB, 50-100, 100-200, 200-500, >500 | Buckets |
| **Vidéo la Plus Lourde** | Max fileSize | MAX |
| **Vidéo la Plus Légère** | Min fileSize | MIN |
| **Croissance Stockage (30j)** | GB ajoutés par jour | Time series |

---

## 6. Métriques de Transcription & IA

### 6.1 Transcriptions

| Métrique | Description | Source |
|----------|-------------|--------|
| **Total Transcriptions** | Nombre total de jobs | `COUNT(transcription_jobs)` |
| **Transcriptions Complétées** | Jobs completed | `WHERE status = 'completed'` |
| **Transcriptions En Cours** | Jobs processing | `WHERE status = 'processing'` |
| **Transcriptions En Attente** | Jobs pending | `WHERE status = 'pending'` |
| **Transcriptions Échouées** | Jobs failed | `WHERE status = 'failed'` |
| **Taux de Succès Transcription** | % completed | `(completed / total) * 100` |
| **Taux d'Échec Transcription** | % failed | `(failed / total) * 100` |

### 6.2 Contenu Transcrit

| Métrique | Description | Source |
|----------|-------------|--------|
| **Total Mots Transcrits** | Somme de tous les mots | `SUM(word_count(transcript_text))` |
| **Moyenne Mots par Vidéo** | Mots moyens | `AVG(word_count)` |
| **Total Minutes Transcrites** | Estimation | `total_words / 150 (WPM)` |
| **Distribution Langues** | FR, EN, ES, DE, autres | `GROUP BY language` |
| **% Transcriptions FR** | Ratio français | Calcul |
| **% Transcriptions EN** | Ratio anglais | Calcul |
| **Vidéos Sans Transcription** | Vidéos sans transcript | `LEFT JOIN WHERE transcript_text IS NULL` |

### 6.3 Highlights IA

| Métrique | Description | Source |
|----------|-------------|--------|
| **Total Highlights Générés** | Nombre de highlights | `COUNT(transcript_highlight->>'highlights')` |
| **Moyenne Highlights par Vidéo** | Highlights moyens | `AVG(COUNT(highlights))` |
| **Distribution Highlights** | 0, 1-2, 3-5, 6-10, >10 | Buckets |
| **Vidéos avec 0 Highlights** | Vidéos sans highlights | `WHERE highlights = []` |
| **Highlights Haute Importance** | Highlights avec importance > 7 | JSON filter |

### 6.4 Questions Personnalisées

| Métrique | Description | Source |
|----------|-------------|--------|
| **Total Questions Générées** | Nombre de questions | `COUNT(user_questions)` |
| **Questions par User** | Moyenne | `AVG(COUNT per user)` |
| **Batches Générés** | Nombre de batches (50 questions) | `MAX(batch_number)` |
| **Questions Utilisées** | Questions marquées is_used | `WHERE is_used = true` |
| **Taux d'Utilisation Questions** | % questions utilisées | `(used / total) * 100` |
| **Questions Non-Utilisées** | Remaining questions | `WHERE is_used = false` |

---

## 7. Métriques de Gamification (Momentum)

### 7.1 Scores Momentum

| Métrique | Description | Source |
|----------|-------------|--------|
| **Score Momentum Moyen** | Moyenne de tous les scores | `AVG(momentum_scores.score)` |
| **Score Médian** | Médiane | PERCENTILE_CONT |
| **Distribution Scores** | 0-200, 200-400, 400-600, 600-800, 800-1000, >1000 | Buckets |
| **Score le Plus Élevé** | Top score | `MAX(score)` |
| **Score le Plus Bas** | Bottom score | `MIN(score)` |
| **Top 10 Leaderboard** | 10 meilleurs scores | `ORDER BY score DESC LIMIT 10` |
| **Évolution Score Global** | Graphique score moyen par jour (30j) | Time series |

### 7.2 Streaks

| Métrique | Description | Source |
|----------|-------------|--------|
| **Streak Moyen Actuel** | Moyenne des streaks actuels | `AVG(streak_days WHERE streak_days > 0)` |
| **Longest Streak Moyen** | Moyenne des meilleurs streaks | `AVG(longest_streak)` |
| **Distribution Streaks** | 0, 1-3, 4-7, 8-14, 15-30, >30 jours | Buckets |
| **Users avec Streak Actif** | Nombre de users avec streak > 0 | `COUNT WHERE streak_days > 0` |
| **% Users avec Streak** | Ratio users avec streak | Calcul |
| **Longest Streak Global** | Record de streak | `MAX(longest_streak)` |

### 7.3 Life Areas (Domaines de Vie)

| Métrique | Description | Source |
|----------|-------------|--------|
| **Total Life Areas Trackés** | Nombre de domaines actifs | `COUNT(life_areas WHERE is_active = true)` |
| **Life Areas Moyens par User** | Moyenne par user | `AVG(COUNT per user)` |
| **Distribution Life Areas** | Combien de users trackent 1, 2, 3, 4, 5+ domaines | Buckets |
| **Life Areas les Plus Populaires** | Top domaines trackés | `GROUP BY area_key ORDER BY COUNT DESC` |
| **Score Moyen Career** | Score moyen du domaine carrière | `AVG(score WHERE area_key = 'career')` |
| **Score Moyen Health** | Score moyen santé | `AVG(score WHERE area_key = 'health')` |
| **Score Moyen Relationships** | Score moyen relations | `AVG(score WHERE area_key = 'relationships')` |

### 7.4 Video Analysis (Analyse IA)

| Métrique | Description | Source |
|----------|-------------|--------|
| **Vidéos Analysées** | Nombre de vidéos avec analyse | `COUNT(video_analysis)` |
| **Impact Momentum Moyen** | Moyenne de momentum_impact | `AVG(momentum_impact)` |
| **% Vidéos Impact Positif** | Vidéos avec impact > 0 | `WHERE momentum_impact > 0` |
| **% Vidéos Impact Négatif** | Vidéos avec impact < 0 | `WHERE momentum_impact < 0` |
| **Energy Level Moyen** | Niveau d'énergie moyen (1-10) | `AVG(energy_level)` |
| **Action Score Moyen** | Score d'actions moyen (1-10) | `AVG(action_score)` |
| **Clarity Score Moyen** | Clarté mentale moyenne (1-10) | `AVG(clarity_score)` |
| **% Focus Futur** | Ratio moyen de focus futur | `AVG(future_focus_ratio)` |
| **% Focus Présent** | Ratio moyen de focus présent | `AVG(present_focus_ratio)` |

---

## 8. Métriques de Qualité & Bugs

### 8.1 Bugs & Erreurs

| Métrique | Description | Source |
|----------|-------------|--------|
| **Total Bugs Remontés** | Nombre de bug reports | `COUNT(bug_reports)` |
| **Bugs Aujourd'hui** | Bugs remontés aujourd'hui | `WHERE created_at >= TODAY` |
| **Bugs Cette Semaine** | Bugs remontés cette semaine | `WHERE created_at >= NOW() - 7 days` |
| **Taux de Bugs** | Bugs par 100 utilisateurs actifs | `(bugs / active_users) * 100` |
| **Distribution Types** | Crash, Network, UI, API, Other | `GROUP BY error_type` |
| **Distribution Sévérité** | Critical, High, Medium, Low | `GROUP BY severity` |
| **Bugs Critiques** | Bugs de sévérité critique | `WHERE severity = 'critical'` |
| **Bugs Non-Résolus** | Bugs avec status != 'resolved' | `WHERE status IN ('new', 'investigating')` |
| **Temps Moyen de Résolution** | `resolved_at - created_at` | AVG pour bugs résolus |
| **Top 10 Erreurs** | Erreurs les plus fréquentes | `GROUP BY error_message ORDER BY COUNT DESC LIMIT 10` |

### 8.2 Stabilité

| Métrique | Description | Source |
|----------|-------------|--------|
| **Taux de Crash** | % users ayant eu un crash | `DISTINCT user_id WHERE error_type = 'crash'` |
| **Crash Rate** | Crashs par 1000 sessions | À implémenter avec session tracking |
| **Erreurs Réseau** | Nombre d'erreurs network | `WHERE error_type = 'network'` |
| **Erreurs API** | Nombre d'erreurs API | `WHERE error_type = 'api'` |
| **Devices les Plus Problématiques** | Top devices avec bugs | `device_info->>'model'` |
| **OS Versions Problématiques** | OS avec le plus de bugs | `device_info->>'osVersion'` |

---

## 9. Métriques Financières & ROI

### 9.1 Coûts API

| Métrique | Description | Source |
|----------|-------------|--------|
| **Coût AssemblyAI Total** | Coût total transcriptions | `(total_minutes * $0.015)` |
| **Coût AssemblyAI par User** | Coût moyen par user | `total_cost / total_users` |
| **Coût OpenAI Total** | Coût total highlights + questions | Estimation tokens |
| **Coût OpenAI par User** | Coût moyen par user | `total_cost / total_users` |
| **Coût Total API** | AssemblyAI + OpenAI | Somme |
| **Coût par Vidéo** | Coût moyen par vidéo uploadée | `total_cost / total_videos` |
| **Évolution Coûts (30j)** | Graphique coûts par jour | Time series |

### 9.2 Stockage

| Métrique | Description | Source |
|----------|-------------|--------|
| **Coût Stockage Supabase** | Estimation selon plan | `(total_GB * price_per_GB)` |
| **Croissance Stockage Mensuel** | GB ajoutés par mois | Trend analysis |
| **Projection Stockage (3 mois)** | Prédiction linéaire | Extrapolation |

### 9.3 ROI & Efficacité

| Métrique | Description | Source |
|----------|-------------|--------|
| **Coût par User Actif** | Coût total / MAU | Calcul |
| **Coût par Vidéo Traitée** | Coût IA / vidéos transcrites | Calcul |
| **LTV Estimé** (si payant) | Lifetime Value | À définir selon modèle |

---

## 10. Analytics Avancés & Prédictions

### 10.1 Cohortes

| Métrique | Description | Source |
|----------|-------------|--------|
| **Cohorte par Mois d'Inscription** | Analyse rétention par cohorte mensuelle | Cohorte analysis |
| **Cohorte par Semaine d'Inscription** | Analyse rétention par cohorte hebdo | Cohorte analysis |
| **Rétention par Cohorte** | Tableau rétention % par cohorte | Matrix visualization |
| **Engagement par Cohorte** | Vidéos moyennes par cohorte | Group comparison |

### 10.2 Funnel Analysis

| Métrique | Description | Source |
|----------|-------------|--------|
| **Funnel d'Activation** | Inscription → 1ère vidéo → 2ème vidéo → Streak 3j → Chapitre créé | Step conversion rates |
| **Taux de Conversion Étape 1** | Inscription → 1ère vidéo | `(users_with_video / total_users) * 100` |
| **Taux de Conversion Étape 2** | 1ère vidéo → 2ème vidéo | Calcul |
| **Drop-off Analysis** | Où perdons-nous les users? | Funnel visualization |

### 10.3 Prédictions

| Métrique | Description | Source |
|----------|-------------|--------|
| **Taux de Churn Prédit (30j)** | Prédiction des users qui vont churner | ML model (logistic regression) |
| **Croissance Prédite Users (90j)** | Prédiction nouveaux users | Linear/exponential extrapolation |
| **Croissance Prédite Vidéos (90j)** | Prédiction vidéos uploadées | Trend analysis |
| **Stockage Prédit (90j)** | Prédiction GB nécessaires | Extrapolation |

### 10.4 Segmentation Avancée

| Métrique | Description | Source |
|----------|-------------|--------|
| **RFM Segmentation** | Recency, Frequency, Monetary (adapté) | Custom algorithm |
| **Users à Risque** | Users susceptibles de churner | Heuristics: last_video > 14 days |
| **Power Users** | Top 10% engagement | Percentile |
| **Champions** | Users très actifs ET réguliers | Custom scoring |
| **Hibernating** | Users anciens, maintenant inactifs | Custom rules |

---

## 11. Visualisations & Graphiques

### 11.1 Graphiques Essentiels

| Graphique | Type | Description |
|-----------|------|-------------|
| **Croissance Utilisateurs** | Line Chart | Nouveaux users par jour (30j) |
| **Croissance Vidéos** | Line Chart | Vidéos uploadées par jour (30j) |
| **Rétention Cohortes** | Heatmap | Matrix de rétention par cohorte |
| **Distribution Vidéos par User** | Histogram | Combien de users ont X vidéos |
| **Distribution Durées Vidéos** | Histogram | Combien de vidéos durent X minutes |
| **Funnel d'Activation** | Funnel Chart | Étapes inscription → activation |
| **Top Life Areas** | Bar Chart | Domaines de vie les plus populaires |
| **Évolution Score Momentum** | Line Chart | Score moyen par jour |
| **Distribution Scores** | Histogram | Combien de users ont X points |
| **Top 10 Erreurs** | Bar Chart | Erreurs les plus fréquentes |
| **Performance Upload** | Box Plot | Distribution vitesses upload |
| **Délais Transcription** | Box Plot | Distribution temps de transcription |
| **Heatmap Activité** | Heatmap | Jour de semaine x Heure de journée |

### 11.2 Dashboards par Section

| Dashboard | Contenu |
|-----------|---------|
| **Overview** | Métriques clés + croissance + engagement |
| **Users** | Acquisition, rétention, segmentation, cohortes |
| **Content** | Vidéos, chapitres, durées, types |
| **Performance** | Upload, transcription, délais, erreurs |
| **AI & Features** | Transcriptions, highlights, questions, momentum |
| **Quality** | Bugs, stabilité, performance, feedback |
| **Finance** | Coûts API, stockage, projections |
| **Advanced** | Cohortes, funnels, prédictions, segments |

---

## 12. Données à Tracker (Nouveaux Champs)

### 12.1 À Ajouter dans l'App Mobile

Pour avoir les métriques complètes, il faudrait tracker:

| Donnée à Tracker | Où | Format |
|------------------|-----|--------|
| **Timestamp début upload** | `videos.metadata.uploadStartedAt` | ISO timestamp |
| **Timestamp fin upload** | `videos.metadata.uploadCompletedAt` | ISO timestamp |
| **Durée upload (seconds)** | `videos.metadata.uploadDuration` | INTEGER |
| **Vitesse upload (MB/s)** | `videos.metadata.uploadSpeed` | DECIMAL |
| **Nombre de retries** | `videos.metadata.retryCount` | INTEGER |
| **Taille fichier (bytes)** | `videos.metadata.fileSize` | BIGINT |
| **Type source** | `videos.metadata.source` | 'recorded' | 'imported' | 'camera_roll' |
| **Session ID** | `videos.metadata.sessionId` | UUID (track sessions) |
| **Device info** | `profiles.device_info` | JSONB (model, OS, version) |

### 12.2 Nouvelle Table: `user_sessions`

Pour tracker le temps passé dans l'app:

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ NOT NULL,
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER, -- Calculé à la fin
  screens_visited TEXT[], -- ['HomeScreen', 'RecordScreen', ...]
  actions_performed JSONB, -- {"videos_recorded": 2, "videos_imported": 1, ...}
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Métriques dérivées:**
- Durée moyenne de session
- Nombre de sessions par user
- Screens les plus visités
- Actions les plus fréquentes

### 12.3 Nouvelle Table: `feature_usage`

Pour tracker l'usage de chaque feature:

```sql
CREATE TABLE feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL, -- 'vertical_feed', 'chapter_create', 'settings_open', ...
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds INTEGER, -- Temps passé sur cette feature
  metadata JSONB -- Context additionnel
);
```

**Métriques dérivées:**
- Features les plus utilisées
- % users utilisant chaque feature
- Temps moyen passé par feature
- Adoption de nouvelles features

---

## 13. Implémentation Recommandée

### 13.1 Priorité 1 (Quick Wins - Données Existantes)

✅ **Pas besoin de modifier l'app mobile**

1. Métriques utilisateurs (acquisition, activation, rétention)
2. Métriques vidéos (volume, durées, types)
3. Métriques transcription (succès, délais, langues)
4. Métriques momentum (scores, streaks, life areas)
5. Métriques bugs (volume, types, sévérité)
6. Coûts API (AssemblyAI, OpenAI)
7. Graphiques de croissance (30j)

### 13.2 Priorité 2 (Tracking Avancé)

⚠️ **Nécessite modifications app mobile**

1. Tracking temps d'upload (début/fin timestamps)
2. Tracking vitesse upload (MB/s)
3. Tracking file size exact
4. Tracking sessions (début/fin, durée)
5. Cohorte analysis avancée
6. Funnel analysis

### 13.3 Priorité 3 (Analytics Poussés)

🚀 **Features avancées**

1. Feature usage tracking (temps par screen)
2. Heatmap d'activité (jour x heure)
3. Prédictions churn (ML)
4. RFM segmentation
5. A/B testing infrastructure
6. Custom events tracking

---

## 14. Résumé: Métriques Totales Proposées

### Catégories

| Catégorie | Nombre de Métriques |
|-----------|---------------------|
| Utilisateurs | 30 métriques |
| Engagement & Rétention | 25 métriques |
| Vidéos & Contenu | 35 métriques |
| Temps & Délais | 20 métriques |
| Upload & Performance | 20 métriques |
| Transcription & IA | 25 métriques |
| Gamification | 30 métriques |
| Qualité & Bugs | 20 métriques |
| Financières | 15 métriques |
| Analytics Avancés | 20 métriques |

**TOTAL: ~240 métriques exploitables!**

---

## 15. Questions pour Toi

Avant de commencer l'implémentation, dis-moi:

1. **Quelles catégories de métriques t'intéressent le PLUS?**
   - Users? Engagement? Performance? Finance? Momentum?

2. **Veux-tu commencer par Priorité 1 (données existantes)?**
   - Ça ne nécessite AUCUNE modification de l'app mobile

3. **Es-tu prêt à modifier l'app mobile pour tracker Priorité 2?**
   - Tracking upload times, sessions, feature usage

4. **Veux-tu des prédictions ML (Priorité 3)?**
   - Churn prediction, growth forecasting, etc.

5. **Combien de dashboards veux-tu?**
   - 1 seul dashboard géant?
   - Ou plusieurs dashboards spécialisés (Users, Content, Performance, Finance)?

Valide-moi les métriques qui t'intéressent et on commence l'implémentation! 🚀
