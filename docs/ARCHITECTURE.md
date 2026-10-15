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
```

Prévus aux jalons suivants : `packages/ai` (appels Claude, prompts, évaluations), `packages/pedagogy` (correction, modèle de maîtrise, répétition espacée), `content/referentiel` (graphe de compétences).

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
