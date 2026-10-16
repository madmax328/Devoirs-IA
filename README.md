# Devoirs IA (nom provisoire)

L'app qui aide les collégiens en difficulté à faire leurs devoirs, sans jamais faire le travail à leur place, et qui dit aux parents comment aider.

- **Site web** (Next.js, hébergé sur Vercel) : site public, espace parent, espace enfant, administration, **et l'API** utilisée par l'app mobile.
- **App mobile** (Expo / React Native) : iOS et Android.
- **Base de données** : MongoDB (Atlas en ligne, Docker en local).
- **Contenu pédagogique** : `packages/content` (référentiel des notions et exercices de départ, versionnés dans le dépôt).

## Installer et lancer en local

Prérequis : Node 22, pnpm 10, Docker.

```bash
pnpm install
docker compose up -d                       # lance MongoDB en local
cp apps/web/.env.example apps/web/.env.local
# puis mettre une valeur dans BETTER_AUTH_SECRET :  openssl rand -base64 32
pnpm --filter @devoirs/web seed            # comptes de démo
pnpm --filter @devoirs/web dev             # site + API sur http://localhost:3000
```

Comptes de démo créés par le seed :

| Compte | E-mail              | Mot de passe     |
| ------ | ------------------- | ---------------- |
| Parent | demo@devoirs-ia.fr  | demo-devoirs-ia  |
| Admin  | admin@devoirs-ia.fr | admin-devoirs-ia |

Enfants du parent de démo : **Léa** (6e, code 1234) et **Tom** (4e, code 5678).

### App mobile

```bash
cp apps/mobile/.env.example apps/mobile/.env
# Sur un vrai téléphone : EXPO_PUBLIC_API_URL=http://<IP-de-votre-ordinateur>:3000
pnpm --filter @devoirs/mobile start        # puis scanner le QR code avec Expo Go
```

Pour ajouter un module Expo, toujours utiliser `npx expo install <module>` dans `apps/mobile` (versions compatibles avec le SDK).

## Commandes utiles

| Commande                         | Rôle                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `pnpm test`                      | tests unitaires et d'API (MongoDB local requis)                                    |
| `pnpm lint` / `pnpm typecheck`   | qualité du code                                                                    |
| `pnpm format`                    | mise en forme automatique                                                          |
| `pnpm --filter @devoirs/web e2e` | test de bout en bout dans un navigateur (après `pnpm --filter @devoirs/web build`) |

## Variables d'environnement

Site / API (`apps/web/.env.local`, et dans Vercel → Settings → Environment Variables) :

| Variable                                                                  | Obligatoire | Description                                                                                       |
| ------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `MONGODB_URI`                                                             | oui         | Chaîne de connexion MongoDB (Atlas : choisir une région UE)                                       |
| `BETTER_AUTH_SECRET`                                                      | oui         | Secret aléatoire de 32 caractères minimum                                                         |
| `BETTER_AUTH_URL`                                                         | oui         | URL publique du site (ex. `https://xxx.vercel.app`)                                               |
| `MOBILE_APP_SCHEME`                                                       | non         | `devoirsia://` par défaut                                                                         |
| `TRUSTED_ORIGINS`                                                         | non         | Origines web autorisées en plus (ex. `http://localhost:8081` pour Expo web)                       |
| `ADMIN_EMAILS`                                                            | non         | E-mails des comptes qui ont accès à `/admin`, séparés par des virgules                            |
| `ANTHROPIC_API_KEY`                                                       | non         | Clé de l'API Claude. Sans elle, la génération d'exercices est désactivée (le reste fonctionne)    |
| `AI_DAILY_BUDGET_USD`                                                     | non         | Budget IA par jour en dollars (5 par défaut) ; au-delà, la génération s'arrête jusqu'au lendemain |
| `AI_MODEL_STRONG` / `AI_MODEL_FAST`                                       | non         | Modèles utilisés (par défaut `claude-opus-5-5` / `claude-haiku-5-5`)                              |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`                               | non         | Connexion Google (désactivée si vide)                                                             |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` / `APPLE_APP_BUNDLE_IDENTIFIER` | non         | Connexion Apple (désactivée si vide)                                                              |

App mobile (`apps/mobile/.env`) : `EXPO_PUBLIC_API_URL` = URL du site.

## Mettre en ligne sur Vercel

1. **MongoDB Atlas** : créer un cluster (région **UE**, ex. Paris ou Francfort).
   - _Database Access_ : créer un utilisateur avec mot de passe.
   - _Network Access_ : ajouter `0.0.0.0/0` (Vercel n'a pas d'adresse IP fixe ; l'accès reste protégé par le mot de passe).
   - _Connect → Drivers_ : copier la chaîne de connexion et ajouter le nom de la base, ex. `mongodb+srv://user:mdp@cluster.xxx.mongodb.net/devoirs?retryWrites=true&w=majority`.
2. **Vercel** → _Add New Project_ → importer le dépôt GitHub.
   - **Root Directory : `apps/web`** (bouton _Edit_ à côté du nom du dossier). C'est indispensable.
   - Framework : Next.js (détecté automatiquement). Ne rien changer aux commandes.
3. _Environment Variables_ : seulement deux sont obligatoires :
   - `MONGODB_URI` = la chaîne de l'étape 1
   - `BETTER_AUTH_SECRET` = une longue chaîne aléatoire (au moins 32 caractères, ex. générée sur https://generate-secret.vercel.app/32)
4. _Deploy_. L'adresse du site est détectée automatiquement ; les index MongoDB se créent tout seuls au premier accès.
5. Vérifier : `https://<votre-site>.vercel.app/api/health` doit afficher `{"status":"ok"}`.

Plus tard, avec un nom de domaine à vous : ajouter `BETTER_AUTH_URL=https://votre-domaine.fr`.

### Accéder à l'administration

1. Dans Vercel, ajouter `ADMIN_EMAILS` = l'adresse e-mail de votre compte, puis redéployer.
2. Se connecter avec ce compte et ouvrir `https://<votre-site>/admin`.
3. Pour générer des exercices avec l'IA : ajouter `ANTHROPIC_API_KEY` (clé créée sur https://platform.claude.com) et, si besoin, `AI_DAILY_BUDGET_USD`.

⚠️ La vérification des e-mails n'est pas encore active : créez votre compte **avant** d'ajouter votre adresse dans `ADMIN_EMAILS`.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) : comment le code est organisé
- [docs/RESTE-A-FAIRE.md](docs/RESTE-A-FAIRE.md) : tout ce qui est simulé, manquant ou à décider
- [docs/RGPD.md](docs/RGPD.md) : registre des traitements (brouillon)
