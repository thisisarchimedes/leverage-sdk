module.exports = {
  'env': {
    'es2021': true,
    'node': true,
  },
  'extends': [
    'eslint:recommended',
    'google',
    'plugin:@typescript-eslint/recommended',
    'plugin:vitest/all',
  ],
  'overrides': [
    {
      'env': {
        'node': true,
      },
      'files': [
        '.eslintrc.{js,cjs}',
      ],
      'parserOptions': {
        'sourceType': 'script',
      },
    },
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaVersion': 'latest',
    'sourceType': 'module',
  },
  'plugins': [
    '@typescript-eslint',
    'promise',
    'vitest',
  ],
  'rules': {
    'complexity': ['error', 6],
    'require-await': 'error',
    'max-len': ['error', {'code': 120}],
    'require-jsdoc': 'off',
    'vitest/max-expects': [
      'error',
      {
        'max': 3,
      },
    ],
    'vitest/prefer-expect-assertions': 'error',
    'vitest/expect-expect': 'error',
  },
};
