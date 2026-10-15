import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.expo/**",
      "**/dist/**",
      "**/next-env.d.ts",
      "**/expo-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["**/*.config.{js,mjs,cjs}", "**/babel.config.js", "**/metro.config.js"],
    languageOptions: {
      globals: { module: "writable", require: "readonly", __dirname: "readonly", process: "readonly" },
    },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
