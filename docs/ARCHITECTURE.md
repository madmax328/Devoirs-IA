# Architecture

## Vue d'ensemble

```
apps/
  web/        Next.js (App Router), hébergé sur Vercel
              ├─ pages : site public, espace parent, espace enfant, /admin
              └─ /api/* : l'API utilisée par le site ET par l'app mobile
  mobile/     Expo (expo-router), iOS + Android
packages/
  shared/     schémas de validation (Zod), constantes, textes (i18n)
  db/         connexion MongoDB, types des documents, index
  ui/         design tokens (couleurs clair/sombre, tailles), vérification des contrastes
  content/    référentiel des notions (JSON) + exercices de départ (JSON), chargement et vérifications
  pedagogy/   correction déterministe (puis modèle de maîtrise et répétition espacée aux jalons 3 et 5)
  ai/         appels à l'API Claude, prompts versionnés, pipeline de génération et de relecture
```

Pas de serveur séparé : l'API vit dans Next.js (fonctions serverless Vercel). Les tâches de fond (purge des photos, bilans hebdo) passeront par **Vercel Cron** qui appelle des routes `/api/cron/*` protégées.

## Authentification

- **Parent** : [Better Auth](https://better-auth.com), stocké dans MongoDB (collections `user`, `session`, `account`, `verification`).
  - Mots de passe hachés en **argon2id**.
  - Acceptation des CGU obligatoire à l'inscription (enregistrée dans `consents`).
  - Web : cookie de session. Mobile : plugin Expo de Better Auth (cookie conservé dans SecureStore).
  - Rôle `PARENT` ou `ADMIN` sur l'utilisateur.
- **Enfant** : pas de compte. Le parent est connecté sur l'appareil, l'enfant choisit son profil et tape son **code PIN** (haché en argon2id).
  - Après 5 erreurs : blocage 1 min, puis 5, 15, 60 min.
  - Un PIN correct donne un **jeton enfant** de 12 h (stocké en base sous forme d'empreinte SHA-256, supprimé automatiquement à l'expiration par un index TTL).
  - Web : cookie httpOnly `devoirs_child`. Mobile : en-tête `x-child-session`.
  - Retour vers l'espace parent sur mobile : le parent retape son mot de passe (`POST /api/parent/unlock`).

## API

| Méthode              | Route                | Qui             | Rôle                                                       |
| -------------------- | -------------------- | --------------- | ---------------------------------------------------------- |
| GET                  | `/api/health`        | tous            | état du service                                            |
| *                    | `/api/auth/*`        | tous            | Better Auth (inscription, connexion…)                      |
| GET                  | `/api/me`            | parent          | parent connecté                                            |
| GET / POST           | `/api/children`      | parent          | lister / créer un profil (avec consentement)               |
| GET / PATCH / DELETE | `/api/children/:id`  | parent          | lire / modifier / supprimer un profil                      |
| POST                 | `/api/devices`       | parent          | enregistrer un appareil (éventuellement dédié à un enfant) |
| POST / DELETE        | `/api/child-session` | parent → enfant | ouvrir / fermer l'espace enfant (PIN)                      |
| GET                  | `/api/child/me`      | enfant          | profil de l'enfant connecté                                |
| POST                 | `/api/parent/unlock` | parent          | revérifier le mot de passe                                 |

Les erreurs ont toujours la forme `{ error: { code, message, details? } }`, où `message` est une **clé de traduction** (ex. `errors.pinFormat`) que le site et l'app traduisent.

## Données (MongoDB)

| Collection      | Contenu                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------- |
| `children`      | profil enfant : prénom/pseudo, classe, avatar, PIN haché, réglages, état du verrouillage |
| `consents`      | consentements horodatés et versionnés (jamais modifiés)                                  |
| `childSessions` | jetons enfant (empreinte), expiration automatique                                        |
| `devices`       | appareils enregistrés                                                                    |
| `auditLogs`     | actions sensibles, sans données personnelles                                             |

## Textes et langues

Tous les textes sont dans `packages/shared/src/i18n/locales/fr.ts`. `pt-BR` et `en-US` existent mais sont vides : les clés manquantes s'affichent en français. Les clés sont typées : une clé inexistante ne compile pas.

## Tests

- `packages/*` : tests unitaires (schémas, i18n, contrastes AA des couleurs).
- `apps/web/test` : tests de l'API sur un vrai MongoDB (base `devoirs_test`).
- `apps/web/e2e` : parcours complet dans un navigateur (Playwright).
- `apps/mobile/test` : logique pure (pavé PIN, erreurs API).
- CI GitHub Actions : formatage, lint, types, tests, build, E2E, bundle iOS.

## Contenu pédagogique (jalon 2)

### Référentiel

- Fichiers `packages/content/referentiel/<matière>/<niveau>.json` : notions avec id, thème, titre, description, prérequis, erreurs fréquentes, exemples.
- Identifiants stables `<matière>.<niveau>.<slug>`, ex. `ma.6e.fractions-egales` (matières : ma, fr, an, hg, svt, pc ; niveaux : cm2, 6e, 5e, 4e, 3e).
- 208 notions : maths (103) et français (52) du CM2 à la 3e, version allégée pour l'anglais, l'histoire-géo-EMC, les SVT et la physique-chimie. Écrit d'après les programmes des cycles 3 et 4 : **à faire relire par un enseignant**.
- Les tests vérifient le graphe : identifiants uniques, prérequis existants, pas de cycle, pas de prérequis d'un niveau supérieur, chaque notion de maths après le CM2 a au moins un prérequis.
- Après l'ajout d'un fichier JSON : `pnpm --filter @devoirs/content generate` (met à jour la liste des imports).
- Le site recopie automatiquement le référentiel et les exercices du dépôt dans MongoDB quand leur empreinte change (`ensureContentSynced`) : rien à lancer à la main.

### Exercices

- 7 types : QCM, réponse numérique, texte à trous, appariement, remettre dans l'ordre, vrai/faux (justifié ou non), réponse rédigée.
- Statuts : `DRAFT` (à relire), `AUTO_VALIDATED` (servi), `HUMAN_VALIDATED` (servi), `REJECTED`. Origine : `REPO` (écrit dans le dépôt), `AI`, `HUMAN` (corrigé dans l'admin).
- Un signalement renvoie un exercice auto-validé en relecture (`DRAFT`) ; valider ou rejeter clôt les signalements.

### Correction déterministe (`packages/pedagogy`)

- Nombres exacts (fractions en BigInt) : accepte `3,5`, `3.5`, `7/2`, `1 000`, le signe −, l'unité attendue ; repère une fraction non simplifiée ou une écriture qui ne respecte pas le format demandé.
- Textes à trous : casse, espaces, apostrophes et ponctuation finale ignorés ; accents comptés ou non selon l'exercice.
- Résultat : `correct` / `partial` / `incorrect` / `invalid` (saisie illisible) / `pending_ai` (réponse rédigée), un score, un code de retour positif et, pour les exercices à plusieurs éléments, les éléments à revoir — jamais la bonne réponse.

### Génération par IA (`packages/ai`)

1. **Génération** structurée (JSON validé par Zod) avec le modèle « fort » (`claude-opus-5-5`, effort `high`), relance serveur automatique en cas de refus (`fallbacks: "default"`).
2. **Vérifications par le code** : schéma strict, notion et niveau, réponse attendue acceptée par le moteur de correction, aucun indice qui contient la réponse, et pour les réponses numériques **recalcul avec mathjs** de l'expression fournie par l'IA.
3. **Relecture** par un second appel (même modèle, effort `medium`) : l'IA résout l'exercice sans regarder la réponse et juge clarté, niveau et indices.
4. **Décision** : tout est bon → `AUTO_VALIDATED` ; doute (relecture « à revoir », calcul non vérifiable) → `DRAFT` pour la file humaine ; réponse fausse ou rejet → écarté.

- Prompts versionnés dans `packages/ai/src/prompts/*.v1.ts` (une modification = un nouveau fichier `v2`).
- Chaque appel est journalisé dans `aiUsage` (fonction, modèle, version du prompt, jetons, coût estimé, durée), **sans contenu ni identifiant d'enfant**.
- Budget quotidien (`AI_DAILY_BUDGET_USD`) : au-delà, la génération est refusée jusqu'au lendemain.
- La génération se lance depuis l'admin (Référentiel → « Générer », 1 à 5 exercices par notion).

### Administration (`/admin`)

Tableau de bord, file de validation, liste des exercices (filtres par statut, notion, signalements), fiche exercice (aperçu de la réponse attendue ; valider, rejeter ou remettre à relire avec une note ; correction du contenu en JSON revérifiée par le serveur), référentiel par matière et niveau avec génération, coûts IA sur 14 jours.
Accès : rôle `ADMIN` en base ou e-mail listé dans `ADMIN_EMAILS`.

## Diagnostic et maîtrise (jalon 3)

### Modèle de maîtrise (`packages/pedagogy/src/mastery.ts`)

- Un score de type **Elo** par enfant et par notion (`masteryStates`), 0 = niveau d'un exercice moyen (difficulté 3/5). Chaque exercice a aussi un score (difficulté 1→5 = −400→+400), recalibré doucement avec les réponses des élèves.
- Probabilité de réussite = 1 / (1 + 10^((score exercice − score enfant) / 400)). Après chaque réponse : score += K × poids × (résultat − probabilité attendue).
- K diminue avec le nombre d'observations (beaucoup d'incertitude au début, puis stabilité).
- Poids : diagnostic et sessions = 1 ; devoir aidé = 0,5 ; chaque indice utilisé retire 25 % (minimum 25 %). Une réponse partielle compte partiellement.
- Réussir une notion crédite légèrement ses prérequis jamais observés (preuve indirecte, poids 0,3, qui ne compte pas comme une observation).
- Statuts : « à découvrir » (aucune donnée), « en cours », « maîtrisée » (≥ 60 % de chances de réussir un exercice moyen).
- **Pourquoi Elo plutôt que BKT** : le BKT demande d'ajuster 4 paramètres par notion avec des données qu'on n'a pas encore ; l'Elo s'auto-calibre, tient compte de la difficulté des exercices et s'explique simplement. Toutes les réponses sont conservées (`answerAttempts`) : on pourra recalculer avec un autre modèle.

### Diagnostic adaptatif (`packages/pedagogy/src/diagnostic.ts`)

1. **Départ** : jusqu'à 6 notions du niveau de l'élève qui ont des exercices, les plus « fondatrices » d'abord (celles dont dépendent le plus d'autres notions), en variant les thèmes. S'il y en a moins de 3, on complète avec le niveau inférieur.
2. **Une question par notion**. Réussie (≥ 75 %) → on passe à la suite. Pas encore réussie → ses **prérequis** non testés passent en tête de file : on descend jusqu'à la lacune racine (jusqu'au CM2).
3. **Fin** après 12 questions au maximum (~10-15 min) ou quand la file est vide. Le diagnostic peut se faire en plusieurs fois (la session et l'exercice affiché sont conservés).
4. **Bilan** : notions réussies et notions à travailler, en commençant par les lacunes racines (une notion ratée dont aucun prérequis testé n'a échoué). L'enfant ne voit que les 3 premières, pour ne pas le décourager.

- Seuls les types corrigés entièrement par le code sont utilisés (pas de réponse rédigée ni de justification).
- Une saisie illisible (« beaucoup ») ou une mauvaise unité ne compte pas : l'élève peut corriger.
- « Je ne sais pas encore » est toujours possible et compte comme « pas encore ».
- Pendant le diagnostic, les retours restent neutres et positifs (« Bien joué ! » / « Merci ! On travaillera ça ensemble. »), jamais « faux ».
- L'exercice envoyé à l'élève ne contient jamais la réponse (`toPublicExercise`) : pas de bonne réponse, de réponses acceptées, de paires ni d'ordre correct (les éléments à ordonner ou à apparier sont mélangés).

### API enfant

| Méthode | Route                              | Rôle                                                                     |
| ------- | ---------------------------------- | ------------------------------------------------------------------------ |
| GET     | `/api/child/diagnostic`            | état du diagnostic pour chaque matière suivie                            |
| POST    | `/api/child/diagnostic`            | démarrer ou reprendre (`{ subject }`)                                    |
| POST    | `/api/child/diagnostic/:id/answer` | répondre (`{ exerciseId, response }` ou `{ exerciseId, skipped: true }`) |
| POST    | `/api/exercises/:id/report`        | signaler une erreur (enfant ou parent)                                   |

### Écrans

- Site et application : accueil enfant avec présentation du coach (première visite), cartes « Faisons le point » par matière, lecteur d'exercices (QCM, nombre, texte à trous, appariement par touches, remettre dans l'ordre par touches, vrai/faux), retour après chaque réponse, bilan.
- La logique de saisie est partagée entre le site et l'application (`packages/shared/src/player.ts`).
- Espace parent (site) : état du point de départ de chaque enfant par matière.
