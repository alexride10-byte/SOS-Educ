/** @type {import('jest').Config} */
// Tests de logique pure (calculs budget, report, rappels). Pas de preset React Native necessaire.
module.exports = {
  testEnvironment: "node",
  transform: { "^.+\\.[jt]sx?$": ["babel-jest", { presets: ["babel-preset-expo"] }] },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  testMatch: ["<rootDir>/__tests__/**/*.test.ts"],
};
