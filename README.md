# Devoirs IA (nom provisoire)

L'app qui aide les collégiens en difficulté à faire leurs devoirs, sans jamais faire le travail à leur place, et qui dit aux parents comment aider.

- **Site web** (Next.js, hébergé sur Vercel) : site public, espace parent, espace enfant, administration, **et l'API** utilisée par l'app mobile.
- **App mobile** (Expo / React Native) : iOS et Android.
- **Base de données** : MongoDB (Atlas en ligne, Docker en local).

## Installer et lancer en local

Prérequis : Node 22, pnpm 10, Docker.

```bash
pnpm install
docker compose up -d                       # lance MongoDB en local
cp apps/web/.env.example apps/web/.env.local
# puis mettre une valeur dans BETTER_AUTH_SECRET :  openssl rand -base64 32
pnpm db:indexes                            # crée les index MongoDB
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

| Variable                                                                  | Obligatoire | Description                                                                 |
| ------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------- |
| `MONGODB_URI`                                                             | oui         | Chaîne de connexion MongoDB (Atlas : choisir une région UE)                 |
| `BETTER_AUTH_SECRET`                                                      | oui         | Secret aléatoire de 32 caractères minimum                                   |
| `BETTER_AUTH_URL`                                                         | oui         | URL publique du site (ex. `https://xxx.vercel.app`)                         |
| `MOBILE_APP_SCHEME`                                                       | non         | `devoirsia://` par défaut                                                   |
| `TRUSTED_ORIGINS`                                                         | non         | Origines web autorisées en plus (ex. `http://localhost:8081` pour Expo web) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`                               | non         | Connexion Google (désactivée si vide)                                       |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` / `APPLE_APP_BUNDLE_IDENTIFIER` | non         | Connexion Apple (désactivée si vide)                                        |

App mobile (`apps/mobile/.env`) : `EXPO_PUBLIC_API_URL` = URL du site.

## Mettre en ligne sur Vercel

1. Créer une base sur MongoDB Atlas (région **UE**, ex. Paris ou Francfort) et récupérer la chaîne de connexion.
2. Dans Vercel : importer le dépôt GitHub, **Root Directory = `apps/web`** (Vercel détecte pnpm et le monorepo).
3. Renseigner les variables d'environnement ci-dessus.
4. Déployer. Le script `vercel-build` crée les index MongoDB puis construit le site.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) : comment le code est organisé
- [docs/RESTE-A-FAIRE.md](docs/RESTE-A-FAIRE.md) : tout ce qui est simulé, manquant ou à décider
- [docs/RGPD.md](docs/RGPD.md) : registre des traitements (brouillon)
