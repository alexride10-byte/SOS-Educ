# CareSync Pro - Architecture

Prototype offline-first pour un professionnel en maison d'accueil pour enfants.
**IMPORTANT**: le prototype n'utilise que des donnees fictives.

## Modules

- **Accueil** (`app/(tabs)/index.tsx`) : resume journee + 3 cartes modules.
- **Comptabilite** (`app/(tabs)/comptabilite.tsx`) : depenses, sessions 15 jours, OCR ticket, export PDF.
- **Agenda** (`app/(tabs)/agenda.tsx`) : rendez-vous, calcul heure de depart, notifications locales T-1h/-30/-25/-5.
- **Vehicule** (`app/(tabs)/vehicule.tsx`) : trajets, OCR compteur, prerempli depuis le dernier trajet.

## Separation claire

```
app/              -> ecrans (Expo Router, file-based)
src/
  types/          -> modeles de donnees
  lib/
    storage.ts    -> AsyncStorage repositories (sessions, expenses, events, trips)
    seed.ts       -> donnees de demo fictives
    ocr.ts        -> appels /api/ocr/receipt et /api/ocr/odometer
    notifications.ts -> expo-notifications locales
    pdf.ts        -> export PDF via expo-print + expo-sharing
    time.ts       -> calcul heure de depart
    image-picker.ts -> camera / galerie
  theme.ts        -> tokens design (couleurs Teal/Slate)
backend/
  server.py       -> FastAPI, endpoints /api/ocr/* (gpt-5.6-terra vision)
```

## Offline-first

- 100% des lectures / ecritures (agenda, depenses, trajets, sessions) passent par AsyncStorage local.
- Les notifications sont planifiees localement avec expo-notifications.
- La generation PDF est entierement locale (expo-print).
- Seul l'OCR necessite internet (fallback: saisie manuelle complete toujours disponible).

## Preparation sync future

Les 4 repositories (`sessionsRepo`, `expensesRepo`, `eventsRepo`, `tripsRepo`)
exposent la meme API (`list / save / remove`). Pour ajouter une sync chiffree
plus tard, il suffit de wrapper ces repos sans toucher aux ecrans.

## Implemente (oct. 2026)
- MVP 4 onglets (Accueil, Compta, Agenda, Vehicule), donnees fictives pre-chargees
- OCR tickets + compteurs (gpt-5.6-terra vision, cle Emergent), saisie manuelle en secours
- Export PDF de session, notifications locales, calcul heure de depart
- Theme clair/sombre avec bouton (persiste), calendrier mensuel colore dans l'Agenda
- Tests: backend 4/4, frontend 100% (iteration 1)

## Evolution v2 (oct. 2026)
- Module vehicule/trajets supprime (ecran, onglet, carte d'accueil, donnees locales, endpoint /api/ocr/odometer)
- Categories : Alimentation, Entretien de la maison, Animation / sorties, Divers ; null = "A classer" (exclu de la repartition)
- Budget initial par session + tableau de bord sombre (anneau, camembert, legende, etats vides) - src/lib/money.ts
- Agenda : codes enfants A-E (couleurs personnalisables, lettre toujours affichee), rappels configurables (1 h, 30 min, depart, 5 min) avec fusion des doublons, explication du calcul de depart
- Preparations (taches) liees ou non a un RDV, rappel "veille 18:00", section "A preparer" sur l'accueil
- Photos copiees dans le dossier documents prive ; justificatifs integres en base64 dans le PDF
- Migration locale v2 automatique (src/lib/migrate.ts)
- Tests iteration 2 : backend 4/4, frontend 11/11

## Points en attente
- Audit "100 % hors ligne" realise ; le plan n'est pas encore valide. L'OCR envoie toujours la photo du ticket au serveur puis a OpenAI
- Pas de gestion des droits : le budget est modifiable par toute personne utilisant le telephone
- Donnees locales non chiffrees (AsyncStorage)

## Backlog
- P1: saisie date/heure via selecteurs natifs
- P2: sync chiffree, verrouillage par code/biometrie, choix "suivre le systeme" pour le theme

## Lancement

- Backend : service supervise, routes prefixees `/api`.
- Frontend : `yarn start` (Expo). Les tabs vivent dans `app/(tabs)/`.
