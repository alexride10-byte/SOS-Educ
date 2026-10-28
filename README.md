# CareSync Pro (SOS-Educ)

Appli pour éducateurs en maison d'accueil : photo des tickets de caisse (date, motif, ESP / CB, total),
budget par session, dossier PDF, agenda des rendez-vous et préparations.

**Données gardées sur l'appareil uniquement** : pas de compte, pas de serveur, lecture des tickets (OCR) faite
dans le téléphone. Voir l'écran « Données et confidentialité » de l'appli.

## Utiliser l'appli sur un téléphone

Adresse : <https://alexride10-byte.github.io/SOS-Educ/>

- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».
- **Android (Chrome)** : menu ⋮ → « Installer l'application » (ou « Ajouter à l'écran d'accueil »).

Une fois installée, l'appli fonctionne hors connexion. Pensez à exporter une sauvegarde régulièrement
(Accueil → Données et confidentialité).

## Pour les développeurs

```bash
cd frontend
yarn install
yarn start            # développement (Expo)
yarn test             # tests de logique (budget, rappels, lecture des tickets)
EXPO_PUBLIC_BASE_URL=/SOS-Educ yarn build:web   # appli web installable dans frontend/dist
```

Publication : le workflow `.github/workflows/deploy-web.yml` publie `frontend/dist` sur GitHub Pages à chaque
mise à jour de `main` (activer une fois : Settings → Pages → Source : « GitHub Actions »).

Le dossier `backend/` (OCR par IA via Emergent) n'est plus utilisé par l'appli web.
