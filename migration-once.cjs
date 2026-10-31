// One-time cleanup of superseded files only; generated assets and root test/ are untouched.
const fs = require('node:fs');
for (const name of [
  'Docs',
  'src/commerce-extensibility-1/actions/shared',
  'src/commerce-extensibility-1/actions/validate-cart-item',
  'src/commerce-extensibility-1/actions/revalidate-quote-merge',
  'src/commerce-backend-ui-2/actions/shared',
  'src/commerce-backend-ui-2/actions/get-cart-validation-settings/__tests__',
  'src/commerce-backend-ui-2/actions/save-cart-validation-settings/__tests__',
]) {
  fs.rmSync(name, { recursive: true, force: true });
  if (fs.existsSync(name)) throw new Error(`Cleanup failed for ${name}`);
}
console.log('Removed superseded Docs, shared helpers, old webhook handlers and colocated tests.');
