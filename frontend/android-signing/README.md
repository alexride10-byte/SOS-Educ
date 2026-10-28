# Clé de signature de l'appli Android

Chaque APK est signé par la clé `caresync.p12`. Android n'accepte une mise à jour que si elle est signée
par **la même clé** : la perdre obligerait à désinstaller l'appli (et donc à perdre les données du téléphone).

- La clé n'est **pas** dans le dépôt (public) : elle est stockée, encodée en base64, dans le secret GitHub
  `CARESYNC_KEYSTORE_BASE64` (Settings → Secrets and variables → Actions).
- Le workflow `.github/workflows/android-apk.yml` la recrée ici au moment du build (fichier ignoré par git).
- Le mot de passe du fichier n'est qu'une protection secondaire : c'est le secret GitHub qui protège la clé.
- Gardez une copie de la valeur du secret dans un endroit sûr (gestionnaire de mots de passe).
