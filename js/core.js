/* Core helpers: dates, units, ingredient names, parsing, storage. No UI here. */
(function () {
  'use strict';
  const K = (window.K = window.K || {});

  // ---------- small utils ----------
  K.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  K.uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  K.money = (n, digits) => (n == null || !isFinite(n) ? '–' : '$' + n.toFixed(digits == null ? 2 : digits));
  K.round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
  K.sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (f(x) || 0), 0);
  K.clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  K.cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  // ---------- dates (local, as YYYY-MM-DD) ----------
  const pad = (n) => String(n).padStart(2, '0');
  K.iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  K.today = () => K.iso(new Date());
  K.parseIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  K.addDays = (s, n) => { const d = K.parseIso(s); d.setDate(d.getDate() + n); return K.iso(d); };
  K.daysBetween = (a, b) => Math.round((K.parseIso(b) - K.parseIso(a)) / 86400000);
  K.weekStart = (s) => { const d = K.parseIso(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return K.iso(d); };
  K.DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  K.dow = (s) => (K.parseIso(s).getDay() + 6) % 7;
  K.fmtDate = (s, opts) => K.parseIso(s).toLocaleDateString(undefined, opts || { month: 'short', day: 'numeric' });
  K.relDays = (s) => {
    const n = K.daysBetween(K.today(), s);
    if (n < 0) return { t: 'past date', c: 'bad' };
    if (n === 0) return { t: 'today', c: 'bad' };
    if (n === 1) return { t: 'tomorrow', c: 'bad' };
    if (n <= 3) return { t: n + ' days', c: 'warn' };
    if (n > 60) return { t: Math.round(n / 30) + ' mo', c: 'ok' };
    return { t: n + ' days', c: 'ok' };
  };

  // ---------- units ----------
  const MASS = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 };
  const VOL = { ml: 1, l: 1000, tsp: 4.93, tbsp: 14.79, cup: 236.6, floz: 29.57, pt: 473, qt: 946, gal: 3785 };
  const ALIAS = {
    g: 'g', gram: 'g', grams: 'g', kg: 'kg', kilogram: 'kg', kilograms: 'kg',
    oz: 'oz', ounce: 'oz', ounces: 'oz', lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
    ml: 'ml', milliliter: 'ml', milliliters: 'ml', l: 'l', liter: 'l', liters: 'l', litre: 'l',
    tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', t: 'tsp',
    tbsp: 'tbsp', tbs: 'tbsp', tbl: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
    cup: 'cup', cups: 'cup', c: 'cup', 'fl oz': 'floz', floz: 'floz', pint: 'pt', pints: 'pt', pt: 'pt',
    quart: 'qt', quarts: 'qt', qt: 'qt', gallon: 'gal', gallons: 'gal', gal: 'gal',
    clove: 'clove', cloves: 'clove', can: 'can', cans: 'can', jar: 'jar', jars: 'jar',
    bunch: 'bunch', bunches: 'bunch', head: 'head', heads: 'head', bag: 'bag', bags: 'bag',
    package: 'pkg', packages: 'pkg', pkg: 'pkg', packet: 'pkg', packets: 'pkg', envelope: 'pkg', envelopes: 'pkg', box: 'box', boxes: 'box', bottle: 'bottle', bottles: 'bottle',
    slice: 'slice', slices: 'slice', stalk: 'stalk', stalks: 'stalk', sprig: 'sprig', sprigs: 'sprig',
    pinch: 'pinch', dash: 'dash', serving: 'serving', servings: 'serving', piece: '', pieces: '',
    each: '', ea: '', whole: '', large: '', medium: '', small: '', ct: '', count: '', dozen: 'dozen',
  };
  K.UNIT_LIST = ['', 'g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'floz', 'qt', 'gal', 'clove', 'can', 'jar', 'bunch', 'head', 'bag', 'pkg', 'serving', 'dozen'];
  K.normUnit = (u) => { const k = String(u || '').toLowerCase().replace(/\.$/, '').trim(); return k in ALIAS ? ALIAS[k] : k; };
  K.unitKind = (u) => (u in MASS ? 'mass' : u in VOL ? 'vol' : 'count');
  K.unitLabel = (u, q) => {
    if (!u) return '';
    if (u === 'floz') return 'fl oz';
    const plural = { clove: 'cloves', can: 'cans', jar: 'jars', bunch: 'bunches', head: 'heads', bag: 'bags', cup: 'cups', serving: 'servings', bottle: 'bottles', slice: 'slices', stalk: 'stalks' };
    return q != null && q > 1 && plural[u] ? plural[u] : u;
  };
  // Convert qty from unit a to unit b. density = grams per cup, used to bridge weight and volume.
  K.conv = (qty, a, b, density, each) => {
    a = K.normUnit(a); b = K.normUnit(b);
    if (a === b) return qty;
    if (a === 'dozen' && b === '') return qty * 12;
    if (a === '' && b === 'dozen') return qty / 12;
    const ka = K.unitKind(a), kb = K.unitKind(b);
    if (ka === 'mass' && kb === 'mass') return (qty * MASS[a]) / MASS[b];
    if (ka === 'vol' && kb === 'vol') return (qty * VOL[a]) / VOL[b];
    if (density && ka === 'vol' && kb === 'mass') return ((qty * VOL[a]) / VOL.cup) * density / MASS[b];
    if (density && ka === 'mass' && kb === 'vol') return ((qty * MASS[a]) / density) * VOL.cup / VOL[b];
    // each = grams in one of a counted unit, e.g. { '': 150 } for one onion or { can: 411 } for a can of broth
    if (each) {
      const toG = (u, kind) => (kind === 'mass' ? MASS[u] : kind === 'vol' ? (density ? (VOL[u] / VOL.cup) * density : null) : each[u] || null);
      const ga = toG(a, ka), gb = toG(b, kb);
      if (ga && gb) return (qty * ga) / gb;
    }
    return null;
  };
  K.fmtQty = (q) => {
    if (q == null || !isFinite(q)) return '';
    if (q === 0) return '0';
    const whole = Math.floor(q + 1e-9), frac = q - whole;
    const F = [[0, ''], [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']];
    if (q < 10) {
      let best = F[0], bd = 1;
      for (const f of F) { const d = Math.abs(frac - f[0]); if (d < bd) { bd = d; best = f; } }
      if (bd < 0.07) {
        const w = best[0] === 1 ? whole + 1 : whole;
        return (w ? String(w) : '') + best[1] || '0';
      }
      return String(K.round(q, 1));
    }
    return String(Math.round(q));
  };
  K.fmtAmount = (q, u) => [K.fmtQty(q), K.unitLabel(u, q)].filter(Boolean).join(' ');

  // ---------- ingredient names ----------
  const DESCRIPTORS = new Set(('fresh chopped diced minced sliced large small medium boneless skinless ripe finely roughly thinly ' +
    'grated shredded crushed whole raw cooked uncooked dried peeled seeded cubed halved juiced zested packed softened melted ' +
    'cold warm room temperature about optional divided plus more for serving to taste extra virgin low sodium organic of a an the ' +
    'frozen canned jarred lean ground-up beaten lightly heaping level good quality').split(' '));
  const singular = (w) => {
    if (w.length <= 3) return w;
    if (/ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (/(oes|ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2);
    if (/[^s]s$/.test(w)) return w.slice(0, -1);
    return w;
  };
  K.normName = (s) => String(s || '').toLowerCase()
    .replace(/\(.*?\)/g, ' ').split(/[,;]| or /)[0]
    .replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter((w) => w && !DESCRIPTORS.has(w)).map(singular).join(' ').trim();

  // ---------- parsing an ingredient line ----------
  const UF = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875, '⅕': 0.2, '⅙': 1 / 6 };
  const numVal = (s) => {
    s = s.trim();
    let m;
    if ((m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/))) return +m[1] + m[2] / m[3];
    if ((m = s.match(/^(\d+)\/(\d+)$/))) return m[1] / m[2];
    return parseFloat(s);
  };
  K.parseIngredient = (line) => {
    let raw = String(line).replace(/^[\s\-•*▢□◦·–]+/, '').replace(/\s+/g, ' ').trim();
    let s = raw.replace(/(\d)?\s*([½⅓⅔¼¾⅛⅜⅝⅞⅕⅙])/g, (_, d, f) => (d ? d + ' ' : '') + Math.round(UF[f] * 1000) + '/1000');
    let qty = null, unit = '', rest = s;
    const m = s.match(/^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?))?\s*(.*)$/);
    if (m) {
      qty = numVal(m[1]);
      if (m[2]) qty = (qty + numVal(m[2])) / 2;
      rest = m[3];
      rest = rest.replace(/^\(([^)]*)\)\s*/, (all, inner) => { const pm = inner.match(/^([\d.]+)\s*-?\s*(oz|ounce|ounces|g|ml|lb)\b/i); return pm ? '' : all; });
      // "1 small can evaporated milk": skip size words so the unit is "can"
      for (let tries = 0; tries < 2; tries++) {
        const um = rest.match(/^(fl\.?\s*oz|[a-zA-Z]+)\.?\b\s*/);
        if (!um) break;
        const cand = um[1].toLowerCase().replace(/\s|\./g, '') === 'floz' ? 'fl oz' : um[1];
        if (!(cand.toLowerCase() in ALIAS) || (cand === 'c' && /^c\w/.test(rest))) break;
        unit = K.normUnit(cand);
        rest = rest.slice(um[0].length);
        if (unit !== '' || !/^(large|medium|small|whole)$/i.test(cand)) break;
      }
      if (/^x\s/i.test(rest)) rest = rest.slice(2);
    }
    rest = rest.replace(/^of\s+/i, '').trim();
    return { qty, unit, name: rest, key: K.normName(rest), raw };
  };

  // ---------- parsing a whole pasted recipe ----------
  K.parseRecipeText = (text) => {
    const out = { name: '', servings: null, time: null, source: '', ingredients: [], steps: [], notes: '' };
    const url = text.match(/https?:\/\/[^\s)]+/);
    if (url) out.source = url[0];
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const isIngHead = (l) => /^(ingredients?)\b[:\s]*$/i.test(l) || /^ingredients?\s*:?$/i.test(l);
    const isStepHead = (l) => /^(instructions?|directions?|method|steps|preparation|how to make it)\b[:\s]*$/i.test(l);
    const isNoteHead = (l) => /^(notes?|tips?|recipe notes?)\b[:\s]*$/i.test(l);
    const looksIng = (l) => /^[\-•*▢□]?\s*([\d½⅓⅔¼¾⅛]|a pinch|pinch|salt|kosher salt)/i.test(l) && l.length < 110;
    let sec = null;
    const steps = [], ings = [], notes = [];
    for (const l of lines) {
      const sm = l.match(/\b(?:serves|servings|yield|makes)\b\s*:?\s*(\d+)/i);
      if (sm && l.length < 60) { out.servings = +sm[1]; continue; }
      const tm = l.match(/\b(?:total time|total|ready in|cook time|time)\b\s*:?\s*(?:(\d+)\s*(?:h|hr|hrs|hour|hours)\b)?\s*(?:(\d+)\s*(?:m|min|mins|minutes)\b)?/i);
      if (tm && (tm[1] || tm[2]) && l.length < 60) { const t = (+tm[1] || 0) * 60 + (+tm[2] || 0); if (!out.time || /total|ready/i.test(l)) out.time = t; continue; }
      if (/^(prep time|cook time|course|cuisine|keyword|author|calories|print|pin|jump to|rate this)\b/i.test(l)) continue;
      if (/^https?:\/\//.test(l)) continue;
      if (isIngHead(l)) { sec = 'ing'; continue; }
      if (isStepHead(l)) { sec = 'step'; continue; }
      if (isNoteHead(l)) { sec = 'note'; continue; }
      if (!out.name && !sec && !looksIng(l)) { out.name = l.replace(/\s+recipe$/i, ''); continue; }
      if (sec === 'ing') { if (/:$/.test(l) && l.length < 40) continue; ings.push(l); continue; }
      if (sec === 'step') { const t = l.replace(/^(step\s*)?\d+[.):]?\s+/i, ''); if (/^step\s*\d+$/i.test(l)) continue; if (t) steps.push(t); continue; }
      if (sec === 'note') { notes.push(l); continue; }
      if (looksIng(l)) ings.push(l); else if (out.name) steps.push(l.replace(/^\d+[.)]\s+/, ''));
    }
    out.ingredients = ings.map(K.parseIngredient);
    out.steps = steps;
    out.notes = notes.join('\n');
    return out;
  };

  // ---------- recipes from web pages ----------
  // Almost every recipe site includes a hidden, tidy copy of the recipe for search engines
  // (schema.org "Recipe" data). Reading that is far more reliable than reading the page itself.
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', deg: '°', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', eacute: 'é', egrave: 'è', ntilde: 'ñ' };
  K.decodeHtml = (t) => String(t == null ? '' : t)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+\d*);/gi, (m, n) => (n.toLowerCase() in ENT ? ENT[n.toLowerCase()] : m))
    .replace(/\s+/g, ' ').trim();
  const isoMinutes = (d) => {
    const m = String(d || '').match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
    if (!m) return null;
    const t = (+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0);
    return t || null;
  };
  const isType = (o, t) => o && (o['@type'] === t || (Array.isArray(o['@type']) && o['@type'].includes(t)));
  const findRecipe = (o, depth = 0) => {
    if (!o || typeof o !== 'object' || depth > 6) return null;
    if (Array.isArray(o)) { for (const x of o) { const r = findRecipe(x, depth + 1); if (r) return r; } return null; }
    if (isType(o, 'Recipe')) return o;
    for (const k of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']) { const r = findRecipe(o[k], depth + 1); if (r) return r; }
    return null;
  };
  const stepsFrom = (ins) => {
    const out = [];
    const walk = (x) => {
      if (!x) return;
      if (typeof x === 'string') { for (const part of x.split(/\r?\n|<br\s*\/?>|<\/p>/i)) { const t = K.decodeHtml(part).replace(/^(step\s*)?\d+[.):]?\s+/i, ''); if (t) out.push(t); } return; }
      if (Array.isArray(x)) { x.forEach(walk); return; }
      if (isType(x, 'HowToSection')) { walk(x.itemListElement); return; }
      if (x.text || x.name) { walk(x.text || x.name); return; }
      if (x.itemListElement) walk(x.itemListElement);
    };
    walk(ins);
    return out;
  };
  K.recipeFromLd = (o, url) => {
    if (!o) return null;
    const ings = [].concat(o.recipeIngredient || o.ingredients || []).map(K.decodeHtml).filter(Boolean);
    if (!ings.length) return null;
    const y = [].concat(o.recipeYield || [])[0];
    const yn = y != null ? parseInt(String(y).match(/\d+/) || '', 10) : NaN;
    const cuisine = [].concat(o.recipeCuisine || [])[0];
    return {
      name: K.decodeHtml(o.name || o.headline || '').replace(/\s+recipe$/i, ''),
      servings: isFinite(yn) && yn > 0 && yn < 100 ? yn : null,
      time: isoMinutes(o.totalTime) || (isoMinutes(o.prepTime) || 0) + (isoMinutes(o.cookTime) || 0) || null,
      source: url || (typeof o.url === 'string' ? o.url : '') || '',
      cuisine: cuisine ? K.decodeHtml(cuisine) : '',
      ingredients: ings.map(K.parseIngredient),
      steps: stepsFrom(o.recipeInstructions),
      notes: '',
    };
  };
  // Find the recipe in a page's HTML. Returns null if the page has no recipe data.
  K.recipeFromHtml = (html, url) => {
    const re = /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html))) {
      let data = null;
      const raw = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '');
      try { data = JSON.parse(raw); } catch (e) { try { data = JSON.parse(raw.replace(/[\u0000-\u001f]+/g, ' ')); } catch (e2) { data = null; } }
      const r = K.recipeFromLd(findRecipe(data), url);
      if (r) return r;
    }
    // Older sites mark ingredients up in the page itself (microdata)
    const ings = [...html.matchAll(/itemprop\s*=\s*["'](?:recipeIngredient|ingredients)["'][^>]*>([\s\S]*?)<\/(?:li|span|p|div)>/gi)].map((x) => K.decodeHtml(x[1])).filter(Boolean);
    if (ings.length) {
      const name = (html.match(/itemprop\s*=\s*["']name["'][^>]*>([\s\S]*?)</i) || html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
      const steps = [...html.matchAll(/itemprop\s*=\s*["']recipeInstructions["'][^>]*>([\s\S]*?)<\/(?:li|div|ol|p)>/gi)].map((x) => K.decodeHtml(x[1])).filter(Boolean);
      return { name: K.decodeHtml(name || ''), servings: null, time: null, source: url || '', cuisine: '', ingredients: ings.map(K.parseIngredient), steps, notes: '' };
    }
    return null;
  };
  // The same recipe as plain text, in the shape K.parseRecipeText reads back.
  K.recipeToText = (r) => [r.name, r.servings ? 'Serves ' + r.servings : '', r.time ? 'Total time: ' + r.time + ' minutes' : '', '', 'Ingredients', ...r.ingredients.map((g) => g.raw || g), '', 'Instructions', ...r.steps, r.source ? '\n' + r.source : ''].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');

  // ---------- receipt lines ----------
  // Works on typed lines and on text read from a photo, which has misread characters
  // ("$7.99" for "$2.99", "S" for "5", "§" for "$"), quantity lines ("2 @ $0.49") and totals.
  const SKIP = /\b(sub\s*total|subtotal|total|tax|change|visa|mastercard|debit|credit|cash|balance|savings|you saved|items sold|items in|tender|auth|approved|ref\s*#|card\s*#|payment card|purchase|transaction|customer copy|cardholder|verification|retain|records|thank you)\b/i;
  const END = /\b(sub\s*total|subtotal|total|balance\s+(?:to\s+pay|due)|amount due|tax\s*:?\s)/i;
  // price at the end of a line, allowing OCR slips inside it
  const PRICE_END = /(?:^|\s)(-?)[$§£S5]?\s?([0-9OoIl|]{1,4})\s?[.,:]\s?([0-9OoIl|]{2})\s*(?:[A-Z*]{0,2}|[|:.,'"`~]*)$/;
  const PRICE_NODOT = /(?:^|\s)[$§£]\s?(\d{3,4})\s*[|.,'"`~]*$|\s{3,}(\d{3,4})\s*[|.,'"`~]*$/;
  const digitFix = (t) => t.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1');
  K.receiptCodeKey = (code) => String(code).toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  K.parseReceiptText = (text) => {
    const lines = [];
    let tax = null, ended = false;
    const totals = [];
    for (let l of String(text).split(/\r?\n/)) {
      const wide = l.replace(/\t/g, '    ').trim();
      l = l.replace(/\s+/g, ' ').trim();
      if (!l) continue;
      let price = null, rest = l, unsure = false, m;
      if ((m = l.match(PRICE_END))) {
        price = parseFloat(digitFix(m[2]) + '.' + digitFix(m[3])) * (m[1] ? -1 : 1);
        rest = l.slice(0, m.index).trim();
        unsure = /[OoIl|]/.test(m[2] + m[3]);
      } else if ((m = wide.match(PRICE_NODOT))) {
        price = parseInt(m[1] || m[2], 10) / 100; rest = wide.slice(0, m.index).replace(/\s+/g, ' ').trim(); unsure = true;
      }
      if (END.test(l)) {
        if (price != null && /tax/i.test(l) && !/total|balance/i.test(l)) tax = price;
        else if (price != null) totals.push(price);
        ended = true;
        continue;
      }
      if (ended) { if (price != null) totals.push(price); continue; }
      if (price == null || SKIP.test(l)) continue;
      let code = rest.replace(/^[TI\[|\]]\s+/, '').replace(/^\d{6,}\s*/, '').replace(/\s+\d{6,}$/, '').replace(/[^\w\s&'().\/%-]+/g, ' ').replace(/\s+/g, ' ').trim();
      // quantity lines like "2 @ $0.49" or "6 @ 0.23 /ea" belong to the item above
      if ((code.match(/[A-Za-z]{2,}/g) || []).join('').length < 3) continue;
      lines.push({ code, codeKey: K.receiptCodeKey(code), price: Math.round(price * 100) / 100, unsure });
    }
    // The printed total is the number after the items that best matches what the items add up to.
    const expect = lines.reduce((a, x) => a + x.price, 0) + (tax || 0);
    const total = totals.length ? totals.reduce((b, x) => (Math.abs(x - expect) < Math.abs(b - expect) ? x : b)) : null;
    return { lines, total, tax };
  };
  K.parseReceiptLines = (text) => K.parseReceiptText(text).lines;

  // How alike two receipt codes are, 0 to 1 (letter pairs in common). Copes with OCR slips like "CRIMINT" for "CRIMINI".
  const pairs = (s) => { const out = []; s = s.replace(/\s+/g, ' '); for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2)); return out; };
  K.similar = (a, b) => {
    if (a === b) return 1;
    const pa = pairs(a), pb = pairs(b);
    if (!pa.length || !pb.length) return 0;
    const bag = {};
    for (const p of pb) bag[p] = (bag[p] || 0) + 1;
    let hit = 0;
    for (const p of pa) if (bag[p] > 0) { bag[p]--; hit++; }
    return (2 * hit) / (pa.length + pb.length);
  };
  // Prices that differ by one commonly misread digit (2/7, 3/8, 4/9, 5/6, 6/8, 0/8, 1/7).
  const CONFUSE = { 0: '8', 1: '7', 2: '7', 3: '8', 4: '9', 5: '69', 6: '58', 7: '21', 8: '3609', 9: '4' };
  K.priceVariants = (price) => {
    const s = price.toFixed(2), out = [];
    for (let i = 0; i < s.length; i++) for (const d of CONFUSE[s[i]] || '') out.push(parseFloat(s.slice(0, i) + d + s.slice(i + 1)));
    if (s.length > 4) out.push(parseFloat(s.slice(1))); // a stray digit in front: "$72.79"
    return out;
  };

  // Clean up a receipt photo before reading it: find the paper, crop away the table around it,
  // and turn it into crisp black text on white (local contrast, so shadows don't matter).
  // rgba: pixel data, W x H, ch channels. Returns a 1-channel image plus where it was cropped.
  K.cleanReceiptImage = (rgba, W, H, ch, opts = {}) => {
    ch = ch || 4;
    let crop = { x: 0, y: 0, w: W, h: H };
    if (opts.crop !== false) {
      const sc = Math.max(1, Math.round(Math.max(W, H) / 500));
      const w = Math.floor(W / sc), h = Math.floor(H / sc);
      const lum = new Float32Array(w * h), sat = new Float32Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let yy = 0; yy < sc; yy += 2) for (let xx = 0; xx < sc; xx += 2) { const i = ((y * sc + yy) * W + x * sc + xx) * ch; r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; n++; }
        r /= n; g /= n; b /= n;
        lum[y * w + x] = 0.299 * r + 0.587 * g + 0.114 * b;
        sat[y * w + x] = Math.max(r, g, b) - Math.min(r, g, b);
      }
      const sorted = Array.from(lum).sort((a, b) => a - b);
      const bright = sorted[Math.floor(sorted.length * 0.97)];
      const mask = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) mask[i] = lum[i] > bright * 0.62 && sat[i] < 60 ? 1 : 0;
      // fill in the text so the paper is one solid piece
      const R2 = 2, mk = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let s = 0, n = 0;
        for (let dy = -R2; dy <= R2; dy++) for (let dx = -R2; dx <= R2; dx++) { const yy = y + dy, xx = x + dx; if (yy < 0 || xx < 0 || yy >= h || xx >= w) continue; s += mask[yy * w + xx]; n++; }
        mk[y * w + x] = s >= 0.35 * n ? 1 : 0;
      }
      // biggest connected bright area = the receipt
      const lab = new Int32Array(w * h);
      let bestN = 0, box = null, cur = 0;
      for (let i = 0; i < w * h; i++) {
        if (!mk[i] || lab[i]) continue;
        cur++; let n = 0; const st = [i]; lab[i] = cur; let x0 = w, x1 = 0, y0 = h, y1 = 0;
        while (st.length) {
          const j = st.pop(); n++; const x = j % w, y = (j / w) | 0;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          if (x > 0 && mk[j - 1] && !lab[j - 1]) { lab[j - 1] = cur; st.push(j - 1); }
          if (x < w - 1 && mk[j + 1] && !lab[j + 1]) { lab[j + 1] = cur; st.push(j + 1); }
          if (y > 0 && mk[j - w] && !lab[j - w]) { lab[j - w] = cur; st.push(j - w); }
          if (y < h - 1 && mk[j + w] && !lab[j + w]) { lab[j + w] = cur; st.push(j + w); }
        }
        if (n > bestN) { bestN = n; box = [x0, y0, x1, y1]; }
      }
      if (box && bestN > w * h * 0.04) {
        const pad = 2, x0 = Math.max(0, (box[0] - pad) * sc), y0 = Math.max(0, (box[1] - pad) * sc);
        crop = { x: x0, y: y0, w: Math.min(W, (box[2] + pad + 1) * sc) - x0, h: Math.min(H, (box[3] + pad + 1) * sc) - y0 };
      }
    }
    const cw = crop.w, chh = crop.h;
    const g = new Float32Array(cw * chh);
    for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) { const i = ((crop.y + y) * W + crop.x + x) * ch; g[y * cw + x] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]; }
    const I = new Float64Array((cw + 1) * (chh + 1));
    for (let y = 0; y < chh; y++) { let row = 0; for (let x = 0; x < cw; x++) { row += g[y * cw + x]; I[(y + 1) * (cw + 1) + x + 1] = I[y * (cw + 1) + x + 1] + row; } }
    const gs = []; for (let i = 0; i < g.length; i += 7) gs.push(g[i]); gs.sort((a, b) => a - b);
    const paper = gs[Math.floor(gs.length * 0.9)];
    const R = Math.max(8, Math.round(Math.min(cw, chh) / 40));
    const out = new Uint8ClampedArray(cw * chh);
    for (let y = 0; y < chh; y++) {
      const y0 = Math.max(0, y - R), y1 = Math.min(chh, y + R + 1);
      for (let x = 0; x < cw; x++) {
        const x0 = Math.max(0, x - R), x1 = Math.min(cw, x + R + 1);
        const sum = I[y1 * (cw + 1) + x1] - I[y0 * (cw + 1) + x1] - I[y1 * (cw + 1) + x0] + I[y0 * (cw + 1) + x0];
        const mean = sum / ((x1 - x0) * (y1 - y0));
        out[y * cw + x] = mean < paper * 0.55 ? 255 : g[y * cw + x] < mean * 0.85 ? 0 : 255;
      }
    }
    return { gray: out, width: cw, height: chh, crop };
  };

  // ---------- timers in step text ----------
  K.stepTimers = (text) => {
    const out = [];
    const re = /(\d+)(?:\s*(?:-|–|to)\s*(\d+))?\s*(minutes?|mins?|hours?|hrs?)\b/gi;
    let m;
    while ((m = re.exec(text))) {
      const n = +(m[2] || m[1]);
      const sec = /^h/i.test(m[3]) ? n * 3600 : n * 60;
      out.push({ index: m.index, length: m[0].length, text: m[0], sec });
    }
    return out;
  };

  // ---------- storage: IndexedDB with localStorage fallback ----------
  const DB = 'kitchen-app', STORE = 'state', KEY = 'main';
  let dbp = null;
  const openDb = () => {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      try {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
    return dbp;
  };
  K.loadState = async () => {
    try {
      const db = await openDb();
      const v = await new Promise((res, rej) => { const t = db.transaction(STORE).objectStore(STORE).get(KEY); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error); });
      if (v) return v;
    } catch (e) { /* fall through */ }
    try { const s = localStorage.getItem(DB); if (s) return JSON.parse(s); } catch (e) { /* ignore */ }
    return null;
  };
  K.saveState = async (state) => {
    const copy = JSON.parse(JSON.stringify(state));
    try {
      const db = await openDb();
      await new Promise((res, rej) => { const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(copy, KEY); t.oncomplete = res; t.onerror = () => rej(t.error); });
      return true;
    } catch (e) {
      try { localStorage.setItem(DB, JSON.stringify(copy)); return true; } catch (e2) { return false; }
    }
  };
})();
