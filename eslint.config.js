import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginJest from 'eslint-plugin-jest';

export default [
  {
    ignores: ['node_modules/', 'dist/', 'public/', '*.min.js'],
  },
  {
    languageOptions: { 
      globals: { 
        ...globals.browser, 
        ...globals.node, 
        ...globals.jest,
        THREE: 'readonly',
        showElementDetail: 'readonly',
        openSpacePanel: 'readonly',
        openMarketsPanel: 'readonly',
        openRadarPanel: 'readonly',
        openStormPanel: 'readonly',
        openPeriodicTable: 'readonly',
        speak: 'readonly',
        renderPeriodicTable: 'readonly',
        showMolecule: 'readonly',
        refreshISS: 'readonly',
        refreshAsteroids: 'readonly',
        periodicTableData: 'readonly',
        molecules: 'readonly',
        safeFetch: 'readonly',
        Android: 'readonly',
        marked: 'readonly',
      }, 
    },
  },
  pluginJs.configs.recommended,
  {
    plugins: {
      jest: pluginJest,
    },
    rules: {
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      'no-console': 'off',
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['warn', 'all'],
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'no-multiple-empty-lines': ['error', { 'max': 2 }],
      'space-in-parens': ['error', 'never'],
      'array-bracket-spacing': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'no-empty': 'off',
      'no-inner-declarations': 'off',
    },
  },
];
