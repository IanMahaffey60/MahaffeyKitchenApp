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
      const um = rest.match(/^(fl\.?\s*oz|[a-zA-Z]+)\.?\b\s*/);
      if (um) {
        const cand = um[1].toLowerCase().replace(/\s|\./g, '') === 'floz' ? 'fl oz' : um[1];
        if (cand.toLowerCase() in ALIAS && !(cand === 'c' && /^c\w/.test(rest))) {
          unit = K.normUnit(cand);
          rest = rest.slice(um[0].length);
        }
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

  // ---------- receipt lines ----------
  const SKIP = /\b(sub\s*total|subtotal|total|tax|change|visa|mastercard|debit|credit|cash|balance|savings|you saved|items sold|tender|auth|approved|ref\s*#|card)\b/i;
  K.parseReceiptLines = (text) => {
    const out = [];
    for (let l of String(text).split(/\r?\n/)) {
      l = l.replace(/\s+/g, ' ').trim();
      if (!l || SKIP.test(l)) continue;
      const m = l.match(/^(.*?)\s+-?\$?\s?(\d{1,4}[.,]\d{2})\s*[A-Z]{0,2}$/);
      if (!m) continue;
      let code = m[1].replace(/^\d{6,}\s*/, '').replace(/\s+\d{6,}$/, '').trim();
      if (!code || code.length < 2) continue;
      out.push({ code, codeKey: code.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim(), price: parseFloat(m[2].replace(',', '.')) });
    }
    return out;
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
