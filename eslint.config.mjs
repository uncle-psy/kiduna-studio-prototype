import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "jsx-a11y/role-supports-aria-props": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "next-env.d.ts"]),
]);
