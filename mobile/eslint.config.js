const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expo,
  { ignores: ['dist/**', '.expo/**', 'assets/**'] },
  { files: ['src/game/engine.ts', 'src/components/city-map.tsx', 'src/app/index.tsx'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
]);
