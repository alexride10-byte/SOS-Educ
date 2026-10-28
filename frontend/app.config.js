// Configuration Expo : reprend app.json et ajoute le prefixe de publication web
// (ex. EXPO_PUBLIC_BASE_URL=/SOS-Educ pour GitHub Pages ; vide en developpement).
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_PUBLIC_BASE_URL || "" },
});
