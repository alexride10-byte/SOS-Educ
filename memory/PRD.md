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

## Backlog
- P1: export PDF des trajets, saisie date/heure via selecteurs natifs
- P2: sync chiffree, verrouillage par code/biometrie, choix "suivre le systeme" pour le theme

## Lancement

- Backend : service supervise, routes prefixees `/api`.
- Frontend : `yarn start` (Expo). Les tabs vivent dans `app/(tabs)/`.
