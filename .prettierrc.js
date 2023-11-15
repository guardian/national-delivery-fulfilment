module.exports = {
    ...require('@guardian/prettier'),
    tabWidth: 4,
    useTabs: false,
    overrides: [
        {
            files: '**/*.json',
            options: {
                parser: 'json',
                singleQuote: false,
            },
        },
    ],
};
