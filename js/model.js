/* Domain logic: matching ingredients to the kitchen, costs, suggestions, grocery list, learning. */
(function () {
  'use strict';
  const K = window.K;
  let S = null; // current state, set by K.useState
  K.useState = (s) => { S = s; K.reindex(); };
  K.S = () => S;

  const sing = (w) => (w.length <= 3 ? w : /ies$/.test(w) ? w.slice(0, -3) + 'y' : /(oes|ches|shes|xes)$/.test(w) ? w.slice(0, -2) : /[^s]s$/.test(w) ? w.slice(0, -1) : w);
  const phrase = (s) => ' ' + String(s || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).map(sing).join(' ') + ' ';

  // Find the catalog entry an ingredient or receipt name refers to (longest catalog name contained in it).
  // Looks at the first choice in "white wine or chicken broth" before the whole line, and also knows
  // names of things already in the kitchen that aren't in the catalog.
  const longestIn = (p) => {
    let best = null;
    const consider = (key) => { if (key && p.includes(' ' + key + ' ') && (!best || key.length > best.length)) best = key; };
    for (const key of Object.keys(S.catalog)) consider(key);
    for (const it of S.items) if (!it.leftoverOf && !S.catalog[it.key]) consider(it.key);
    return best;
  };
  K.matchKey = (name) => {
    if (!S) return K.normName(name);
    const first = String(name || '').replace(/\(.*?\)/g, ' ').split(/,|;| or | and\/or /i)[0];
    const best = longestIn(phrase(first)) || longestIn(phrase(name));
    if (best) return best;
    const n = K.normName(name);
    return n || String(name || '').toLowerCase().trim();
  };
  K.cat = (key) => (S && S.catalog[key]) || null;
  K.displayName = (key) => K.cap(key);

  K.reindex = () => {
    for (const r of S.recipes) for (const ing of r.ingredients) ing.key = K.matchKey(ing.name);
  };

  // ---------- prices and costs ----------
  // Latest known price for a catalog key, optionally at a store. Falls back to the catalog's typical price.
  K.priceFor = (key, store) => {
    let best = null;
    for (const p of S.prices) {
      if (p.key !== key || (store && p.store !== store)) continue;
      if (!best || p.date > best.date) best = p;
    }
    if (best) return { price: best.price, qty: best.qty, unit: best.unit, store: best.store, date: best.date, est: false };
    const c = K.cat(key);
    if (c && c.price && !store) return { price: c.price, qty: c.packQty, unit: c.packUnit, est: true };
    return null;
  };
  K.ingredientCost = (ing, scale = 1) => {
    if (ing.qty == null) return { cost: 0, known: true };
    const p = K.priceFor(ing.key);
    if (!p) return { cost: null, known: false };
    const c = K.cat(ing.key);
    const q = K.conv(ing.qty * scale, ing.unit, p.unit, c && c.density, c && c.each);
    if (q == null) return c && c.staple ? { cost: 0, known: true, est: true } : { cost: null, known: false };
    return { cost: (q / p.qty) * p.price, known: true, est: p.est };
  };
  K.recipeCost = (r, people) => {
    const made = people || r.servings || 1;
    const scale = made / (r.servings || 1);
    let total = 0, unknown = 0, estCost = 0;
    for (const ing of r.ingredients) {
      const c = K.ingredientCost(ing, scale);
      if (c.cost == null) unknown++; else { total += c.cost; if (c.est) estCost += c.cost; }
    }
    return { total, perPerson: total / made, unknown, estShare: total ? estCost / total : 0 };
  };
  K.logCost = (e) => {
    if (e.type === 'out') return e.amount || null;
    if (e.type !== 'cooked') return 0;
    if (e.cost != null) return e.cost;
    const r = S.recipes.find((x) => x.id === e.recipeId);
    if (!r) return null;
    return K.recipeCost(r, (e.servings || 3) + (e.leftovers || 0)).total * (e.costFactor || 1);
  };

  // ---------- kitchen stock ----------
  K.stockOf = (key) => S.items.filter((i) => i.key === key && !i.leftoverOf);
  K.haveAmount = (ing, scale = 1) => {
    // returns 1 if fully covered, 0 if not at all, fraction in between
    if (ing.qty == null) return K.stockOf(ing.key).length ? 1 : (K.cat(ing.key) || {}).staple ? 1 : 0;
    const c = K.cat(ing.key);
    if (c && c.staple && !K.stockOf(ing.key).length) return 1; // assume pantry basics like salt and oil
    const need = ing.qty * scale;
    let have = 0, unknownUnit = false;
    for (const it of K.stockOf(ing.key)) {
      const q = K.conv(it.qty, it.unit, ing.unit, c && c.density, c && c.each);
      if (q == null) unknownUnit = true; else have += q;
    }
    if (unknownUnit && have === 0) return 1;
    return need <= 0 ? 1 : K.clamp(have / need, 0, 1);
  };
  K.coverage = (r, people) => {
    const scale = (people || r.servings) / r.servings;
    const parts = r.ingredients.map((ing) => K.haveAmount(ing, scale));
    const missing = r.ingredients.filter((_, i) => parts[i] < 0.6);
    return { frac: parts.length ? K.sum(parts) / parts.length : 0, missing };
  };
  K.useSoonItems = (days = 3) => S.items.filter((i) => K.daysBetween(K.today(), i.expires) <= days).sort((a, b) => a.expires.localeCompare(b.expires));
  K.leftoverItems = () => S.items.filter((i) => i.leftoverOf && i.qty > 0).sort((a, b) => a.expires.localeCompare(b.expires));

  K.addItem = (key, qty, unit, opts = {}) => {
    const c = K.cat(key);
    const it = {
      id: K.uid(), key, name: opts.name || key, qty, unit,
      loc: opts.loc || (c ? c.loc : 'pantry'),
      expires: opts.expires || K.addDays(K.today(), c ? c.shelf : 7),
      added: K.today(),
    };
    // merge with an existing open item of the same kind and unit when it expires similarly
    const same = S.items.find((i) => i.key === key && !i.leftoverOf && i.unit === unit && Math.abs(K.daysBetween(i.expires, it.expires)) <= 2);
    if (same) { same.qty = K.round(same.qty + qty, 3); return same; }
    S.items.push(it);
    return it;
  };
  K.useUp = (ing, scale) => {
    if (ing.qty == null) return;
    const c = K.cat(ing.key);
    let need = ing.qty * scale;
    const stock = K.stockOf(ing.key).sort((a, b) => a.expires.localeCompare(b.expires));
    for (const it of stock) {
      if (need <= 1e-6) break;
      const inItemUnits = K.conv(need, ing.unit, it.unit, c && c.density, c && c.each);
      if (inItemUnits == null) continue;
      if (it.qty <= inItemUnits + 1e-6) {
        need -= K.conv(it.qty, it.unit, ing.unit, c && c.density, c && c.each);
        S.items.splice(S.items.indexOf(it), 1);
      } else { it.qty = K.round(it.qty - inItemUnits, 3); need = 0; }
    }
  };

  // What cooking a recipe takes out of the kitchen, one row per kitchen item, for the "We made this" check.
  // take is in the row's unit (the unit the kitchen item is stored in); null means the app can't tell.
  K.takeOutPlan = (r, scale) => {
    const rows = {}, notStocked = [];
    for (const ing of r.ingredients) {
      const c = K.cat(ing.key);
      const stock = K.stockOf(ing.key).sort((a, b) => a.expires.localeCompare(b.expires));
      if (!stock.length) { if (!(c && c.staple) && ing.key !== 'water' && !notStocked.includes(ing.key)) notStocked.push(ing.key); continue; }
      let row = rows[ing.key];
      if (!row) {
        const unit = stock[0].unit;
        let have = 0;
        for (const it of stock) { const q = K.conv(it.qty, it.unit, unit, c && c.density, c && c.each); if (q != null) have += q; }
        row = rows[ing.key] = { key: ing.key, name: stock[0].name || ing.key, unit, have: K.round(have, 3), take: 0, unknown: false, uses: [] };
      }
      row.uses.push(ing.qty != null ? K.fmtAmount(ing.qty * scale, ing.unit) + ' ' + ing.name : ing.name);
      if (ing.qty == null) { row.unknown = true; continue; }
      const q = K.conv(ing.qty * scale, ing.unit, row.unit, c && c.density, c && c.each);
      if (q == null) row.unknown = true; else row.take += q;
    }
    const out = Object.values(rows).map((row) => {
      if (row.unknown && row.take === 0) row.take = null;
      else row.take = K.round(Math.min(row.take, row.have), 3);
      return row;
    });
    return { rows: out, notStocked };
  };
  // Take amounts out of the kitchen: earliest use-by first, removing items that run out.
  K.takeOut = (key, amount, unit) => {
    if (!(amount > 0)) return;
    const c = K.cat(key);
    let need = amount;
    for (const it of K.stockOf(key).sort((a, b) => a.expires.localeCompare(b.expires))) {
      if (need <= 1e-6) break;
      const inItem = K.conv(need, unit, it.unit, c && c.density, c && c.each);
      if (inItem == null) continue;
      if (it.qty <= inItem + 1e-6) {
        need -= K.conv(it.qty, it.unit, unit, c && c.density, c && c.each);
        S.items.splice(S.items.indexOf(it), 1);
      } else { it.qty = K.round(it.qty - inItem, 3); need = 0; }
    }
  };

  // ---------- learning ----------
  K.learnedYield = (r) => {
    const y = (r.yields || []).slice(-8);
    if (y.length < 2) return null;
    return K.round(K.sum(y) / y.length, 1);
  };
  K.daysSinceCooked = (r) => (r.cooked && r.cooked.length ? K.daysBetween(r.cooked[r.cooked.length - 1], K.today()) : null);
  K.isFast = (r) => r.time && r.time <= 30;
  K.isCheap = (r) => { const c = K.recipeCost(r, S.settings.household); return c.unknown < r.ingredients.length && c.perPerson <= 3; };
  K.recipeTags = (r) => {
    const t = [];
    if (K.isFast(r)) t.push('fast');
    if (K.isCheap(r)) t.push('cheap');
    for (const x of r.tags || []) if (!t.includes(x)) t.push(x);
    return t;
  };

  // Score recipes for tonight or for a day of the week plan.
  K.scoreRecipe = (r, ctx = {}) => {
    const people = S.settings.household;
    const cov = K.coverage(r, people);
    const soon = K.useSoonItems(3).filter((i) => !i.leftoverOf);
    const usesSoon = soon.filter((i) => r.ingredients.some((g) => g.key === i.key));
    const since = K.daysSinceCooked(r);
    let score = cov.frac * 4 + usesSoon.length * 1.6 + (r.rating || 0) * 0.8;
    if (since != null && since < 5) score -= 3;
    else if (since != null && since < 9) score -= 1;
    else if (since == null || since > 21) score += 0.6;
    const wd = ctx.date ? K.dow(ctx.date) : K.dow(K.today());
    if (wd < 4 && K.isFast(r)) score += 0.6;
    if (wd < 4 && r.time > 60) score -= 1.5;
    if ((wd === 4 || wd === 5) && (r.tags || []).includes('celebration')) score += 0.4;
    if (ctx.shared) score += ctx.shared(r) * 0.7;
    if (ctx.exclude && ctx.exclude.has(r.id)) score -= 100;
    let why;
    if (usesSoon.length) why = 'Uses ' + usesSoon.slice(0, 2).map((i) => i.key).join(' and ') + ' before it goes bad';
    else if (!cov.missing.length) why = 'You have everything for this';
    else if (since == null) why = "You haven't made this yet";
    else if (since > 21) why = 'Not made in ' + Math.round(since / 7) + ' weeks';
    else if (K.isFast(r)) why = 'Quick, about ' + r.time + ' minutes';
    else why = 'Good fit with what you have';
    return { r, score, cov, why, usesSoon };
  };
  K.suggestTonight = (n = 3) => S.recipes.map((r) => K.scoreRecipe(r)).sort((a, b) => b.score - a.score).slice(0, n);

  // ---------- week plan ----------
  K.dayPlan = (date) => (S.plan[date] = S.plan[date] || {});
  K.plannedRecipesBetween = (from, to) => {
    const out = [];
    for (const [date, p] of Object.entries(S.plan)) {
      if (date < from || date > to || !p.dinner || p.dinner.type !== 'recipe') continue;
      const r = S.recipes.find((x) => x.id === p.dinner.recipeId);
      // Planned dinners are made as written unless the plan says half or double
      if (r) out.push({ date, r, people: r.servings * (p.dinner.scale || 1) });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  };
  K.fillWeek = (weekStart) => {
    const today = K.today();
    const days = [...Array(7)].map((_, i) => K.addDays(weekStart, i)).filter((d) => d >= today);
    const planned = new Set(K.plannedRecipesBetween(weekStart, K.addDays(weekStart, 6)).map((x) => x.r.id));
    let filled = 0;
    let lastBig = null;
    for (const date of days) {
      const p = K.dayPlan(date);
      if (p.dinner) { if (p.dinner.type === 'recipe') { const r = S.recipes.find((x) => x.id === p.dinner.recipeId); lastBig = r && (K.learnedYield(r) || r.servings) - S.settings.household >= 3 ? date : lastBig; } continue; }
      if (lastBig && K.daysBetween(lastBig, date) === 1) { p.dinner = { type: 'leftovers' }; lastBig = null; filled++; continue; }
      if (!S.recipes.length) break;
      const keys = new Set();
      for (const id of planned) { const r = S.recipes.find((x) => x.id === id); if (r) r.ingredients.forEach((g) => keys.add(g.key)); }
      const shared = (r) => r.ingredients.filter((g) => keys.has(g.key) && !(K.cat(g.key) || {}).staple).length;
      const best = S.recipes.map((r) => K.scoreRecipe(r, { date, shared, exclude: planned })).sort((a, b) => b.score - a.score)[0];
      if (!best || best.score < -50) continue;
      p.dinner = { type: 'recipe', recipeId: best.r.id, scale: 1 };
      planned.add(best.r.id);
      filled++;
      const y = K.learnedYield(best.r) || best.r.servings;
      lastBig = y - S.settings.household >= 3 ? date : null;
    }
    return filled;
  };

  // ---------- grocery list ----------
  K.groceryFromPlan = (from, to) => {
    const need = {};
    for (const { r, people } of K.plannedRecipesBetween(from, to)) {
      const scale = people / r.servings;
      for (const ing of r.ingredients) {
        if (ing.qty == null) continue;
        const c = K.cat(ing.key);
        if (c && c.staple) continue;
        const unit = c ? c.packUnit : ing.unit;
        const q = K.conv(ing.qty * scale, ing.unit, unit, c && c.density, c && c.each);
        const e = (need[ing.key] = need[ing.key] || { key: ing.key, qty: 0, unit, recipes: new Set(), raw: [] });
        if (q == null) e.raw.push(ing); else e.qty += q;
        e.recipes.add(r.name);
      }
    }
    const out = [];
    for (const e of Object.values(need)) {
      const c = K.cat(e.key);
      let have = 0;
      for (const it of K.stockOf(e.key)) { const q = K.conv(it.qty, it.unit, e.unit, c && c.density, c && c.each); if (q != null) have += q; }
      const short = e.qty - have;
      if (short <= 0.001 && !(e.raw.length && have === 0)) continue;
      if (c && c.packQty) {
        const packs = Math.max(1, Math.ceil(Math.max(short, 0.001) / c.packQty - 0.05));
        out.push({ key: e.key, name: K.displayName(e.key), packs, qty: packs * c.packQty, unit: c.packUnit, for: [...e.recipes] });
      } else {
        out.push({ key: e.key, name: K.displayName(e.key), packs: null, qty: K.round(Math.max(short, 0), 2), unit: e.unit, for: [...e.recipes] });
      }
    }
    return out;
  };
  // Items you buy regularly that are due again and not in the kitchen.
  K.usualsDue = () => {
    const dates = {};
    for (const rc of S.receipts) for (const l of rc.lines) if (l.forUs && l.key) (dates[l.key] = dates[l.key] || new Set()).add(rc.date);
    const out = [];
    for (const [key, set] of Object.entries(dates)) {
      const d = [...set].sort();
      if (d.length < 4) continue;
      const gaps = d.slice(1).map((x, i) => K.daysBetween(d[i], x));
      const avg = K.sum(gaps) / gaps.length;
      const since = K.daysBetween(d[d.length - 1], K.today());
      if (since >= avg * 0.9 && !K.stockOf(key).length && !S.grocery.some((g) => g.key === key && !g.done)) out.push({ key, avg: Math.round(avg), since });
    }
    return out.sort((a, b) => b.since / b.avg - a.since / a.avg).slice(0, 6);
  };
  K.groceryText = () => {
    const open = S.grocery.filter((g) => !g.done);
    return open.map((g) => g.name + (g.amount ? ' (' + g.amount + ')' : '')).join('\n');
  };
  K.importGroceryText = (text) => {
    let n = 0;
    for (let l of String(text).split(/\r?\n/)) {
      l = l.replace(/^[\s\-•*◦▢□○●]+|^\[[ x]?\]\s*/gi, '').trim();
      if (!l) continue;
      const p = K.parseIngredient(l);
      const key = K.matchKey(p.name || l);
      if (S.grocery.some((g) => !g.done && g.key === key)) continue;
      S.grocery.push({ id: K.uid(), name: K.cap(p.name || l), key, amount: p.qty != null ? K.fmtAmount(p.qty, p.unit) : '', done: false, source: 'manual' });
      n++;
    }
    return n;
  };

  // ---------- reading a receipt ----------
  // Turn parsed receipt lines into reviewable rows: recognize codes this store has used before (even when
  // the photo misread a letter or two), guess the item, and catch prices that were probably misread.
  K.lastPrice = (key, store) => {
    let best = null;
    for (const p of S.prices) if (p.key === key && p.store === store && (!best || p.date > best.date)) best = p;
    return best ? best.price : null;
  };
  K.lastCodePrice = (codeKey, store) => {
    let best = null;
    for (const rc of S.receipts) {
      if (rc.store !== store || (best && rc.date < best.date)) continue;
      const l = rc.lines.find((x) => K.receiptCodeKey(x.code) === codeKey);
      if (l) best = { date: rc.date, price: l.price };
    }
    return best ? best.price : null;
  };
  K.reviewReceiptLines = (lines, store) => {
    const dict = S.shorthand[store] || {};
    const codes = Object.keys(dict);
    const rows = lines.map((l) => {
      let codeKey = l.codeKey, mapped = dict[codeKey], seenAs = null;
      if (!mapped && codeKey.length >= 4) {
        let best = null, bs = 0;
        for (const c of codes) { const sc = K.similar(codeKey, c); if (sc > bs) { bs = sc; best = c; } }
        if (best && bs >= 0.62) { seenAs = best; mapped = dict[best]; }
      }
      const guess = mapped || K.matchKey(l.code.toLowerCase());
      const key = S.catalog[guess] ? guess : '';
      const row = { code: seenAs || l.code, codeKey: seenAs || codeKey, read: seenAs ? l.code : null, price: l.price, name: key, known: !!mapped, check: !!l.unsure, fixedFrom: null,
        forUs: !(S.catalog[guess] && ['Household'].includes(S.catalog[guess].cat)) };
      if (key) {
        const expect = mapped ? K.lastCodePrice(seenAs || codeKey, store) : null;
        if (expect != null && Math.abs(expect - l.price) > 0.005) row.last = expect;
        const typical = expect || K.lastPrice(key, store) || (S.catalog[key] && S.catalog[key].price);
        if (expect != null && Math.abs(expect - l.price) > 0.005 && K.priceVariants(l.price).some((v) => Math.abs(v - expect) < 0.005)) {
          row.fixedFrom = l.price; row.price = expect; row.check = false;
        } else if (typical && (l.price > typical * 3 || l.price < typical * 0.3)) row.check = true;
      }
      return row;
    });
    // The same code twice on one receipt is almost always the same price: if most copies agree, use theirs.
    const groups = {};
    for (const r of rows) if (r.codeKey) (groups[r.codeKey] = groups[r.codeKey] || []).push(r);
    for (const g of Object.values(groups)) {
      if (g.length < 3) continue;
      const count = {};
      for (const r of g) count[r.price.toFixed(2)] = (count[r.price.toFixed(2)] || 0) + 1;
      const [top, n] = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
      if (n < 2 || n === g.length) continue;
      for (const r of g) if (r.price.toFixed(2) !== top) { if (r.fixedFrom == null) r.fixedFrom = r.price; r.price = +top; r.check = false; r.sameAs = true; }
    }
    return rows;
  };

  // ---------- spending ----------
  K.receiptsBetween = (from, to) => S.receipts.filter((r) => r.date >= from && r.date <= to);
  K.groceryForUs = (r) => K.sum(r.lines.filter((l) => l.forUs && !r.event), (l) => l.price);
  K.groceryOther = (r) => K.sum(r.lines.filter((l) => !l.forUs || r.event), (l) => l.price);
})();
