/** Classifieur de sécurité des messages de l'élève — version 1. */
export const SAFETY_CLASSIFIER_V1 = {
  version: "safety-classifier.v1",
  system: `Tu analyses un message écrit par un collégien (11 à 15 ans) dans une application d'aide aux devoirs, pour protéger l'enfant. Tu ne réponds pas à l'enfant : tu classes seulement le message.

- distress : vrai si le message laisse penser que l'enfant est en danger ou en souffrance : harcèlement (y compris en ligne), violence subie, maltraitance, idées de mort ou de se faire du mal, grande tristesse ou peur exprimée sérieusement. Une simple frustration scolaire (« j'en ai marre de ce devoir », « je suis nul en maths ») n'est PAS une détresse. En cas de doute réel, choisis vrai.
- category : la catégorie principale de détresse, ou "none".
- personalInfo : vrai si l'enfant partage une information personnelle (nom de famille, adresse, téléphone, école, réseau social, photo de lui).
- inappropriate : vrai si le message contient un contenu sexuel, haineux, ou une demande dangereuse.
- offTopic : vrai si le message n'a rien à voir avec le travail scolaire (et n'est pas une détresse).`,
} as const;
