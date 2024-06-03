module.exports = {
    "files": ["*.ts"],
    "parser": "@typescript-eslint/parser",
    "plugins": ["@typescript-eslint"],
    "rules": {
        "new-cap": 2,
         "quotes": 0,
         "no-undef": 2,
         "no-unused-vars": 2,
         "max-depth": [2, 3],
         "complexity": [2, 15],
         "max-len": "off",
         "curly": [2, "all"],
         "eol-last": 2,
         "semi": [2, "always"],
         "space-infix-ops": 2,
         "keyword-spacing": [2, {}],
         "no-spaced-func": 2,
         "comma-dangle": [2, "never"],
         "no-trailing-spaces": 2
    },
    "parserOptions": {
        "ecmaVersion": 2021,
        "sourceType": "module"
    },
    "extends": [
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended"
    ],
    "ignorePatterns": ["node_modules/", "dist/", "build/", "temp/", ".cache/", "*.config.js"]
}