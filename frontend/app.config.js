// Configuration Expo : reprend app.json et ajoute ce qui depend du build.
// - EXPO_PUBLIC_BASE_URL : prefixe de publication web (ex. /SOS-Educ pour GitHub Pages)
// - ANDROID_VERSION_CODE : numero croissant, pour que chaque APK s'installe par-dessus le precedent
module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, versionCode: parseInt(process.env.ANDROID_VERSION_CODE || "1", 10) },
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_PUBLIC_BASE_URL || "" },
});
