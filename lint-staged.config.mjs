export default {
  '**/*.{js,jsx,mjs,cjs,ts,tsx}': [
    // Avoid Windows .cmd wrappers and their command-line length/encoding limits.
    'node node_modules/eslint/bin/eslint.js --fix --max-warnings 0',
    'node node_modules/prettier/bin/prettier.cjs --write --ignore-unknown',
  ],
  '**/*.{json,css,scss,md,html,yml,yaml,svg}':
    'node node_modules/prettier/bin/prettier.cjs --write --ignore-unknown',
};
