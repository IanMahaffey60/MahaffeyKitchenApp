// Turns seed/family-recipes.txt into js/seed.js. Run from the kitchen-app folder: node seed/build-seed.js
// Recipe format: "=== Name | Cuisine | Serves | Minutes | tags, comma separated | photo numbers",
// then ingredient lines, a "---" line, step lines, a "---" line, and notes.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const txt = fs.readFileSync(path.join(__dirname, 'family-recipes.txt'), 'utf8');
const recipes = txt.split(/^=== /m).slice(1).map((b) => {
  const lines = b.split('\n');
  const [name, cuisine, serves, mins, tags] = lines[0].split('|').map((s) => s.trim());
  const parts = lines.slice(1).join('\n').split(/^---\s*$/m).map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean));
  return {
    name, cuisine: cuisine || 'Other', servings: +serves || 4, time: +mins || null,
    tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    ingredients: parts[0] || [], steps: parts[1] || [], notes: (parts[2] || []).join('\n'),
  };
});
// Receipts: "=== date | store | tax", then "CODE | price | catalog item | amount unit | not for meals"
const receipts = fs.readFileSync(path.join(__dirname, 'first-receipt.txt'), 'utf8').split(/^=== /m).slice(1).map((b) => {
  const lines = b.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const [date, store, tax] = lines[0].split('|').map((s) => s.trim());
  return {
    date, store, tax: +tax || 0,
    lines: lines.slice(1).map((l) => {
      const [code, price, key, amount, flag] = l.split('|').map((s) => (s || '').trim());
      const [qty, unit] = amount.split(/\s+/);
      return { code, price: +price, key, qty: +qty || 1, unit: unit || '', forUs: !/not for meals/i.test(flag || '') };
    }),
  };
});
// Store prices: "=== store | date", then "catalog item | amount unit | price | product"
const priceBlocks = fs.readFileSync(path.join(__dirname, 'store-prices.txt'), 'utf8').split(/^=== /m).slice(1).map((b) => {
  const lines = b.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const [store, date] = lines[0].split('|').map((s) => s.trim());
  return {
    store, date,
    items: lines.slice(1).map((l) => {
      const [key, amount, price, product] = l.split('|').map((s) => (s || '').trim());
      const [qty, unit] = amount.split(/\s+/);
      return { key, qty: +qty || 1, unit: unit || '', price: +price, product };
    }),
  };
});
const js = `/* The family recipe binder: the starting recipes on a new device. Generated from seed/family-recipes.txt by seed/build-seed.js. */
(function () {
  'use strict';
  const K = window.K;
  K.FAMILY_RECIPES = ${JSON.stringify(recipes, null, 1)};
  K.familyRecipes = () => K.FAMILY_RECIPES.map((r) => ({
    id: K.uid(), name: r.name, cuisine: r.cuisine, servings: r.servings, time: r.time, tags: r.tags.slice(), source: (r.notes.match(/https?:\\/\\/\\S+/) || [''])[0], notes: r.notes,
    ingredients: r.ingredients.map(K.parseIngredient), steps: r.steps.slice(), rating: 0, yields: [], cooked: [], created: K.today(),
  }));
  K.FIRST_RECEIPTS = ${JSON.stringify(receipts, null, 1)};
  // Load a receipt the way "Add to the kitchen" does: prices, what's now in the kitchen, and the store's shorthand codes.
  const loadReceipt = (S, rc) => {
    const dict = (S.shorthand[rc.store] = S.shorthand[rc.store] || {});
    const lines = rc.lines.map((l) => {
      const c = S.catalog[l.key];
      dict[l.code.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\\s+/g, ' ').trim()] = l.key;
      if (l.forUs) {
        S.prices.push({ date: rc.date, store: rc.store, key: l.key, qty: l.qty, unit: l.unit, price: l.price });
        if (c && c.cat !== 'Household') K.addItem(l.key, l.qty, l.unit, { expires: K.addDays(rc.date, c.shelf || 7) });
      }
      return { code: l.code, name: l.key, key: l.key, price: l.price, forUs: l.forUs, cat: c ? c.cat : 'Other' };
    });
    S.receipts.push({ id: K.uid(), date: rc.date, store: rc.store, event: false, lines, tax: rc.tax, total: K.round(K.sum(lines, (l) => l.price) + rc.tax) });
  };
  // Devices set up before a family recipe was added get it on their next open, once (deleted ones stay deleted).
  K.addNewFamilyRecipes = (s) => {
    if (!s.seedAdded) s.seedAdded = s.recipes.map((r) => r.name);
    const have = new Set(s.seedAdded.concat(s.recipes.map((r) => r.name)));
    const fresh = K.familyRecipes().filter((r) => !have.has(r.name));
    s.recipes.push(...fresh);
    s.seedAdded = [...new Set(s.seedAdded.concat(K.FAMILY_RECIPES.map((r) => r.name)))];
    return fresh.length;
  };
  K.STORE_PRICES = ${JSON.stringify(priceBlocks, null, 1)};
  // Typical store prices become the catalog's estimate for items your receipts haven't priced yet.
  // Also brings in catalog items added since this device was set up. Runs once per price list.
  K.applyStorePrices = (s) => {
    const stamp = K.STORE_PRICES.map((b) => b.store + ' ' + b.date).join(', ');
    if (s.storePrices === stamp) return 0;
    const def = K.defaultCatalog();
    for (const [key, c] of Object.entries(def)) {
      if (!s.catalog[key]) s.catalog[key] = c;
      else { if (c.each && !s.catalog[key].each) s.catalog[key].each = c.each; if (c.density && !s.catalog[key].density) s.catalog[key].density = c.density; }
    }
    let n = 0;
    for (const b of K.STORE_PRICES) for (const it of b.items) {
      const c = s.catalog[it.key];
      if (!c) continue;
      Object.assign(c, { packQty: it.qty, packUnit: it.unit, price: it.price, priceFrom: b.store + '.com, ' + b.date + ': ' + it.product });
      n++;
    }
    s.storePrices = stamp;
    return n;
  };
  K.loadSeedReceipts = (s) => { for (const rc of K.FIRST_RECEIPTS) loadReceipt(s, rc); };
  K.makeFamily = () => {
    const s = K.emptyState(); s.recipes = K.familyRecipes(); s.seedAdded = s.recipes.map((r) => r.name);
    K.applyStorePrices(s);
    K.useState(s);
    for (const rc of K.FIRST_RECEIPTS) loadReceipt(s, rc);
    return s;
  };
})();
`;
fs.writeFileSync(path.join(root, 'js', 'seed.js'), js);
console.log('Wrote js/seed.js with ' + recipes.length + ' recipes and ' + receipts.length + ' receipt(s) and ' + priceBlocks.reduce((n, b) => n + b.items.length, 0) + ' store prices');
