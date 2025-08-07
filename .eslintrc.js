module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  plugins: [
    'html'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Code Quality
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    
    // Best Practices
    'eqeqeq': ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-alert': 'warn',
    
    // Modern JavaScript
    'arrow-spacing': 'error',
    'object-shorthand': 'error',
    'template-curly-spacing': 'error',
    'prefer-template': 'error',
    
    // Performance
    'no-loop-func': 'error',
    'no-extend-native': 'error',
    
    // Accessibility
    'no-restricted-globals': ['error', 'event', 'fdescribe']
  },
  overrides: [
    {
      files: ['*.html'],
      parser: '@html-eslint/parser',
      rules: {
        'no-undef': 'off'
      }
    }
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.min.js',
    'coverage/'
  ]
}