# Reste à faire / simulé / à décider

Liste tenue à jour à chaque jalon. Rien de ce qui est listé ici n'est caché dans le code.

## Manque une clé ou un compte (fonctionnalité prête, désactivée)

- [ ] **Connexion Google** : code en place, activée dès que `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` sont renseignés.
- [ ] **Connexion Apple** : idem avec `APPLE_*` (compte Apple Developer existant → créer un Service ID et une clé). Obligatoire sur iOS si on propose Google.
- [ ] **E-mails** (vérification d'adresse, mot de passe oublié, bilan hebdo) : aucun fournisseur branché. En attendant, la vérification d'e-mail est **désactivée** et il n'y a **pas encore de « mot de passe oublié »**.
- [ ] **Déploiement** : à faire de ton côté (Vercel + MongoDB Atlas), voir le README.

## Provisoire

- [ ] Nom de l'app (« Devoirs IA »), identifiant `fr.devoirsia.app`, schéma `devoirsia://` : à remplacer quand le nom sera choisi.
- [ ] Avatars = emojis, en attendant les illustrations et le personnage du coach.
- [ ] Le réglage « police dys » est enregistré ; il n'est appliqué que sur l'accueil enfant web. Intégration complète (police Luciole) au jalon 9.
- [ ] Les textes CGU / confidentialité n'existent pas encore : le consentement enregistre la version `2026-10-15` des textes à venir (jalon 9).
- [ ] `apps/web/src/server/services/children.ts` : limite de 3 enfants appliquée à tous ; elle dépendra de l'abonnement au jalon 8.
- [ ] Langue : le site et l'app sont en français uniquement (pas encore de détection de langue).

## Contenu pédagogique (jalon 2)

- [ ] **Faire relire le référentiel par un enseignant** (208 notions, prérequis) et les 52 exercices de départ (statut « auto-validé », origine « Dépôt »).
- [ ] La génération IA n'a **pas encore été testée avec une vraie clé** (aucune clé dans l'environnement de développement) : tout le pipeline est testé avec un faux modèle. Premier essai à faire depuis l'admin avec `ANTHROPIC_API_KEY`, sur 1 exercice.
- [ ] Génération de masse en tâche de fond (Vercel Cron) : pas encore en place, la génération se fait notion par notion depuis l'admin.
- [ ] Correction par l'IA des réponses rédigées et des justifications (`pending_ai`) : arrive avec le diagnostic et les sessions (jalons 3 et 5).
- [ ] Relecture IA faite avec le modèle « fort » : à comparer avec le modèle rapide quand on aura des données (coût).
- [ ] Les exercices du dépôt couvrent 52 notions sur 208 : le reste se remplira par la génération + validation.

## Diagnostic et maîtrise (jalon 3)

- [ ] **Le diagnostic ne teste que les notions qui ont au moins un exercice servi.** Avec les 52 exercices de départ, il est déjà utilisable en maths et en français, mais pas en anglais, histoire-géo, SVT ni physique-chimie (« bientôt disponible »). Il faut générer et valider des exercices (admin → Référentiel), en priorité pour les notions de base du CM2 et de la 6e.
- [ ] Seuils à ajuster avec de vraies données : notion réussie à 75 %, « maîtrisée » à 60 % de chances, 12 questions maximum, 6 notions de départ.
- [ ] Le diagnostic ne peut pas encore être refait (bouton « refaire le point » côté parent à prévoir au jalon 7).
- [ ] Application mobile : la police dys n'est pas encore appliquée (jalon 9). Le coach est un symbole provisoire (✦) en attendant le personnage.
- [ ] « Mes progrès » (carte des notions) côté enfant : arrive avec les sessions du jour (jalon 5).

## Mode Devoirs (jalon 4)

- [ ] **À VALIDER PAR TOI : le texte affiché en cas de détresse** et les libellés des numéros d'aide (`packages/shared/src/i18n/locales/fr.ts`, section `safety`). Idéalement relus par un professionnel.
- [ ] **Évaluations avec le vrai modèle pas encore lancées** : ajouter le secret GitHub `ANTHROPIC_API_KEY` (Settings → Secrets and variables → Actions), puis lancer « Évaluations du coach IA » dans l'onglet Actions. Les prompts seront ajustés selon les résultats.
- [ ] Dictée vocale de l'exercice : pas encore (reconnaissance vocale sur l'appareil prévue au jalon 9, accessibilité).
- [ ] Réponses du coach affichées d'un coup (pas encore en flux continu) : « Ton coach réfléchit… » pendant quelques secondes.
- [ ] XP gagnés en fin d'exercice : jalon 6 (gamification). Limite de l'offre gratuite (3 aides par semaine) : jalon 8.
- [ ] Notification push au parent en cas de moment difficile : jalon 9 (aujourd'hui : bannière dans l'espace parent).
- [ ] Masquage des informations personnelles par expressions régulières : imparfait par nature (ex. un nom de famille seul). Le classifieur IA complète, sans garantie.
- [ ] Le parent ne voit pas encore l'historique des devoirs (jalon 7).

## Sécurité à compléter

- [ ] `POST /api/parent/unlock` (mot de passe parent depuis l'espace enfant) n'a pas encore de limitation du nombre d'essais (le parent est déjà connecté sur l'appareil ; à durcir au jalon 10).
- [ ] TOTP (double authentification) pour le compte admin : reporté au jalon 10 (durcissement).
- [ ] `ADMIN_EMAILS` : tant que la vérification des e-mails n'est pas active, n'y mettez que des adresses dont le compte existe déjà.
- [ ] Sentry / logs structurés : jalon 10.
- [ ] Inscription par Google/Apple : il faudra recueillir l'acceptation des CGU au premier passage (aujourd'hui, seule l'inscription par e-mail l'exige).

## Décisions qui changent le plan initial

- Hébergement **Vercel** + **MongoDB** (au lieu de Railway + PostgreSQL). Conséquences : pas de serveur API séparé (l'API est dans Next.js), pas de worker permanent ni Redis → tâches de fond via **Vercel Cron**. La génération d'exercices en masse (jalon 2) se fera par petits lots planifiés ou par script lancé depuis ton ordinateur.
- **Paiement uniquement sur le site (Stripe)**, pas d'achat intégré dans les apps. ⚠️ À vérifier avant de publier : Apple interdit en général de mentionner un paiement extérieur dans une app qui débloque des fonctionnalités, et exige souvent de proposer aussi l'achat intégré. Les règles ont évolué (notamment aux États-Unis et en Europe) : à revoir au jalon 8 avant d'écrire l'écran. En attendant, aucun message de paiement n'est affiché dans l'app.
- Transfert des données vers l'API Claude (hors UE) : accepté pour la phase de création et de tests ; à revoir avant publication.
