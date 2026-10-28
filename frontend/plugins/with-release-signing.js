// Plugin Expo : signe l'APK "release" avec la cle de l'appli (android-signing/caresync.p12).
// Le mot de passe vient de la variable d'environnement CARESYNC_KEYSTORE_PASSWORD (secret GitHub).
// Sans mot de passe, la cle de debug est utilisee : l'APK s'installe, mais ne pourra pas etre
// mis a jour par une version signee (il faudrait desinstaller, donc perdre les donnees).
const { withAppBuildGradle } = require("expo/config-plugins");

const SIGNING = `
        release {
            if (System.getenv("CARESYNC_KEYSTORE_PASSWORD")) {
                storeFile file("../../android-signing/caresync.p12")
                storeType "pkcs12"
                storePassword System.getenv("CARESYNC_KEYSTORE_PASSWORD")
                keyAlias "caresync"
                keyPassword System.getenv("CARESYNC_KEYSTORE_PASSWORD")
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (!g.includes("CARESYNC_KEYSTORE_PASSWORD")) {
      // 1. type de build "release" (dans buildTypes) : cle de l'appli si le mot de passe est fourni
      const types = g.indexOf("buildTypes {");
      const rel = g.indexOf("release {", types);
      const sc = g.indexOf("signingConfig signingConfigs.debug", rel);
      if (types < 0 || rel < 0 || sc < 0) throw new Error("with-release-signing : build.gradle inattendu");
      g =
        g.slice(0, sc) +
        'signingConfig System.getenv("CARESYNC_KEYSTORE_PASSWORD") ? signingConfigs.release : signingConfigs.debug' +
        g.slice(sc + "signingConfig signingConfigs.debug".length);
      // 2. declaration de la cle
      g = g.replace("signingConfigs {\n", "signingConfigs {\n" + SIGNING.slice(1) + "\n");
    }
    cfg.modResults.contents = g;
    return cfg;
  });
};
