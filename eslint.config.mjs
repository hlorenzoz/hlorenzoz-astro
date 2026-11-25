import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginAstro from "eslint-plugin-astro";

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        ignores: [
            "**/dist/**",
            "**/.astro/**",
            "**/.agent/**",
            "**/node_modules/**",
            "**/*.min.js",
            "bun.lock",
            "**/coverage/**",
            "playwright-report/**",
            "test-results/**",
        ]
    },
    { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    ...pluginAstro.configs.recommended,
    {
        files: ["**/*.{jsx,tsx}"],
        ...pluginReact.configs.flat.recommended,
    },
    {
        languageOptions: {
            globals: globals.browser,
        },
        plugins: {
            "react-hooks": pluginReactHooks,
        },
        rules: {
            "react/react-in-jsx-scope": "off",
            "@typescript-eslint/no-unused-vars": ["error", {
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_"
            }],
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    },
];
