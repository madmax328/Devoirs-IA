# Registre des traitements (brouillon, à faire valider)

> Responsable de traitement : [RAISON SOCIALE] — SIRET [À COMPLÉTER] — [ADRESSE]. Société en cours de création.

| Traitement             | Finalité                      | Personnes           | Données                                                  | Base légale           | Durée                                     | Où           |
| ---------------------- | ----------------------------- | ------------------- | -------------------------------------------------------- | --------------------- | ----------------------------------------- | ------------ |
| Compte parent          | Gérer l'accès et l'abonnement | Parents             | prénom, e-mail, mot de passe (haché), sessions           | Contrat               | Durée du compte                           | MongoDB (UE) |
| Profil enfant          | Accompagner la scolarité      | Enfants (11–15 ans) | prénom ou pseudo, classe, avatar, code (haché), réglages | Consentement parental | Durée du compte, suppression à la demande | MongoDB (UE) |
| Preuve de consentement | Prouver l'accord du parent    | Parents             | type, version du texte, empreinte, date                  | Obligation légale     | Durée du compte                           | MongoDB (UE) |
| Journal d'audit        | Sécurité                      | Parents             | action, identifiant, date (pas de contenu)               | Intérêt légitime      | 1 an (à mettre en place)                  | MongoDB (UE) |

À venir : photos d'exercices (30 jours), conversations avec le coach, résultats d'exercices, événements de sécurité, paiements (Stripe), appels à l'IA (Anthropic, hors UE : transfert à encadrer avant publication).

Minimisation déjà en place : pas de nom de famille, pas d'e-mail ni de photo de l'enfant ; codes et mots de passe hachés ; journaux sans données personnelles ; suppression d'un profil enfant = suppression de ses données rattachées.
