module.exports = [
    {
        files: ['js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'script',
            globals: {
                window: 'readonly',
                document: 'readonly',
                localStorage: 'readonly',
                console: 'readonly',
                fetch: 'readonly',
                FormData: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                clearTimeout: 'readonly',
                requestAnimationFrame: 'readonly',
                IntersectionObserver: 'readonly',
                alert: 'readonly',
                firebase: 'readonly'
            }
        },
        rules: {
            'no-undef': 'error',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
        }
    }
];
