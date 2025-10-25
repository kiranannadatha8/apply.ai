export default {
  root: true,
  env: { es2022: true, node: true, browser: true },
  extends: ["eslint:recommended"],
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  rules: { "no-console": ["warn", { allow: ["warn", "error"] }] },
};
