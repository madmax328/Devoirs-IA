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
- [ ] Accueil enfant = écran d'attente (« Ton coach arrive très bientôt »).
- [ ] Page `/admin` = vide (protégée, réservée au rôle ADMIN).
- [ ] Le réglage « police dys » est enregistré ; il n'est appliqué que sur l'accueil enfant web. Intégration complète (police Luciole) au jalon 9.
- [ ] Les textes CGU / confidentialité n'existent pas encore : le consentement enregistre la version `2026-10-15` des textes à venir (jalon 9).
- [ ] `apps/web/src/server/services/children.ts` : limite de 3 enfants appliquée à tous ; elle dépendra de l'abonnement au jalon 8.
- [ ] Langue : le site et l'app sont en français uniquement (pas encore de détection de langue).

## Sécurité à compléter

- [ ] `POST /api/parent/unlock` (mot de passe parent depuis l'espace enfant) n'a pas encore de limitation du nombre d'essais (le parent est déjà connecté sur l'appareil ; à durcir au jalon 10).
- [ ] TOTP (double authentification) pour le compte admin : jalon 2, avec le vrai back-office.
- [ ] Sentry / logs structurés : jalon 10.
- [ ] Inscription par Google/Apple : il faudra recueillir l'acceptation des CGU au premier passage (aujourd'hui, seule l'inscription par e-mail l'exige).

## Décisions qui changent le plan initial

- Hébergement **Vercel** + **MongoDB** (au lieu de Railway + PostgreSQL). Conséquences : pas de serveur API séparé (l'API est dans Next.js), pas de worker permanent ni Redis → tâches de fond via **Vercel Cron**. La génération d'exercices en masse (jalon 2) se fera par petits lots planifiés ou par script lancé depuis ton ordinateur.
- **Paiement uniquement sur le site (Stripe)**, pas d'achat intégré dans les apps. ⚠️ À vérifier avant de publier : Apple interdit en général de mentionner un paiement extérieur dans une app qui débloque des fonctionnalités, et exige souvent de proposer aussi l'achat intégré. Les règles ont évolué (notamment aux États-Unis et en Europe) : à revoir au jalon 8 avant d'écrire l'écran. En attendant, aucun message de paiement n'est affiché dans l'app.
- Transfert des données vers l'API Claude (hors UE) : accepté pour la phase de création et de tests ; à revoir avant publication.
