const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    { ignores: ['node_modules/', 'public/'] },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'commonjs',
            globals: globals.node,
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_|^next$' }],
        },
    },
    {
        files: ['tests/**/*.js'],
        languageOptions: { globals: { ...globals.node, ...globals.jest } },
    },
];
