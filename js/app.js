/* UI: rendering the five tabs, the recipe page, sheets, and all user actions. */
(function () {
  'use strict';
  const K = window.K;
  const esc = K.esc;
  let S = null;

  // ---------- icons (simple line icons) ----------
  const P = {
    tonight: '<path d="M4 11h16M5 11a7 7 0 0 0 14 0M12 4v2M8.5 5l.8 1.6M15.5 5l-.8 1.6M9 18h6"/>',
    week: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    kitchen: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M5 10h14M8.5 6.5v1.5M8.5 13v3"/>',
    recipes: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19M9 7h6M9 10.5h6"/>',
    costs: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    camera: '<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    share: '<path d="M12 3v12M8 7l4-4 4 4M5 12v8h14v-8"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    paste: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M10 2.5h4"/>',
  };
  const icon = (n, cls) => '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + P[n] + '</svg>';

  // ---------- view state (not saved) ----------
  const ui = {
    tab: 'tonight', recipeId: null, skip: new Set(), kitchenLoc: 'all',
    rq: '', rchip: 'all', canNow: false, costRange: '6m', weekStart: K.weekStart(K.today()),
    people: 3, extra: 0, cookMode: false, here: -1, got: new Set(), timers: {}, receipt: null, confirm: null,
  };

  // ---------- saving ----------
  let saveTimer = null;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => K.saveState(S), 250); };

  // ---------- toast ----------
  let toastTimer = null;
  const toast = (msg) => {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  };

  // ---------- theme ----------
  const applyTheme = () => {
    const t = S.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  };

  // ---------- routing ----------
  const TABS = [['tonight', 'Tonight'], ['week', 'This week'], ['kitchen', 'Kitchen'], ['recipes', 'Recipes'], ['costs', 'Costs']];
  const go = (hash) => { if (location.hash === '#' + hash) route(); else location.hash = hash; };
  const route = () => {
    const h = (location.hash || '').slice(1);
    const prevRecipe = ui.tab === 'recipe' ? ui.recipeId : null;
    if (h.startsWith('recipe-')) { ui.tab = 'recipe'; ui.recipeId = h.slice(7); }
    else ui.tab = TABS.some((t) => t[0] === h) ? h : 'tonight';
    if (ui.tab !== 'recipe' && ui.cookMode) setCookMode(false, true);
    if (ui.tab === 'recipe' && ui.recipeId !== prevRecipe) {
      ui.here = -1; ui.got = new Set();
      // Recipes open as written. A planned dinner can hand over a different amount (half, double).
      const r = S && S.recipes.find((x) => x.id === ui.recipeId);
      ui.people = r ? Math.max(1, Math.round(r.servings * (ui.openScale || 1))) : ui.people;
      ui.extra = 0; ui.scaleTouched = !!(ui.openScale && ui.openScale !== 1); ui.openScale = null;
    }
    render();
    const v = document.getElementById('view'); if (v) v.scrollTop = 0;
  };

  // ---------- shell ----------
  const render = () => {
    const today = K.today();
    document.getElementById('top').innerHTML =
      '<b>Kitchen</b><span class="when">' + esc(K.parseIso(today).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })) + '</span><span class="grow"></span>' +
      (ui.cookMode ? '<span class="pill-state">' + icon('sun') + ' Screen stays on</span>' : '') +
      '<button class="iconbtn" data-act="settings" aria-label="Settings">' + icon('gear') + '</button>';
    document.getElementById('tabs').innerHTML = TABS.map(([id, label]) =>
      '<button class="tab' + (ui.tab === id || (ui.tab === 'recipe' && id === 'recipes') ? ' on' : '') + '" data-act="tab" data-id="' + id + '">' + icon(id) + '<span>' + label + '</span></button>').join('');
    const v = document.getElementById('view');
    const views = { tonight: vTonight, week: vWeek, kitchen: vKitchen, recipes: vRecipes, costs: vCosts, recipe: vRecipe };
    v.innerHTML = (views[ui.tab] || vTonight)();
    if (ui.tab === 'recipe') tickTimers();
  };

  const sampleBanner = () => S.sample
    ? '<div class="sample-banner"><span><b>Sample data.</b> These are example recipes, groceries and costs so you can try everything. Your own data replaces them when you start fresh.</span><button class="btn small ghost" data-act="startFresh">Start fresh</button></div>'
    : '';
  const useBy = (iso, verb) => {
    const n = K.daysBetween(K.today(), iso);
    if (n < 0) return { t: 'Past its date', c: 'bad' };
    if (n === 0) return { t: verb + ' today', c: 'bad' };
    if (n === 1) return { t: verb + ' by tomorrow', c: 'bad' };
    if (n <= 3) return { t: verb + ' within ' + n + ' days', c: 'warn' };
    return { t: 'Good for ' + (n > 60 ? Math.round(n / 30) + ' months' : n + ' days'), c: 'ok' };
  };
  const tile = (r, badges) => '<div class="ph c-' + esc((r.cuisine || 'other').toLowerCase().replace(/[^a-z]/g, '')) + '">' +
    (badges ? '<div class="badges">' + badges + '</div>' : '') + '<span class="cu">' + esc(r.cuisine || 'Other') + '</span></div>';
  const tagHtml = (r) => K.recipeTags(r).map((t) => '<span class="tag ' + esc(t) + '">' + esc(K.cap(t)) + '</span>').join(' ');
  const costLine = (r, people) => {
    const c = K.recipeCost(r, people);
    if (c.unknown === r.ingredients.length) return '<span class="muted small">Cost unknown</span>';
    return K.money(c.perPerson) + ' <span>/ person' + (c.estShare > 0.5 ? ', estimated' : '') + '</span>';
  };

  // ---------- Tonight ----------
  function vTonight() {
    const today = K.today();
    const hh = S.settings.household;
    const planned = (S.plan[today] || {}).dinner;
    const left = K.leftoverItems();
    let html = sampleBanner() + '<div class="between"><div><h1>Tonight</h1><div class="sub">Dinner for ' + hh + ', picked from what\'s in your kitchen</div></div></div>';

    if (planned) {
      if (planned.type === 'recipe') {
        const r = S.recipes.find((x) => x.id === planned.recipeId);
        if (r) html += '<div class="section"><div class="card pad between" style="align-items:center"><div><div class="label">Planned for tonight</div><h2 style="margin-top:4px">' + esc(r.name) + '</h2><div class="meta">' + esc(r.cuisine) + ' · ' + (r.time || '?') + ' min · <span class="price">' + costLine(r, hh) + '</span></div></div><div class="row"><button class="btn" data-act="cook" data-id="' + r.id + '">Cook this</button><button class="btn ghost" data-act="pickDinner" data-date="' + today + '">Change</button></div></div></div>';
      } else {
        html += '<div class="section"><div class="card pad between" style="align-items:center"><div><div class="label">Planned for tonight</div><h2 style="margin-top:4px">' + (planned.type === 'out' ? 'Eating out' : 'Leftovers night') + '</h2></div><div class="row">' +
          (planned.type === 'out' ? '<button class="btn" data-act="logOut">Log what we spent</button>' : (left.length ? '<button class="btn" data-act="eatLeft" data-id="' + left[0].id + '">Eat the ' + esc(left[0].name.replace(/ \(leftovers\)$/, '')) + '</button>' : '')) +
          '<button class="btn ghost" data-act="pickDinner" data-date="' + today + '">Change</button></div></div></div>';
      }
    }

    if (left.length) {
      html += '<div class="section"><div class="label">Leftovers in the fridge</div><div class="soon">' + left.map((i) => {
        const d = useBy(i.expires, 'Eat');
        return '<div class="card soon-item"><b>' + esc(i.name.replace(/ \(leftovers\)$/, '')) + '</b><span class="small muted">' + K.fmtAmount(i.qty, 'serving') + '</span><span class="days ' + d.c + '">' + d.t + '</span><button class="btn small" style="margin-top:6px" data-act="eatLeft" data-id="' + i.id + '">Have tonight</button></div>';
      }).join('') + '</div></div>';
    }

    const sug = S.recipes.map((r) => K.scoreRecipe(r)).filter((x) => !ui.skip.has(x.r.id)).sort((a, b) => b.score - a.score).slice(0, 3);
    html += '<div class="section"><div class="between"><div class="label">Ideas for tonight</div>' + (ui.skip.size ? '<button class="btn small ghost" data-act="resetSkip">Show the first ideas again</button>' : '') + '</div>';
    if (!S.recipes.length) html += '<div class="empty-note">Add a few recipes and ideas will show up here. <button class="btn small" data-act="addRecipe">Add a recipe</button></div>';
    else html += '<div class="tonight-grid">' + sug.map((s) => {
      const r = s.r;
      const need = s.cov.missing.length;
      return '<div class="card meal">' + tile(r, (r.time ? '<span class="badge">' + r.time + ' min</span>' : '') + (need ? '<span class="badge">Need ' + need + '</span>' : '<span class="badge">Have all</span>')) +
        '<div class="body"><h3>' + esc(r.name) + '</h3><div class="price">' + costLine(r, hh) + '</div><div class="why">' + esc(s.why) + '</div>' +
        (need ? '<div class="meta">Missing: ' + esc(s.cov.missing.slice(0, 3).map((g) => g.key).join(', ')) + (need > 3 ? ' and ' + (need - 3) + ' more' : '') + '</div>' : '') +
        '<div class="actions"><button class="btn" data-act="cook" data-id="' + r.id + '">Cook this</button><button class="btn ghost" data-act="skip" data-id="' + r.id + '">Something else</button></div></div></div>';
    }).join('') + '</div>';
    html += '</div>';

    const soon = K.useSoonItems(3).filter((i) => !i.leftoverOf);
    html += '<div class="lower section"><div class="stack"><div class="label">Use soon</div>' +
      (soon.length ? '<div class="soon">' + soon.map((i) => { const d = useBy(i.expires, 'Use'); return '<button class="card soon-item item" data-act="item" data-id="' + i.id + '"><b>' + esc(K.cap(i.name)) + '</b><span class="small muted">' + esc(K.fmtAmount(i.qty, i.unit)) + '</span><span class="days ' + d.c + '">' + d.t + '</span></button>'; }).join('') + '</div>'
        : '<div class="empty-note">Nothing is about to go bad.</div>') + '</div>' +
      '<div class="stack"><div class="label">Not cooking?</div><div class="card pad stack"><div class="small muted">Logging these keeps the cost numbers honest.</div><div class="row"><button class="btn ghost" data-act="logOut">We ate out</button><button class="btn ghost" data-act="logLeft">Leftovers night</button></div></div></div></div>';
    return html;
  }

  // ---------- Week ----------
  function vWeek() {
    const ws = ui.weekStart, today = K.today(), hh = S.settings.household;
    const days = [...Array(7)].map((_, i) => K.addDays(ws, i));
    let weekCost = 0, outCount = 0;
    const cells = days.map((date) => {
      const p = S.plan[date] || {};
      const d = p.dinner;
      let dinner;
      if (!d) dinner = '<button class="plan empty" data-act="pickDinner" data-date="' + date + '">+ Dinner</button>';
      else if (d.type === 'out') { outCount++; dinner = '<button class="plan out" data-act="pickDinner" data-date="' + date + '">Eating out</button>'; }
      else if (d.type === 'leftovers') dinner = '<button class="plan left" data-act="pickDinner" data-date="' + date + '">Leftovers night</button>';
      else {
        const r = S.recipes.find((x) => x.id === d.recipeId);
        if (!r) dinner = '<button class="plan empty" data-act="pickDinner" data-date="' + date + '">+ Dinner</button>';
        else {
          const people = r.servings * (d.scale || 1);
          const c = K.recipeCost(r, people);
          weekCost += c.total;
          dinner = '<button class="plan' + ((r.tags || []).includes('celebration') ? ' cel' : '') + '" data-act="pickDinner" data-date="' + date + '">' + esc(r.name) +
            '<small>' + (c.unknown === r.ingredients.length ? '' : K.money(c.perPerson) + ' a person<br>') + (d.scale && d.scale !== 1 ? (d.scale === 0.5 ? 'Half' : d.scale === 2 ? 'Double' : K.round(people, 1) + ' servings') + ' batch' : 'Makes ' + r.servings) + '</small></button>';
        }
      }
      return '<div class="card day' + (date === today ? ' today' : '') + '"><div><div class="dname">' + K.DOW[K.dow(date)] + '</div><div class="dnum">' + K.parseIso(date).getDate() + '</div></div>' +
        '<div class="label">Dinner</div>' + dinner +
        '<div class="casual"><input id="b-' + date + '" data-change="casual" data-date="' + date + '" data-meal="breakfast" placeholder="Breakfast" value="' + esc(p.breakfast || '') + '" aria-label="Breakfast ' + date + '">' +
        '<input id="l-' + date + '" data-change="casual" data-date="' + date + '" data-meal="lunch" placeholder="Lunch" value="' + esc(p.lunch || '') + '" aria-label="Lunch ' + date + '"></div></div>';
    }).join('');
    const label = K.fmtDate(ws) + ' – ' + K.fmtDate(K.addDays(ws, 6));
    let html = sampleBanner() + '<div class="between"><div><h1>This week</h1><div class="sub">' + esc(label) + '</div></div><div class="row">' +
      '<button class="btn ghost small" data-act="weekNav" data-n="-7" aria-label="Previous week">' + icon('back') + '</button>' +
      '<button class="btn ghost small" data-act="weekNav" data-n="0">This week</button>' +
      '<button class="btn ghost small" data-act="weekNav" data-n="7" aria-label="Next week" style="transform:scaleX(-1)">' + icon('back') + '</button>' +
      '<button class="btn" data-act="fillWeek">Fill my week</button></div></div>';
    html += '<div class="week-wrap"><div class="stack"><div class="week">' + cells + '</div><div class="sub">Planned dinners cost <b class="num">' + K.money(weekCost) + '</b> this week' + (outCount ? ', plus ' + outCount + ' night' + (outCount > 1 ? 's' : '') + ' out' : '') + '.</div></div>' + groceryPanel() + '</div>';
    return html;
  }
  function groceryPanel() {
    const open = S.grocery.filter((g) => !g.done), done = S.grocery.filter((g) => g.done);
    const usual = K.usualsDue();
    const row = (g) => '<div class="gi' + (g.done ? ' done' : '') + '"><button class="box" data-act="gToggle" data-id="' + g.id + '" aria-label="' + (g.done ? 'Uncheck ' : 'Check ') + esc(g.name) + '"></button><span>' + esc(g.name) +
      (g.for && g.for.length ? '<div class="small muted">For ' + esc(g.for.join(', ')) + '</div>' : '') + '</span><span class="qty">' + esc(g.amount || '') + '</span><button class="x2" data-act="gDel" data-id="' + g.id + '" aria-label="Remove ' + esc(g.name) + '">×</button></div>';
    return '<div class="card glist stack" style="gap:8px">' + catalogDatalist() + '<div class="between" style="align-items:center"><h2>Grocery list</h2><span class="small muted">' + open.length + ' to get</span></div>' +
      '<div class="row"><button class="btn small" data-act="gFromPlan">Add what the plan needs</button></div>' +
      '<form class="row" data-form="gAdd" style="flex-wrap:nowrap"><input class="f" id="gAddName" placeholder="Add an item" autocomplete="off" list="catalogList"><button class="btn small ghost" type="submit">Add</button></form>' +
      (open.length ? open.map(row).join('') : '<div class="empty-note">The list is empty.</div>') +
      (usual.length ? '<div class="label" style="margin-top:8px">Usually bought by now</div><div class="chips">' + usual.map((u) => '<button class="chip" data-act="gAddKey" data-key="' + esc(u.key) + '" title="Every ' + u.avg + ' days, last ' + u.since + ' days ago">+ ' + esc(K.cap(u.key)) + '</button>').join('') + '</div>' : '') +
      (done.length ? '<div class="label" style="margin-top:8px">In the cart</div>' + done.map(row).join('') + '<button class="btn small" data-act="gPutAway">Put ' + done.length + ' checked item' + (done.length > 1 ? 's' : '') + ' in the kitchen</button>' : '') +
      '<div class="row" style="margin-top:6px"><button class="btn small ghost" data-act="gSend">' + icon('share') + ' Send to iPhone</button><button class="btn small ghost" data-act="gImport">' + icon('paste') + ' Paste from iPhone</button></div></div>';
  }

  // ---------- Kitchen ----------
  function vKitchen() {
    const locs = [['all', 'All'], ['fridge', 'Fridge'], ['freezer', 'Freezer'], ['pantry', 'Pantry']];
    let items = S.items.slice().sort((a, b) => a.expires.localeCompare(b.expires));
    if (ui.kitchenLoc !== 'all') items = items.filter((i) => i.loc === ui.kitchenLoc);
    let html = sampleBanner() + '<div class="between"><div><h1>Kitchen</h1><div class="sub">' + S.items.length + ' things, sorted by what to use first</div></div><div class="row"><button class="btn" data-act="receipt">' + icon('camera') + ' Add a receipt</button><button class="btn ghost" data-act="addItem">' + icon('plus') + ' Add item</button></div></div>';
    html += '<div class="section"><div class="seg" role="tablist">' + locs.map(([id, l]) => '<button class="' + (ui.kitchenLoc === id ? 'on' : '') + '" data-act="loc" data-id="' + id + '">' + l + ' <span class="muted small">' + (id === 'all' ? S.items.length : S.items.filter((i) => i.loc === id).length) + '</span></button>').join('') + '</div>';
    html += items.length ? '<div class="shelf">' + items.map((i) => {
      const d = useBy(i.expires, i.leftoverOf ? 'Eat' : 'Use');
      const c = K.cat(i.key);
      return '<button class="card item' + (i.leftoverOf ? ' leftover' : '') + '" data-act="item" data-id="' + i.id + '"><span class="cat">' + esc(i.leftoverOf ? 'Leftovers' : c ? c.cat : 'Other') + ' · ' + esc(i.loc) + '</span><b>' + esc(K.cap(i.name)) + '</b><span class="small muted">' + esc(K.fmtAmount(i.qty, i.unit)) + '</span><span class="days ' + d.c + '">' + d.t + '</span></button>';
    }).join('') + '</div>' : '<div class="empty-note">Nothing here yet. Add a receipt or an item.</div>';
    html += '</div>';
    return html;
  }

  // ---------- Recipes ----------
  function vRecipes() {
    const hh = S.settings.household;
    const cuisines = [...new Set(S.recipes.map((r) => r.cuisine).filter(Boolean))].sort();
    const chips = [['all', 'All'], ['fast', 'Fast'], ['cheap', 'Cheap'], ['celebration', 'Celebration']].concat(cuisines.map((c) => ['c:' + c, c]));
    const q = ui.rq.toLowerCase();
    const list = S.recipes.filter((r) => {
      if (q && !(r.name.toLowerCase().includes(q) || r.ingredients.some((g) => g.name.toLowerCase().includes(q)))) return false;
      if (ui.rchip.startsWith('c:')) return r.cuisine === ui.rchip.slice(2);
      if (ui.rchip !== 'all' && !K.recipeTags(r).includes(ui.rchip)) return false;
      return true;
    }).map((r) => ({ r, cov: K.coverage(r, hh) })).filter((x) => !ui.canNow || x.cov.missing.length === 0).sort((a, b) => a.r.name.localeCompare(b.r.name));
    let html = sampleBanner() + '<div class="between"><div><h1>Recipes</h1><div class="sub">' + S.recipes.length + ' saved</div></div><button class="btn" data-act="addRecipe">' + icon('plus') + ' Add a recipe</button></div>';
    html += '<div class="section"><input class="search" id="rsearch" data-change="rq" placeholder="Search recipes or ingredients" value="' + esc(ui.rq) + '" autocomplete="off">' +
      '<div class="between" style="align-items:center"><div class="chips">' + chips.map(([id, l]) => '<button class="chip' + (ui.rchip === id ? ' on' : '') + '" data-act="rchip" data-id="' + esc(id) + '">' + esc(l) + '</button>').join('') + '</div>' +
      '<label class="toggle"><button class="switch' + (ui.canNow ? ' on' : '') + '" data-act="canNow" role="switch" aria-checked="' + ui.canNow + '" aria-label="Can make now"></button>Can make now</label></div>';
    html += list.length ? '<div class="rgrid">' + list.map(({ r, cov }) => '<button class="card rcard" data-act="open" data-id="' + r.id + '">' + tile(r) + '<div class="body"><h4>' + esc(r.name) + '</h4><div class="small muted">' + (r.time ? r.time + ' min · ' : '') + 'serves ' + r.servings + '</div><div>' + tagHtml(r) + '</div><div class="rfoot"><span class="pp">' + costLine(r, hh) + '</span>' + (cov.missing.length ? '<span class="small muted">Need ' + cov.missing.length + '</span>' : '<span class="have">Have all</span>') + '</div></div></button>').join('') + '</div>'
      : '<div class="empty-note">' + (S.recipes.length ? 'No recipes match.' : 'No recipes yet. Paste one from a website or cookbook to get started.') + '</div>';
    return html + '</div>';
  }

  // ---------- Recipe page (whole recipe on one page) ----------
  function stepHtml(text, si) {
    const timers = K.stepTimers(text);
    let out = '', pos = 0;
    timers.forEach((t, ti) => {
      out += esc(text.slice(pos, t.index));
      const id = si + '-' + ti;
      out += '<button class="timer" data-act="timer" data-tid="' + id + '" data-sec="' + t.sec + '" id="t-' + id + '">' + icon('timer') + '<span>' + esc(t.text) + '</span></button>';
      pos = t.index + t.length;
    });
    return out + esc(text.slice(pos));
  }
  function vRecipe() {
    const r = S.recipes.find((x) => x.id === ui.recipeId);
    if (!r) return '<div class="empty-note">This recipe was deleted. <button class="btn small" data-act="tab" data-id="recipes">Back to recipes</button></div>';
    const made = ui.people + ui.extra, scale = made / r.servings;
    const c = K.recipeCost(r, made);
    const ly = K.learnedYield(r);
    const since = K.daysSinceCooked(r);
    let html = '<button class="btn ghost small" data-act="tab" data-id="recipes">' + icon('back') + ' Recipes</button>';
    html += '<div class="rp-head" style="margin-top:10px"><div style="min-width:0"><h1>' + esc(r.name) + '</h1><div class="sub">' + esc(r.cuisine || 'Other') + (r.time ? ' · ' + r.time + ' min' : '') + ' · recipe serves ' + r.servings +
      (ly && Math.abs(ly - r.servings) >= 0.5 ? ' · <b>makes about ' + ly + ' for you</b>' : '') + (since != null ? ' · last made ' + (since === 0 ? 'today' : since + ' days ago') : '') + '</div>' +
      '<div class="row" style="margin-top:6px">' + tagHtml(r) + (r.source ? ' <a class="small" href="' + esc(r.source) + '" target="_blank" rel="noopener">View original</a>' : '') + '</div></div>' +
      '<div class="cookbar' + (ui.cookMode ? ' on' : '') + '"><button class="switch' + (ui.cookMode ? ' on' : '') + '" data-act="cookMode" role="switch" aria-checked="' + ui.cookMode + '" aria-label="Cook mode"></button><div><b>Cook mode</b><div class="small">' + (ui.cookMode ? 'The screen stays on' : 'Keep the screen on while you cook') + '</div></div></div></div>';
    const asWritten = made === r.servings;
    html += '<div class="section"><div class="row" style="gap:18px"><div class="row"><span class="label">Making</span><span class="stepper"><button data-act="people" data-n="-1" aria-label="Fewer servings">−</button><b class="num">' + made + '</b><button data-act="people" data-n="1" aria-label="More servings">+</button></span><span class="small muted">servings</span></div>' +
      '<div class="chips">' + [[1, 'As written'], [0.5, 'Half'], [2, 'Double']].map(([f, l]) => '<button class="chip' + (made === Math.max(1, Math.round(r.servings * f)) ? ' on' : '') + '" data-act="makeScale" data-n="' + f + '">' + l + '</button>').join('') + '</div>' +
      (asWritten ? '' : '<span class="small muted">Amounts below are scaled from the recipe\'s ' + r.servings + ' servings</span>') +
      '<div class="price num">' + (c.unknown === r.ingredients.length ? '<span>Add a receipt to see costs</span>' : K.money(c.total) + ' total · ' + K.money(c.total / made) + ' <span>per serving' + (c.estShare > 0.5 ? ', estimated' : '') + '</span>') + '</div></div></div>';
    html += '<div class="rp-grid"><div class="card pad"><div class="between" style="align-items:center"><h2>Ingredients</h2><span class="small muted">for ' + made + '</span></div><div class="ingl">' + r.ingredients.map((g, i) => {
      const have = K.haveAmount(g, scale);
      let q = g.qty != null ? g.qty * scale : null;
      if (q != null && ['clove', 'slice', ''].includes(g.unit) && q >= 1.5 && /clove|tortilla|egg|slice/.test(g.key + ' ' + g.unit)) q = Math.round(q);
      const amt = q != null ? K.fmtAmount(q, g.unit) : '';
      return '<label class="' + (ui.got.has(i) ? 'got' : '') + '"><input type="checkbox" id="ing-' + i + '" data-act="got" data-i="' + i + '"' + (ui.got.has(i) ? ' checked' : '') + '><span><b>' + esc(amt) + '</b> ' + esc(g.name) + '</span><span class="stock ' + (have >= 0.6 ? 'y' : 'n') + '">' + (have >= 0.6 ? 'Have' : 'Need') + '</span></label>';
    }).join('') + '</div></div>';
    html += '<div class="card pad"><h2 style="margin-bottom:8px">Steps</h2><ol class="steps">' + r.steps.map((s, i) => '<li class="' + (i === ui.here ? 'here' : i < ui.here ? 'past' : '') + '" data-act="here" data-i="' + i + '"><span>' + stepHtml(s, i) + '</span></li>').join('') + '</ol>' +
      (r.notes ? '<div class="label" style="margin-top:14px">Notes</div><p style="white-space:pre-wrap">' + esc(r.notes) + '</p>' : '') + '</div></div>';
    html += '<div class="section row"><button class="btn" data-act="finish">' + icon('check') + ' We made this</button><button class="btn ghost" data-act="planIt">Plan it</button><button class="btn ghost" data-act="editRecipe">Edit</button>' +
      '<button class="btn danger" data-act="delRecipe">' + (ui.confirm === 'del-' + r.id ? 'Tap again to delete' : 'Delete') + '</button></div>';
    return html;
  }

  // ---------- Costs ----------
  const RANGES = { '3m': 91, '6m': 182, '1y': 365 };
  function lineChart(points) {
    const W = 640, H = 230, L = 44, R = 12, T = 14, B = 30;
    if (points.length < 2) return '<div class="empty-note">Cook a few dinners to see this chart.</div>';
    const vals = points.map((p) => p.v);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const span = hi - lo || 1;
    const stepRaw = span / 4, mag = 10 ** Math.floor(Math.log10(stepRaw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= stepRaw);
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
    if (hi === lo) hi = lo + step;
    const x = (i) => L + (i * (W - L - R)) / (points.length - 1);
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    let g = '';
    for (let v = lo; v <= hi + 1e-9; v += step) g += '<line class="gridl" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">$' + v.toFixed(step < 1 ? 2 : 0) + '</text>';
    const every = Math.ceil(points.length / 7);
    points.forEach((p, i) => { if (i % every === 0 || i === points.length - 1) g += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(p.label) + '</text>'; });
    const d = points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
    const area = d + ' L' + x(points.length - 1) + ' ' + (H - B) + ' L' + x(0) + ' ' + (H - B) + ' Z';
    // least squares trend
    const n = points.length, mx = (n - 1) / 2, my = K.sum(vals) / n;
    const slope = K.sum(vals.map((v, i) => (i - mx) * (v - my))) / K.sum(vals.map((_, i) => (i - mx) ** 2));
    const t0 = my - slope * mx, t1 = my + slope * (n - 1 - mx);
    const last = points[n - 1];
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Dinner cost per person by week">' + g +
      '<path class="area" d="' + area + '"/><path class="ln" d="' + d + '"/><path class="trend" d="M' + x(0) + ' ' + y(t0) + ' L' + x(n - 1) + ' ' + y(t1) + '"/>' +
      '<circle class="dot" cx="' + x(n - 1) + '" cy="' + y(last.v) + '" r="4.5"/><text x="' + (x(n - 1) - 8) + '" y="' + (y(last.v) - 10) + '" text-anchor="end" style="fill:var(--ink);font-weight:700;font-size:12px">' + K.money(last.v) + '</text></svg>';
  }
  const bars = (rows, fmt) => {
    if (!rows.length) return '<div class="empty-note">No receipts in this period.</div>';
    const max = Math.max(...rows.map((r) => r[1])) || 1;
    return '<div class="bars">' + rows.map(([k, v, other]) => '<div class="bar"><span>' + esc(k) + '</span><div class="track"><div class="fill' + (other ? ' other' : '') + '" style="width:' + ((v / max) * 100).toFixed(1) + '%"></div></div><span class="v">' + (fmt || K.money)(v, 0) + '</span></div>').join('') + '</div>';
  };
  function costStats(days) {
    const today = K.today(), from = K.addDays(today, -days), prevFrom = K.addDays(from, -days);
    const inR = (e, a, b) => e.date >= a && e.date < b;
    const cooked = S.log.filter((e) => e.type === 'cooked' && inR(e, from, today));
    const cpp = (e) => { const c = K.logCost(e); return c == null ? null : c / Math.max(1, (e.servings || 3) + (e.leftovers || 0)); };
    const avg = (arr) => { const v = arr.map(cpp).filter((x) => x != null); return v.length ? K.sum(v) / v.length : null; };
    const prevCooked = S.log.filter((e) => e.type === 'cooked' && inR(e, prevFrom, from));
    const weeks = {};
    for (const e of cooked) { const w = K.weekStart(e.date); const v = cpp(e); if (v != null) (weeks[w] = weeks[w] || []).push(v); }
    const series = Object.keys(weeks).sort().map((w) => ({ label: K.fmtDate(w), v: K.sum(weeks[w]) / weeks[w].length }));
    const recs = K.receiptsBetween(from, today);
    const groceries = K.sum(recs, K.groceryForUs), other = K.sum(recs, K.groceryOther);
    const byStore = {}, byCat = {};
    for (const rc of recs) { byStore[rc.store] = (byStore[rc.store] || 0) + K.groceryForUs(rc); }
    for (const rc of recs) for (const l of rc.lines) if (l.forUs && !rc.event) { const c = l.cat || (K.cat(l.key) || {}).cat || 'Other'; byCat[c] = (byCat[c] || 0) + l.price; }
    if (other) byCat['Not for meals'] = other;
    const outs = S.log.filter((e) => e.type === 'out' && inR(e, from, today));
    const out30 = S.log.filter((e) => e.type === 'out' && e.date >= K.addDays(today, -30));
    const waste = S.waste.filter((w) => inR(w, from, today));
    return { from, cooked, avgCpp: avg(cooked), prevCpp: avg(prevCooked), series, groceries, other, byStore, byCat, outs, out30, waste, recs };
  }
  function savingsTips(st) {
    const tips = [];
    const today = K.today();
    // eating out trend
    const recent = S.log.filter((e) => e.type === 'out' && e.date >= K.addDays(today, -28));
    const before = S.log.filter((e) => e.type === 'out' && e.date < K.addDays(today, -28) && e.date >= K.addDays(today, -112));
    const perWeek = recent.length / 4, perWeekBefore = before.length / 12;
    if (perWeek >= 2) {
      const outAvg = K.sum(recent, (e) => e.amount || 0) / (recent.filter((e) => e.amount).length || 1);
      const homeAvg = st.avgCpp != null ? st.avgCpp * S.settings.household : 10;
      const save = Math.max(0, (outAvg - homeAvg) * 2 * 4.3);
      tips.push({ amt: save, title: 'Eating out ' + K.round(perWeek, 1) + ' times a week', body: 'That\'s up from about ' + K.round(perWeekBefore, 1) + ' a week before. Swapping two of those for a leftovers night or a quick meal would save about ' + K.money(save, 0) + ' a month.', act: 'tab', id: 'week', btn: 'Plan a leftovers night' });
    }
    // store comparison on regular items
    const byKey = {};
    for (const p of S.prices.filter((p) => p.date >= K.addDays(today, -182))) {
      const unitPrice = p.price / (p.qty || 1);
      ((byKey[p.key] = byKey[p.key] || {})[p.store] = byKey[p.key][p.store] || []).push(unitPrice);
    }
    const ratios = {};
    for (const stores of Object.values(byKey)) {
      const names = Object.keys(stores);
      if (names.length < 2) continue;
      const avgs = Object.fromEntries(names.map((s) => [s, K.sum(stores[s]) / stores[s].length]));
      const mean = K.sum(Object.values(avgs)) / names.length;
      for (const s of names) (ratios[s] = ratios[s] || []).push(avgs[s] / mean);
    }
    const storeIdx = Object.entries(ratios).filter(([, v]) => v.length >= 5).map(([s, v]) => [s, K.sum(v) / v.length, v.length]).sort((a, b) => a[1] - b[1]);
    const mainStore = Object.entries(st.byStore).sort((a, b) => b[1] - a[1])[0];
    if (storeIdx.length >= 2 && mainStore) {
      const cheapest = storeIdx[0], main = storeIdx.find((s) => s[0] === mainStore[0]);
      if (main && cheapest[0] !== main[0]) {
        const pct = 1 - cheapest[1] / main[1];
        const months = Object.keys(RANGES).length && (K.daysBetween(st.from, today) / 30.4);
        const save = (mainStore[1] / months) * pct;
        if (pct > 0.05) tips.push({ amt: save, title: cheapest[0] + ' is ' + Math.round(pct * 100) + '% cheaper', body: 'Across ' + cheapest[2] + ' items you buy often, ' + cheapest[0] + ' beat ' + main[0] + ', where you spend the most. Moving the big weekly shop there would save about ' + K.money(save, 0) + ' a month.', act: 'scrollPrices', btn: 'See price watch' });
      }
    }
    // repeated waste
    const wasteBy = {};
    for (const w of S.waste.filter((w) => w.date >= K.addDays(today, -182))) { const e = (wasteBy[w.key] = wasteBy[w.key] || { n: 0, cost: 0 }); e.n++; e.cost += w.cost || 0; }
    const worst = Object.entries(wasteBy).filter(([, e]) => e.n >= 3).sort((a, b) => b[1].cost - a[1].cost)[0];
    if (worst) {
      const bought = S.receipts.filter((r) => r.date >= K.addDays(today, -182)).filter((r) => r.lines.some((l) => l.key === worst[0])).length;
      tips.push({ amt: worst[1].cost / 6, title: K.cap(worst[0]) + ' keeps getting tossed', body: 'Thrown out ' + worst[1].n + ' times' + (bought ? ' out of ' + bought + ' buys' : '') + ' in the last 6 months. Buy a smaller amount, or plan it in the first two days after shopping.', act: 'tab', id: 'kitchen', btn: 'Check the kitchen' });
    }
    // cheaper dinners
    const hh = S.settings.household;
    const costed = S.recipes.map((r) => ({ r, c: K.recipeCost(r, hh) })).filter((x) => x.c.unknown < x.r.ingredients.length).sort((a, b) => a.c.perPerson - b.c.perPerson);
    if (costed.length >= 4 && st.avgCpp != null) {
      const cheap = costed.slice(0, 3), cheapAvg = K.sum(cheap, (x) => x.c.perPerson) / 3;
      const save = Math.max(0, (st.avgCpp - cheapAvg) * hh * 4.3);
      if (save > 3) tips.push({ amt: save, title: 'One more cheap dinner a week', body: cheap.map((x) => x.r.name).join(', ') + ' average ' + K.money(cheapAvg) + ' a person, against ' + K.money(st.avgCpp) + ' for your usual dinner. One more of these each week saves about ' + K.money(save, 0) + ' a month.', act: 'rchipGo', id: 'cheap', btn: 'Show cheap recipes' });
    }
    return tips.sort((a, b) => b.amt - a.amt);
  }
  function vCosts() {
    const days = RANGES[ui.costRange];
    const st = costStats(days);
    const hh = S.settings.household;
    const delta = st.avgCpp != null && st.prevCpp != null ? st.avgCpp - st.prevCpp : null;
    const firstRc = S.receipts.reduce((m, r) => (!m || r.date < m ? r.date : m), null);
    const trackedDays = Math.max(7, Math.min(days, firstRc ? K.daysBetween(firstRc, K.today()) + 1 : days));
    let html = sampleBanner() + '<div class="between"><div><h1>Costs</h1><div class="sub">Groceries and dinners since ' + esc(K.fmtDate(st.from, { month: 'long', day: 'numeric', year: 'numeric' })) + '</div></div><div class="seg">' +
      Object.keys(RANGES).map((k) => '<button class="' + (ui.costRange === k ? 'on' : '') + '" data-act="range" data-id="' + k + '">' + { '3m': '3 months', '6m': '6 months', '1y': '1 year' }[k] + '</button>').join('') + '</div></div>';
    const tips = savingsTips(st);
    if (tips.length) html += '<div class="section"><div class="label">Ways to save</div><div class="saves">' + tips.map((t) => '<div class="card save"><span class="amt">Save about ' + K.money(t.amt, 0) + ' a month</span><h3>' + esc(t.title) + '</h3><div class="small" style="color:var(--ink2)">' + esc(t.body) + '</div><div><button class="btn small ghost" data-act="' + t.act + '" data-id="' + esc(t.id || '') + '">' + esc(t.btn) + '</button></div></div>').join('') + '</div></div>';
    const outAmt = K.sum(st.out30, (e) => e.amount || 0);
    html += '<div class="section kpis">' +
      '<div class="card kpi"><div class="lab">Dinner per person</div><div class="val">' + K.money(st.avgCpp) + '</div><div class="delta">' + (delta == null ? 'average home-cooked dinner' : (delta <= 0 ? 'down ' : 'up ') + K.money(Math.abs(delta)) + ' on the period before') + '</div></div>' +
      '<div class="card kpi"><div class="lab">Groceries for meals</div><div class="val">' + K.money(st.groceries, 0) + '</div><div class="delta">' + K.money(st.groceries / (trackedDays / 7), 0) + ' a week' + (st.other ? ', plus ' + K.money(st.other, 0) + ' not for meals' : '') + '</div></div>' +
      '<div class="card kpi"><div class="lab">Eating out, last 30 days</div><div class="val">' + st.out30.length + '×</div><div class="delta">' + (outAmt ? K.money(outAmt, 0) + ' logged' : 'no amounts logged') + '</div></div>' +
      '<div class="card kpi"><div class="lab">Food thrown out</div><div class="val">' + K.money(K.sum(st.waste, (w) => w.cost), 0) + '</div><div class="delta">' + st.waste.length + ' items in this period</div></div></div>';
    html += '<div class="section cgrid"><div class="card chartcard"><h3>Dinner cost per person, by week</h3><div class="note">Home-cooked dinners. Dashed line shows the trend.</div>' + lineChart(st.series) + '</div>' +
      '<div class="card chartcard"><h3>Spending by store</h3><div class="note">Groceries for meals</div>' + bars(Object.entries(st.byStore).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])) +
      '<h3 style="margin-top:18px">By category</h3><div class="note">Events and non-food are kept separate</div>' + bars(Object.entries(st.byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v, k === 'Not for meals'])) + '</div></div>';
    const costed = S.recipes.map((r) => ({ r, c: K.recipeCost(r, hh) })).filter((x) => x.c.unknown < x.r.ingredients.length).sort((a, b) => a.c.perPerson - b.c.perPerson);
    const trow = (x) => '<tr><td><a href="#recipe-' + x.r.id + '">' + esc(x.r.name) + '</a></td><td class="r">' + K.money(x.c.perPerson) + '</td></tr>';
    html += '<div class="section cgrid"><div class="card chartcard" id="prices"><h3>Price watch</h3><div class="note">Latest price per pack at each store. Lowest is marked.</div>' + priceWatch() + '</div>' +
      '<div class="card chartcard"><h3>Cheapest and priciest dinners</h3><div class="note">Per person, at today\'s prices</div>' +
      (costed.length ? '<table class="t"><tbody>' + costed.slice(0, 3).map(trow).join('') + '<tr><td colspan="2" class="label" style="padding-top:14px">Priciest</td></tr>' + costed.slice(-3).reverse().map(trow).join('') + '</tbody></table>' : '<div class="empty-note">Add recipes to compare them.</div>') + '</div></div>';
    return html;
  }
  function priceWatch() {
    const count = {};
    for (const p of S.prices) count[p.key] = (count[p.key] || 0) + 1;
    const keys = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 7).map((x) => x[0]);
    const stores = [...new Set(S.prices.map((p) => p.store))].sort();
    if (!keys.length) return '<div class="empty-note">Prices show up after your first receipts.</div>';
    return '<div style="overflow-x:auto"><table class="t"><thead><tr><th>Item</th>' + stores.map((s) => '<th class="r">' + esc(s) + '</th>').join('') + '</tr></thead><tbody>' + keys.map((k) => {
      const vals = stores.map((s) => K.priceFor(k, s));
      const min = Math.min(...vals.filter(Boolean).map((v) => v.price));
      return '<tr><td>' + esc(K.cap(k)) + '</td>' + vals.map((v) => '<td class="r' + (v && v.price === min ? '" style="color:var(--accent);font-weight:800' : '') + '">' + (v ? K.money(v.price) : '–') + '</td>').join('') + '</tr>';
    }).join('') + '</tbody></table></div>';
  }

  // ---------- sheets ----------
  let sheetOnClose = null;
  const openSheet = (html, opts = {}) => {
    closeSheet();
    const s = document.createElement('div');
    s.className = 'scrim'; s.id = 'scrim';
    s.innerHTML = '<div class="sheet' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(s);
    sheetOnClose = opts.onClose || null;
    const f = s.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 30);
  };
  const closeSheet = () => { const s = document.getElementById('scrim'); if (s) s.remove(); if (sheetOnClose) { const f = sheetOnClose; sheetOnClose = null; f(); } };
  const sheetHead = (title, sub) => '<div class="sheet-head"><div><h2>' + esc(title) + '</h2>' + (sub ? '<div class="small muted">' + esc(sub) + '</div>' : '') + '</div><button class="x" data-act="close" aria-label="Close">✕</button></div>';
  const catalogDatalist = () => '<datalist id="catalogList">' + Object.keys(S.catalog).sort().map((k) => '<option value="' + esc(k) + '">').join('') + '</datalist>';

  function sheetPickDinner(date) {
    const hh = S.settings.household;
    const p = S.plan[date] || {};
    const cur = p.dinner || {};
    const ranked = S.recipes.map((r) => K.scoreRecipe(r, { date })).sort((a, b) => b.score - a.score);
    ui.pick = { date, scale: cur.scale || 1 };
    const html = sheetHead('Dinner on ' + K.fmtDate(date, { weekday: 'long', month: 'short', day: 'numeric' })) +
      '<div class="row"><button class="btn ghost" data-act="setDinner" data-type="leftovers">Leftovers night</button><button class="btn ghost" data-act="setDinner" data-type="out">Eating out</button>' + (p.dinner ? '<button class="btn danger" data-act="setDinner" data-type="clear">Clear</button>' : '') + '</div>' +
      '<div class="row"><span class="label">Make</span><div class="sv-row" id="pickServ">' + [[1, 'As written'], [0.5, 'Half'], [2, 'Double']].map(([n, l]) => '<button class="' + (ui.pick.scale === n ? 'on' : '') + '" data-act="pickScale" data-n="' + n + '">' + l + '</button>').join('') + '</div></div>' +
      '<input class="search" id="pickSearch" placeholder="Search recipes" data-change="pickSearch" autocomplete="off">' +
      '<div class="optlist" id="pickList">' + ranked.map((s) => '<button class="opt" data-act="setDinner" data-type="recipe" data-id="' + s.r.id + '" data-name="' + esc(s.r.name.toLowerCase()) + '"><span><b>' + esc(s.r.name) + '</b><br><small>' + esc(s.why) + '</small></span><small class="num">' + costLine(s.r, hh) + '</small></button>').join('') + '</div>';
    openSheet(html);
  }

  function sheetItem(id) {
    const it = S.items.find((i) => i.id === id);
    if (!it) return;
    openSheet(sheetHead(K.cap(it.name), it.leftoverOf ? 'Leftovers' : (K.cat(it.key) || {}).cat) + itemForm(it) +
      '<div class="row"><button class="btn" data-act="itemSave" data-id="' + it.id + '">Save</button><button class="btn ghost" data-act="itemUsed" data-id="' + it.id + '">Used it up</button><button class="btn danger" data-act="itemToss" data-id="' + it.id + '">Threw it out</button></div>');
  }
  const itemForm = (it) => catalogDatalist() + '<div class="form-grid">' +
    '<label class="field" style="grid-column:1/-1"><span>Name</span><input class="f" id="itName" list="catalogList" value="' + esc(it.name) + '" data-change="itName" autocomplete="off"></label>' +
    '<label class="field"><span>Amount</span><input class="f" id="itQty" type="number" inputmode="decimal" step="any" min="0" value="' + esc(it.qty) + '"></label>' +
    '<label class="field"><span>Unit</span><select class="f" id="itUnit">' + K.UNIT_LIST.map((u) => '<option value="' + u + '"' + (u === it.unit ? ' selected' : '') + '>' + (u ? K.unitLabel(u) : 'count') + '</option>').join('') + '</select></label>' +
    '<label class="field"><span>Where</span><select class="f" id="itLoc">' + ['fridge', 'freezer', 'pantry'].map((l) => '<option' + (l === it.loc ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
    '<label class="field"><span>Use by</span><input class="f" id="itExp" type="date" value="' + esc(it.expires) + '"></label></div>';

  function sheetAddItem() {
    const it = { name: '', qty: 1, unit: '', loc: 'fridge', expires: K.addDays(K.today(), 7) };
    openSheet(sheetHead('Add to the kitchen', 'Pick a known item to fill in the usual amount and how long it keeps') + itemForm(it) + '<div class="row"><button class="btn" data-act="itemCreate">Add</button></div>');
  }

  function sheetRecipeEditor(r) {
    const isNew = !r;
    r = r || { name: '', cuisine: 'Other', servings: S.settings.household, time: 30, tags: [], source: '', notes: '', ingredients: [], steps: [] };
    const ingText = r.ingredients.map((g) => g.raw || [K.fmtQty(g.qty), K.unitLabel(g.unit, g.qty), g.name].filter(Boolean).join(' ')).join('\n');
    const html = sheetHead(isNew ? 'Add a recipe' : 'Edit recipe', isNew ? 'Paste a link to a recipe page, or paste or type the recipe' : '') +
      (isNew ? '<div class="importbox"><label class="field"><span>Recipe link</span><input class="f" id="rUrl" type="url" inputmode="url" autocomplete="off" placeholder="Paste the link to a recipe page"></label><button class="btn" data-act="fetchRecipe">Get the recipe</button></div><div class="small muted" id="fetchNote" aria-live="polite"></div>' +
        '<label class="field"><span>Or paste the recipe text</span><textarea class="f" id="pasteAll" placeholder="On the recipe page, select from the title down to the last step (or use the Copy for Kitchen bookmark), copy, and paste here. Ads and life stories get left behind."></textarea></label><div class="row"><button class="btn ghost" data-act="parseRecipe">Read it</button><span class="small muted" id="parseNote"></span></div>' +
        bookmarkHelp() : '') +
      '<div class="form-grid"><label class="field" style="grid-column:1/-1"><span>Name</span><input class="f" id="rName" value="' + esc(r.name) + '"></label>' +
      '<label class="field"><span>Cuisine</span><select class="f" id="rCuisine">' + K.CUISINES.map((c) => '<option' + (c === r.cuisine ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Serves</span><input class="f" id="rServ" type="number" min="1" inputmode="numeric" value="' + esc(r.servings) + '"></label>' +
      '<label class="field"><span>Minutes</span><input class="f" id="rTime" type="number" min="0" inputmode="numeric" value="' + esc(r.time || '') + '"></label>' +
      '<label class="field" style="justify-content:flex-end"><span class="toggle"><input type="checkbox" id="rCel"' + ((r.tags || []).includes('celebration') ? ' checked' : '') + '> Celebration meal</span></label>' +
      '<label class="field" style="grid-column:1/-1"><span>Link to the original (optional)</span><input class="f" id="rSource" type="url" placeholder="https://" value="' + esc(r.source) + '"></label></div>' +
      '<div class="parsed"><label class="field"><span>Ingredients, one per line</span><textarea class="f" id="rIng" style="min-height:200px" placeholder="1.5 lb chicken thighs&#10;2 cloves garlic">' + esc(ingText) + '</textarea></label>' +
      '<label class="field"><span>Steps, one per line</span><textarea class="f" id="rSteps" style="min-height:200px" placeholder="Simmer for 20 minutes...">' + esc(r.steps.join('\n')) + '</textarea></label></div>' +
      '<label class="field"><span>Notes</span><textarea class="f" id="rNotes" style="min-height:70px">' + esc(r.notes || '') + '</textarea></label>' +
      '<div class="row"><button class="btn" data-act="saveRecipe" data-id="' + (isNew ? '' : r.id) + '">Save recipe</button><button class="btn ghost" data-act="close">Cancel</button></div>';
    openSheet(html, { wide: true });
  }

  // ---------- recipe from a link ----------
  // A web page can't read other websites directly (browsers block it), so the app tries the site
  // itself first, then free public "reader" services that fetch the page and pass it back.
  // Only the recipe link is sent to them. Settings can turn this off.
  const READERS = [
    { name: 'the site', url: (u) => u, kind: 'html' },
    { name: 'AllOrigins', url: (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u), kind: 'html', reader: true },
    { name: 'CodeTabs', url: (u) => 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u), kind: 'html', reader: true },
    { name: 'Jina Reader', url: (u) => 'https://r.jina.ai/' + u, kind: 'html', headers: { 'X-Return-Format': 'html' }, reader: true },
    { name: 'Jina Reader', url: (u) => 'https://r.jina.ai/' + u, kind: 'text', reader: true },
  ];
  const fetchText = async (url, headers, ms) => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), ms);
    try {
      const res = await fetch(url, { headers: headers || {}, signal: ac.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!res.ok) throw new Error('http ' + res.status);
      return await res.text();
    } finally { clearTimeout(t); }
  };
  const mdToText = (md) => md.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^\s*(?:[*+-]|#+)\s+/gm, '').replace(/[*_`]+/g, '');
  async function recipeFromLink(url, onTry) {
    const useReaders = S.settings.linkReader !== false;
    for (const r of READERS) {
      if (r.reader && !useReaders) continue;
      onTry(r.name);
      try {
        const body = await fetchText(r.url(url), r.headers, r.reader ? 20000 : 8000);
        let p = null;
        if (r.kind === 'html') p = K.recipeFromHtml(body, url);
        else { const t = K.parseRecipeText(mdToText(body)); if (t.ingredients.length >= 2) p = { ...t, source: url }; }
        if (p && p.ingredients.length) return { p, via: r.name };
      } catch (e) { /* try the next way */ }
    }
    return null;
  }
  function fillRecipeForm(p, extraText) {
    const set = (id, v) => { const el = document.getElementById(id); if (el && v != null && v !== '') el.value = v; };
    set('rName', p.name); set('rServ', p.servings); set('rTime', p.time); set('rSource', p.source);
    set('rIng', p.ingredients.map((g) => g.raw).join('\n')); set('rSteps', p.steps.join('\n')); set('rNotes', p.notes);
    const cu = K.CUISINES.find((c) => new RegExp('\\b' + c + '\\b', 'i').test((p.cuisine || '') + ' ' + p.name + ' ' + (extraText || '').slice(0, 400)));
    if (cu) document.getElementById('rCuisine').value = cu;
  }
  async function fetchRecipe() {
    const inp = document.getElementById('rUrl'), note = document.getElementById('fetchNote');
    let url = (inp.value || '').trim();
    const m = url.match(/https?:\/\/\S+/);
    if (!m) { note.textContent = 'Paste a link that starts with https://'; return; }
    url = m[0];
    const btn = document.querySelector('[data-act="fetchRecipe"]');
    btn.disabled = true;
    note.textContent = 'Getting the recipe…';
    const got = await recipeFromLink(url, (name) => { note.textContent = 'Getting the recipe' + (name === 'the site' ? '…' : ' (trying ' + name + ')…'); });
    btn.disabled = false;
    if (got) {
      fillRecipeForm(got.p);
      note.innerHTML = '<span class="have">Got it.</span> Found ' + got.p.ingredients.length + ' ingredients and ' + got.p.steps.length + ' steps. Check them below, then save.';
    } else {
      note.innerHTML = '<span class="warn">That site wouldn\'t share the recipe' + (S.settings.linkReader === false ? ' (public readers are off in Settings)' : '') + '.</span> Use the Copy for Kitchen bookmark below on the recipe page, or select the recipe text there, copy it, and paste it in the box below.';
      const d = document.getElementById('bmHelp'); if (d) d.open = true;
    }
  }

  // "Copy for Kitchen" bookmark: runs on the recipe page in Safari, so it works on every site.
  // It copies the recipe as plain text for the paste box. It is written for old browsers on purpose.
  function copyForKitchen() {
    function find(o, d) {
      if (!o || typeof o != 'object' || d > 6) return null;
      if (Array.isArray(o)) { for (var i = 0; i < o.length; i++) { var a = find(o[i], d + 1); if (a) return a; } return null; }
      var t = o['@type']; if (t == 'Recipe' || (Array.isArray(t) && t.indexOf('Recipe') >= 0)) return o;
      var ks = ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item'];
      for (var j = 0; j < ks.length; j++) { var b = find(o[ks[j]], d + 1); if (b) return b; }
      return null;
    }
    var ENT = { amp: '&', quot: '"', apos: "'", nbsp: ' ', lt: '<', gt: '>', frac12: '\u00bd', frac14: '\u00bc', frac34: '\u00be', frac13: '\u2153', frac23: '\u2154', deg: '\u00b0', ndash: '-', mdash: '-', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', hellip: '...' };
    function clean(s) {
      return String(s == null ? '' : s).replace(/<[^>]+>/g, ' ')
        .replace(/&#x([0-9a-f]+);/gi, function (m, h) { return String.fromCharCode(parseInt(h, 16)); })
        .replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(+n); })
        .replace(/&([a-z]+\d*);/gi, function (m, n) { return ENT.hasOwnProperty(n.toLowerCase()) ? ENT[n.toLowerCase()] : m; })
        .replace(/\s+/g, ' ').trim();
    }
    function steps(x, out) {
      if (!x) return;
      if (typeof x == 'string') { x.split(/\n/).forEach(function (p) { p = clean(p); if (p) out.push(p); }); return; }
      if (Array.isArray(x)) { x.forEach(function (y) { steps(y, out); }); return; }
      if (x.itemListElement && !x.text) { steps(x.itemListElement, out); return; }
      steps(x.text || x.name, out);
    }
    var r = null, ss = document.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < ss.length && !r; i++) { try { r = find(JSON.parse(ss[i].textContent), 0); } catch (e) { /* skip */ } }
    var txt = '';
    if (r && r.recipeIngredient) {
      var st = []; steps(r.recipeInstructions, st);
      var y = [].concat(r.recipeYield || [])[0];
      var tt = String(r.totalTime || '').replace(/^P(T)?/, '').replace('H', ' hr ').replace('M', ' min').trim();
      txt = [clean(r.name || document.title), y ? 'Serves ' + clean(y) : '', tt ? 'Total time: ' + tt : '', '', 'Ingredients'].concat([].concat(r.recipeIngredient).map(clean), ['', 'Instructions'], st, ['', location.href]).join('\n');
    } else {
      var sel = String(window.getSelection ? getSelection() : '');
      if (sel.length > 40) txt = document.title + '\n' + sel + '\n\n' + location.href;
    }
    if (!txt) { alert('No recipe found on this page. Select the recipe text first, then tap the bookmark again.'); return; }
    function done() { alert('Recipe copied. Open Kitchen, tap Add a recipe, and paste it in the big box.'); }
    function fallback() { var t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } t.parentNode.removeChild(t); if (ok) done(); else prompt('Copy this text, then paste it in Kitchen:', txt); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
  }
  const bookmarkCode = () => 'javascript:' + encodeURIComponent('(' + copyForKitchen.toString().replace(/\s*\/\*[^*]*\*\/\s*/g, ' ') + ')()');
  const bookmarkHelp = () => '<details id="bmHelp"><summary class="small">Site won\'t share its recipe? Set up the Copy for Kitchen bookmark (one time, works on every recipe site)</summary><div class="stack small" style="margin-top:8px">' +
    '<ol style="margin:0;padding-left:20px;line-height:1.6"><li>In Safari, open any page, tap <b>Share</b>, then <b>Add Bookmark</b>. Name it <b>Copy for Kitchen</b> and save.</li>' +
    '<li>Tap <b>Copy the bookmark code</b> below.</li>' +
    '<li>In Safari, open <b>Bookmarks</b>, tap <b>Edit</b>, tap <b>Copy for Kitchen</b>, clear its address, paste, and tap Done.</li>' +
    '<li>From now on: on a recipe page, open Bookmarks and tap <b>Copy for Kitchen</b>. Then come back here, tap Add a recipe, and paste into the box above.</li></ol>' +
    '<div class="row"><button class="btn small" data-act="copyBookmark">Copy the bookmark code</button></div><div class="bmcode" id="bmCode">' + esc(bookmarkCode()) + '</div></div></details>';

  function sheetFinish() {
    const r = S.recipes.find((x) => x.id === ui.recipeId);
    const shown = (ui.people + ui.extra) / r.servings;
    const leftGuess = Math.max(0, Math.round(r.servings * (ui.scaleTouched ? shown : 1) - S.settings.household));
    // Most nights the whole recipe gets made. If the amounts on the page were changed, start from those instead.
    ui.fin = { left: Math.min(6, leftGuess), rate: r.rating > 0 ? 1 : r.rating < 0 ? -1 : 0, scale: ui.scaleTouched ? shown : 1, shown };
    finPlan();
    openSheet(sheetHead('Nice. How did it go?', r.name) + finishBody());
  }
  function finPlan() {
    const r = S.recipes.find((x) => x.id === ui.recipeId);
    const p = K.takeOutPlan(r, ui.fin.scale);
    ui.fin.rows = p.rows; ui.fin.notStocked = p.notStocked;
  }
  const finScales = () => {
    const r = S.recipes.find((x) => x.id === ui.recipeId);
    const opts = [[1, 'The whole recipe (serves ' + r.servings + ')'], [0.5, 'Half'], [2, 'Double']];
    if (Math.abs(ui.fin.shown - 1) > 0.01 && ![0.5, 2].some((x) => Math.abs(x - ui.fin.shown) < 0.01)) opts.splice(1, 0, [ui.fin.shown, 'As shown, ' + (ui.people + ui.extra) + ' servings']);
    return opts;
  };
  const finRow = (row, i) => {
    const unitLbl = K.unitLabel(row.unit, 2) || 'of them';
    return '<div class="takerow' + (row.take == null ? ' ask' : '') + '"><div class="nm"><b>' + esc(K.cap(row.name)) + '</b><div class="small muted">Recipe: ' + esc(row.uses.join(', ')) + ' · have ' + esc(K.fmtAmount(row.have, row.unit) || '0') + '</div>' +
      (row.take == null ? '<div class="small" style="color:var(--warn)">The app can\'t work out this amount. How much did you use?</div>' : '') + '</div>' +
      '<label class="amt"><span class="small muted">Take out</span><input class="f num" type="number" min="0" step="any" inputmode="decimal" id="fin-' + i + '" value="' + (row.take == null ? '' : K.round(row.take, 2)) + '" placeholder="0" data-change="finTake" data-i="' + i + '" aria-label="Amount of ' + esc(row.name) + ' used, in ' + esc(unitLbl) + '"><span class="small">' + esc(K.unitLabel(row.unit, 2)) + '</span></label>' +
      '<span class="pick"><button data-act="finAll" data-i="' + i + '">All of it</button><button data-act="finNone" data-i="' + i + '">None</button></span></div>';
  };
  const finishBody = () => {
    const f = ui.fin;
    return '<div id="finBody" class="stack"><div class="label">How much did you make?</div><div class="sv-row">' +
      finScales().map(([v, l]) => '<button class="' + (Math.abs(f.scale - v) < 0.01 ? 'on' : '') + '" data-act="finScale" data-n="' + v + '">' + esc(l) + '</button>').join('') + '</div>' +
      '<div class="label">Taking out of the kitchen</div>' +
      (f.rows.length ? '<div class="small muted">Change any amount that\'s off. Things that run out are removed.</div><div class="takelist">' + f.rows.map(finRow).join('') + '</div>'
        : '<div class="small muted">None of this recipe\'s ingredients are in the Kitchen list, so nothing to take out.</div>') +
      (f.notStocked.length ? '<div class="small muted">Not in the Kitchen list, so nothing to take out: ' + esc(f.notStocked.join(', ')) + '.</div>' : '') +
      '<div class="label">How many servings are left over?</div><div class="sv-row">' +
      [0, 1, 2, 3, 4, 5, 6].map((n) => '<button class="' + (f.left === n ? 'on' : '') + '" data-act="finLeft" data-n="' + n + '">' + (n === 0 ? 'None' : n === 6 ? '6+' : n) + '</button>').join('') + '</div>' +
      '<div class="small muted">Leftovers go in the fridge with an eat-by date. This also teaches the app how much this recipe really makes.</div>' +
      '<div class="label">Make it again?</div><div class="sv-row">' + [[1, 'Yes'], [0, 'Maybe'], [-1, 'Not really']].map(([v, l]) => '<button class="' + (f.rate === v ? 'on' : '') + '" data-act="finRate" data-n="' + v + '">' + l + '</button>').join('') + '</div>' +
      '<div class="row"><button class="btn" data-act="finSave">Save and update the kitchen</button></div></div>';
  };
  const rerenderFinish = () => { const b = document.getElementById('finBody'); if (b) b.outerHTML = finishBody(); };

  function sheetLogOut() {
    openSheet(sheetHead('We ate out', 'Optional: what it cost, so the Costs tab can compare') +
      '<div class="form-grid"><label class="field"><span>Amount</span><input class="f" id="outAmt" type="number" inputmode="decimal" step="0.01" min="0" placeholder="45.00" autofocus></label><label class="field"><span>Date</span><input class="f" id="outDate" type="date" value="' + K.today() + '"></label></div>' +
      '<div class="row"><button class="btn" data-act="saveOut">Log it</button></div>');
  }

  // ---------- receipt ----------
  function sheetReceipt() {
    ui.receipt = ui.receipt || { store: S.settings.stores[0], date: K.today(), text: '', lines: [], event: false, status: '', tax: null, total: null };
    openSheet(receiptHtml(), { wide: true });
  }
  function receiptHtml() {
    const rc = ui.receipt;
    const forUs = K.sum(rc.lines.filter((l) => l.forUs && !rc.event), (l) => l.price);
    const other = K.sum(rc.lines.filter((l) => !l.forUs || rc.event), (l) => l.price);
    const known = rc.lines.filter((l) => l.known).length;
    const checks = rc.lines.filter((l) => l.check).length;
    const itemsSum = forUs + other, withTax = itemsSum + (rc.tax || 0);
    let totalNote = '';
    if (rc.total != null) {
      const diff = K.round(rc.total - withTax);
      totalNote = Math.abs(diff) < 0.01 ? '<span class="have">Matches the receipt total of ' + K.money(rc.total) + '</span>'
        : '<span class="warn">These lines add up to ' + K.money(Math.abs(diff)) + (diff > 0 ? ' less' : ' more') + ' than the receipt total of ' + K.money(rc.total) + '. ' + (diff > 0 ? 'A line may be missing, or check' : 'Check') + ' the highlighted prices.</span>';
    }
    const lineHtml = (l, i) => {
      let note;
      if (l.manual) note = '<div class="small muted">Added by hand</div>';
      else if (l.known) note = '<div class="small muted">Recognized</div>';
      else note = '<div class="small warn">New code. What is it?</div>';
      if (l.fixedFrom != null) note += '<div class="small muted">Photo said ' + K.money(l.fixedFrom) + '; fixed to ' + (l.sameAs ? 'match the same item on this receipt' : 'last time\'s price') + '</div>';
      else if (l.check) note += '<div class="small warn">Check this price' + (l.last != null ? ' (last time ' + K.money(l.last) + ')' : '') + '</div>';
      else if (l.last != null) note += '<div class="small muted">Last time ' + K.money(l.last) + '</div>';
      return '<div class="rline' + (l.known && !l.check ? '' : ' ask') + ((!l.forUs || rc.event) ? ' skip' : '') + '"><div class="nm">' + (l.manual ? '' : '<code>' + esc(l.code) + '</code>') + note + '</div>' +
        '<input class="f" id="rcN-' + i + '" list="catalogList" value="' + esc(l.name) + '" data-change="rcName" data-i="' + i + '" placeholder="e.g. spinach" aria-label="Item name for ' + esc(l.code || 'new line') + '">' +
        '<span class="amt"><input class="f num" id="rcP-' + i + '" type="number" step="0.01" inputmode="decimal" value="' + l.price.toFixed(2) + '" data-change="rcPrice" data-i="' + i + '" aria-label="Price"></span>' +
        '<span class="pick"><button class="' + (l.forUs ? 'on' : '') + '" data-act="rcFor" data-i="' + i + '" data-v="1">For us</button><button class="' + (!l.forUs ? 'on' : '') + '" data-act="rcFor" data-i="' + i + '" data-v="0">Not for meals</button><button class="x" data-act="rcDel" data-i="' + i + '" aria-label="Remove this line">×</button></span></div>';
    };
    return sheetHead('Add a receipt', 'Codes you name once are remembered for that store') + catalogDatalist() +
      '<div class="form-grid"><label class="field"><span>Store</span><select class="f" id="rcStore" data-change="rcStore">' + S.settings.stores.map((s) => '<option' + (s === rc.store ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Date</span><input class="f" id="rcDate" type="date" value="' + esc(rc.date) + '" data-change="rcDate"></label>' +
      '<label class="field"><span>Photo of the receipt</span><input class="f" id="rcPhoto" type="file" accept="image/*" data-change="rcPhoto"></label></div>' +
      (rc.status ? '<div class="small" style="color:var(--ink2)" id="rcStatus">' + esc(rc.status) + '</div>' : '<div class="small muted" id="rcStatus">For the best read: lay the receipt flat on a dark table, fill the frame with it, and avoid shadows. Long receipt? Take two photos, top half then bottom half. Or type or paste the lines below.</div>') +
      (rc.thumb ? '<div class="row" style="align-items:flex-end"><img class="rcthumb" src="' + rc.thumb + '" alt="The part of the photo that was read">' + (rc.photo ? '<button class="btn small ghost" data-act="rcNoCrop">' + (rc.noCrop ? 'Read it with cropping again' : 'Cut off part of the receipt? Read the whole photo') + '</button>' : '') + '</div>' : '') +
      '<details' + (rc.lines.length ? '' : ' open') + '><summary class="small">Receipt text' + (rc.lines.length ? ' (tap to see or fix what was read)' : '') + '</summary><label class="field"><span>Item and price on each line</span><textarea class="f" id="rcText" data-change="rcText" placeholder="ORG BABY SPINACH 2.99&#10;BNLS SKNLS CHKN THGH 6.49&#10;AVOCADOS BAG 3.99">' + esc(rc.text) + '</textarea></label>' +
      '<div class="row"><button class="btn ghost" data-act="rcRead">Read the lines</button></div></details>' +
      '<div class="row"><label class="toggle"><button class="switch' + (rc.event ? ' on' : '') + '" data-act="rcEvent" role="switch" aria-checked="' + rc.event + '" aria-label="Whole receipt was for an event"></button>Whole receipt was for an event</label></div>' +
      (rc.lines.length ? '<div><div class="between"><div class="label">' + rc.lines.length + ' items · ' + known + ' recognized' + (checks ? ' · ' + checks + ' to check' : '') + '</div><button class="btn small ghost" data-act="rcAdd">Add a line</button></div>' + rc.lines.map(lineHtml).join('') +
        '<div class="stack" style="margin-top:10px"><div class="row"><span class="num">Items <b>' + K.money(itemsSum) + '</b></span><label class="row small">Tax <input class="f num" style="width:90px;padding:6px 8px" type="number" step="0.01" inputmode="decimal" id="rcTax" value="' + (rc.tax != null ? rc.tax.toFixed(2) : '') + '" placeholder="0.00" data-change="rcTax"></label><span class="num">Total <b>' + K.money(withTax) + '</b></span></div>' +
        (totalNote ? '<div class="small">' + totalNote + '</div>' : '') +
        '<div class="between"><span class="num small">For meals <b>' + K.money(forUs) + '</b> · Not for meals <b>' + K.money(other) + '</b></span><button class="btn" data-act="rcSave">Add to the kitchen</button></div></div></div>' : '');
  }
  const rerenderReceipt = () => { const sh = document.querySelector('#scrim .sheet'); if (sh) { const st = sh.scrollTop; sh.innerHTML = receiptHtml(); sh.scrollTop = st; } };
  function readReceiptLines() {
    const rc = ui.receipt;
    const p = K.parseReceiptText(rc.text);
    rc.lines = K.reviewReceiptLines(p.lines, rc.store);
    rc.total = p.total; if (p.tax != null) rc.tax = p.tax;
    rc.status = rc.lines.length ? '' : 'No lines with prices found. Each line needs an item and a price, like "ORG SPINACH 2.99".';
  }
  let tessLoading = null, tessWorker = null;
  const loadTesseract = () => tessLoading || (tessLoading = new Promise((res, rej) => {
    if (window.Tesseract) return res(window.Tesseract);
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    s.onload = () => res(window.Tesseract); s.onerror = () => { tessLoading = null; rej(new Error('load')); };
    document.head.appendChild(s);
  }));
  const getWorker = async () => {
    if (tessWorker) return tessWorker;
    const T = await loadTesseract();
    const w = await T.createWorker('eng');
    // One block of text, keep the gap between item and price, and treat the photo as a sharp scan
    await w.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1', user_defined_dpi: '300' });
    tessWorker = w;
    return w;
  };
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
  async function photoPixels(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const k = Math.min(1, 4000 / Math.max(img.naturalWidth, img.naturalHeight), Math.sqrt(16000000 / (img.naturalWidth * img.naturalHeight)));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return ctx.getImageData(0, 0, c.width, c.height);
    } finally { URL.revokeObjectURL(url); }
  }
  function grayCanvas(g) {
    const c = document.createElement('canvas'); c.width = g.width; c.height = g.height;
    const ctx = c.getContext('2d'); const id = ctx.createImageData(g.width, g.height);
    for (let i = 0; i < g.gray.length; i++) { const v = g.gray[i]; id.data[i * 4] = v; id.data[i * 4 + 1] = v; id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    ctx.putImageData(id, 0, 0);
    return c;
  }
  async function ocrPhoto(file) {
    const rc = ui.receipt;
    rc.photo = file;
    rc.status = 'Cleaning up the photo…';
    rerenderReceipt();
    await nextFrame();
    try {
      const px = await photoPixels(file);
      const clean = K.cleanReceiptImage(px.data, px.width, px.height, 4, { crop: !rc.noCrop });
      const canvas = grayCanvas(clean);
      const t = document.createElement('canvas'); const k = 220 / canvas.height; t.width = Math.max(1, Math.round(canvas.width * k)); t.height = 220;
      t.getContext('2d').drawImage(canvas, 0, 0, t.width, t.height);
      rc.thumb = t.toDataURL('image/png');
      rc.status = 'Reading the receipt on this device. The first time takes 20 to 40 seconds.';
      rerenderReceipt();
      const w = await Promise.race([getWorker(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 60000))]);
      const res = await Promise.race([w.recognize(canvas), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 90000))]);
      rc.text = res.data.text.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim()).join('\n');
      readReceiptLines();
      const checks = rc.lines.filter((l) => l.check).length;
      rc.status = rc.lines.length ? 'Read ' + rc.lines.length + ' items. ' + (checks ? checks + ' prices look off and are highlighted. ' : '') + 'Check them against the receipt, then add to the kitchen.' : 'The photo was read but no prices were found. Try again with the receipt flat and filling the photo, or type the lines.';
    } catch (e) {
      rc.status = e && e.message === 'load' ? 'The photo reader needs internet the first time. Connect and try again, or type the lines below.' : 'Couldn\'t read the photo here. Type or paste the lines below instead.';
    }
    rerenderReceipt();
  }
  function saveReceipt() {
    const rc = ui.receipt;
    const dict = (S.shorthand[rc.store] = S.shorthand[rc.store] || {});
    const lines = [];
    let added = 0;
    for (const l of rc.lines) {
      if (!l.price && !(l.name || '').trim()) continue;
      const name = (l.name || '').trim().toLowerCase() || l.code.toLowerCase();
      if (!name) continue;
      let key = K.matchKey(name);
      if (!S.catalog[key]) { key = name; S.catalog[key] = { name: key, cat: 'Other', loc: 'pantry', shelf: 14, packQty: 1, packUnit: '', price: l.price, density: null, staple: false }; }
      if (l.name && l.codeKey) dict[l.codeKey] = key;
      const c = S.catalog[key];
      const forUs = l.forUs && !rc.event;
      lines.push({ code: l.code, name: key, key, price: l.price, forUs, cat: c.cat });
      if (forUs) {
        S.prices.push({ date: rc.date, store: rc.store, key, qty: c.packQty || 1, unit: c.packUnit || '', price: l.price });
        if (c.cat !== 'Household') { K.addItem(key, c.packQty || 1, c.packUnit || '', { expires: K.addDays(rc.date, c.shelf || 7) }); added++; }
      }
    }
    S.receipts.push({ id: K.uid(), date: rc.date, store: rc.store, event: rc.event, lines, tax: rc.tax || 0, total: K.round(K.sum(lines, (l) => l.price) + (rc.tax || 0)) });
    // tick matching grocery items
    for (const g of S.grocery) if (!g.done && lines.some((l) => l.forUs && l.key === g.key)) g.done = true;
    S.grocery = S.grocery.filter((g) => !(g.done && lines.some((l) => l.key === g.key)));
    ui.receipt = null;
    save(); closeSheet(); render();
    toast('Added ' + added + ' item' + (added === 1 ? '' : 's') + ' to the kitchen');
  }

  // ---------- settings ----------
  async function sheetSettings() {
    let persisted = null;
    try { persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch (e) { persisted = null; }
    const s = S.settings;
    const html = sheetHead('Settings') +
      '<div class="row"><span class="label">People in the household</span><span class="stepper"><button data-act="hh" data-n="-1" aria-label="Fewer">−</button><b class="num" id="hhVal">' + s.household + '</b><button data-act="hh" data-n="1" aria-label="More">+</button></span></div>' +
      '<div class="row"><span class="label">Appearance</span><div class="seg">' + [['system', 'Match device'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => '<button class="' + (s.theme === k ? 'on' : '') + '" data-act="theme" data-id="' + k + '">' + l + '</button>').join('') + '</div></div>' +
      '<div class="row"><label class="toggle"><button class="switch' + (s.linkReader !== false ? ' on' : '') + '" data-act="linkReader" role="switch" aria-checked="' + (s.linkReader !== false) + '" aria-label="Use free public readers for recipe links"></button>Use free public readers for recipe links</label></div>' +
      '<div class="small muted">Most recipe sites block apps from reading them directly. When this is on, the app asks a free public service (AllOrigins, CodeTabs or Jina Reader) to fetch the page. Only the recipe link is sent, nothing about your household. Turn it off and links only work on sites that allow it; the paste box and the Copy for Kitchen bookmark always work.</div>' +
      '<label class="field"><span>Stores you shop at (comma separated)</span><input class="f" id="stStores" value="' + esc(s.stores.join(', ')) + '" data-change="stores"></label>' +
      '<div class="card pad stack"><h3>Your data</h3><div class="small" style="color:var(--ink2)">Everything is saved on this device only. ' +
      (persisted === true ? 'The browser has agreed to keep it.' : persisted === false ? 'Ask the browser to keep it so it isn\'t cleared to free up space.' : '') + '</div>' +
      '<div class="row">' + (persisted === false ? '<button class="btn small" data-act="persist">Keep data on this device</button>' : '') +
      '<button class="btn small ghost" data-act="backup">Download a backup</button><button class="btn small ghost" data-act="copyBackup">Copy backup</button>' +
      '<label class="btn small ghost" for="restoreFile">Restore a backup</label><input type="file" id="restoreFile" accept="application/json,.json" data-change="restore" hidden></div></div>' +
      '<div class="card pad stack"><h3>Start over</h3><div class="row">' +
      (S.sample ? '<button class="btn small ghost" data-act="startFresh">Start fresh, keep the sample recipes</button>' : '<button class="btn small ghost" data-act="loadSample">' + (ui.confirm === 'sample' ? 'Tap again: this replaces your data' : 'Load sample data') + '</button>') +
      '<button class="btn small danger" data-act="eraseAll">' + (ui.confirm === 'erase' ? 'Tap again to erase everything' : 'Erase everything') + '</button></div></div>';
    openSheet(html);
  }

  // ---------- cook mode (screen wake lock) ----------
  let wakeLock = null;
  async function setCookMode(on, silent) {
    if (on) {
      try {
        if (!('wakeLock' in navigator)) throw new Error('unsupported');
        wakeLock = await navigator.wakeLock.request('screen');
        ui.cookMode = true;
      } catch (e) {
        ui.cookMode = false;
        if (!silent) toast('This browser won\'t keep the screen on. On the iPad, open the app from its Home Screen icon and try again.');
      }
    } else {
      ui.cookMode = false;
      try { if (wakeLock) await wakeLock.release(); } catch (e) { /* ignore */ }
      wakeLock = null;
    }
    if (!silent) render();
  }
  document.addEventListener('visibilitychange', () => {
    if (ui.cookMode && document.visibilityState === 'visible') navigator.wakeLock.request('screen').then((w) => { wakeLock = w; }).catch(() => {});
  });

  // ---------- step timers ----------
  let tickInt = null, audioCtx = null;
  const beep = () => {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.35, 0.7].forEach((t) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination); g.gain.setValueAtTime(0.25, audioCtx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t + 0.3); o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.3); });
    } catch (e) { /* no sound */ }
  };
  const fmtClock = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function tickTimers() {
    const now = Date.now();
    let running = false;
    for (const [id, t] of Object.entries(ui.timers)) {
      const el = document.getElementById('t-' + id);
      const left = Math.max(0, Math.round((t.end - now) / 1000));
      if (left === 0 && !t.done) { t.done = true; beep(); toast('Timer done: ' + t.label); }
      if (!t.done) running = true;
      if (el) { el.classList.toggle('run', !t.done); el.classList.toggle('doneT', t.done); el.querySelector('span').textContent = t.done ? 'Done' : fmtClock(left); }
    }
    if (running && !tickInt) tickInt = setInterval(tickTimers, 1000);
    if (!running && tickInt) { clearInterval(tickInt); tickInt = null; }
  }

  // ---------- actions ----------
  const A = {
    tab: (el) => go(el.dataset.id),
    close: () => closeSheet(),
    settings: () => sheetSettings(),
    open: (el) => { if (el.dataset.id !== ui.recipeId || ui.tab !== 'recipe') ui.recipeId = null; go('recipe-' + el.dataset.id); },
    cook: async (el) => {
      const pd = (S.plan[K.today()] || {}).dinner;
      ui.openScale = pd && pd.recipeId === el.dataset.id ? pd.scale || 1 : 1;
      ui.recipeId = null;
      go('recipe-' + el.dataset.id);
      await setCookMode(true, true);
      render();
    },
    skip: (el) => { ui.skip.add(el.dataset.id); render(); },
    resetSkip: () => { ui.skip.clear(); render(); },
    startFresh: () => {
      const recipes = S.recipes.map((r) => ({ ...r, cooked: [], yields: [], rating: 0, sample: false }));
      S = K.emptyState(); S.recipes = recipes; K.useState(S); ui.confirm = null;
      save(); closeSheet(); render(); toast('Started fresh. The sample recipes are still here.');
    },
    loadSample: (el) => {
      if (ui.confirm !== 'sample') { ui.confirm = 'sample'; el.textContent = 'Tap again: this replaces your data'; return; }
      S = K.makeSample(); S.keptSample = true; K.useState(S); ui.confirm = null; save(); closeSheet(); render(); toast('Sample data loaded');
    },
    eraseAll: (el) => {
      if (ui.confirm !== 'erase') { ui.confirm = 'erase'; el.textContent = 'Tap again to erase everything'; return; }
      S = K.emptyState(); K.useState(S); ui.confirm = null; save(); closeSheet(); render(); toast('Everything was erased');
    },
    hh: (el) => { S.settings.household = K.clamp(S.settings.household + +el.dataset.n, 1, 12); document.getElementById('hhVal').textContent = S.settings.household; save(); render(); },
    theme: (el) => { S.settings.theme = el.dataset.id; applyTheme(); save(); el.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el)); },
    persist: async () => { try { const ok = await navigator.storage.persist(); toast(ok ? 'The browser will keep your data' : 'The browser said no. Adding the app to the Home Screen usually fixes this.'); } catch (e) { toast('This browser can\'t do that'); } sheetSettings(); },
    backup: () => {
      const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'kitchen-backup-' + K.today() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Backup file created. Save it to Files or iCloud Drive.');
    },
    copyBackup: async () => { try { await navigator.clipboard.writeText(JSON.stringify(S)); toast('Backup copied. Paste it into a note to keep it.'); } catch (e) { toast('Copy was blocked. Use Download a backup instead.'); } },

    // tonight
    eatLeft: (el) => {
      const it = S.items.find((i) => i.id === el.dataset.id);
      if (!it) return;
      S.log.push({ id: K.uid(), date: K.today(), type: 'leftovers', servings: Math.min(it.qty, S.settings.household), recipeId: it.leftoverOf });
      it.qty = K.round(it.qty - S.settings.household, 2);
      if (it.qty <= 0) S.items.splice(S.items.indexOf(it), 1);
      K.dayPlan(K.today()).dinner = { type: 'leftovers' };
      save(); render(); toast('Logged a leftovers night');
    },
    logOut: () => sheetLogOut(),
    saveOut: () => {
      const amt = parseFloat(document.getElementById('outAmt').value);
      const date = document.getElementById('outDate').value || K.today();
      S.log.push({ id: K.uid(), date, type: 'out', amount: isFinite(amt) ? amt : null, servings: S.settings.household });
      K.dayPlan(date).dinner = { type: 'out' };
      save(); closeSheet(); render(); toast('Logged eating out');
    },
    logLeft: () => { S.log.push({ id: K.uid(), date: K.today(), type: 'leftovers', servings: S.settings.household }); K.dayPlan(K.today()).dinner = { type: 'leftovers' }; save(); render(); toast('Logged a leftovers night'); },

    // week
    weekNav: (el) => { const n = +el.dataset.n; ui.weekStart = n ? K.addDays(ui.weekStart, n) : K.weekStart(K.today()); render(); },
    fillWeek: () => { const n = K.fillWeek(ui.weekStart); save(); render(); toast(n ? 'Filled ' + n + ' dinner' + (n > 1 ? 's' : '') + '. Tap any day to change it.' : 'Every dinner from today on is already planned'); },
    pickDinner: (el) => sheetPickDinner(el.dataset.date),
    pickScale: (el) => { ui.pick.scale = +el.dataset.n; el.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === el)); },
    setDinner: (el) => {
      const p = K.dayPlan(ui.pick.date);
      const t = el.dataset.type;
      if (t === 'clear') delete p.dinner;
      else if (t === 'recipe') p.dinner = { type: 'recipe', recipeId: el.dataset.id, scale: ui.pick.scale || 1 };
      else p.dinner = { type: t };
      save(); closeSheet(); render();
    },
    gFromPlan: () => {
      const ws = ui.weekStart, from = ws < K.today() ? K.today() : ws;
      const need = K.groceryFromPlan(from, K.addDays(ws, 6));
      S.grocery = S.grocery.filter((g) => g.source !== 'plan' || g.done);
      for (const n of need) {
        if (S.grocery.some((g) => !g.done && g.key === n.key)) continue;
        S.grocery.push({ id: K.uid(), name: n.name, key: n.key, amount: n.packs ? n.packs + ' × ' + K.fmtAmount((K.cat(n.key) || {}).packQty, n.unit) : K.fmtAmount(n.qty, n.unit), qty: n.qty, unit: n.unit, done: false, source: 'plan', for: n.for });
      }
      save(); render(); toast(need.length ? need.length + ' item' + (need.length > 1 ? 's' : '') + ' needed for the planned dinners' : 'You already have everything the plan needs');
    },
    gToggle: (el) => { const g = S.grocery.find((x) => x.id === el.dataset.id); if (g) g.done = !g.done; save(); render(); },
    gDel: (el) => { S.grocery = S.grocery.filter((x) => x.id !== el.dataset.id); save(); render(); },
    gAddKey: (el) => { const key = el.dataset.key; const c = K.cat(key); S.grocery.push({ id: K.uid(), name: K.cap(key), key, amount: c ? K.fmtAmount(c.packQty, c.packUnit) : '', done: false, source: 'manual' }); save(); render(); },
    gPutAway: () => {
      let n = 0;
      for (const g of S.grocery.filter((x) => x.done)) {
        const c = K.cat(g.key);
        if (c && c.cat === 'Household') continue;
        const packs = g.qty && c && c.packQty ? Math.max(1, Math.round(g.qty / c.packQty)) : 1;
        K.addItem(g.key, c ? packs * c.packQty : 1, c ? c.packUnit : '', { name: c ? g.key : g.name.toLowerCase() });
        n++;
      }
      S.grocery = S.grocery.filter((x) => !x.done);
      save(); render(); toast(n + ' item' + (n === 1 ? '' : 's') + ' added to the kitchen');
    },
    gSend: async () => {
      const text = K.groceryText();
      if (!text) { toast('The list is empty'); return; }
      try { if (navigator.share) { await navigator.share({ title: 'Grocery list', text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(text); toast('List copied. In Reminders on the iPhone, paste it into a list and each line becomes its own item.'); }
      catch (e) { openSheet(sheetHead('Grocery list', 'Select all and copy, then paste into Reminders on the iPhone') + '<textarea class="f" readonly id="gText">' + esc(text) + '</textarea>'); }
    },
    gImport: () => openSheet(sheetHead('Paste from iPhone', 'In Reminders, select the items, copy, and paste them here. One item per line.') + '<textarea class="f" id="gPaste" autofocus placeholder="Milk&#10;2 avocados&#10;Coffee"></textarea><div class="row"><button class="btn" data-act="gImportSave">Add to the list</button></div>'),
    gImportSave: () => { const n = K.importGroceryText(document.getElementById('gPaste').value); save(); closeSheet(); render(); toast('Added ' + n + ' item' + (n === 1 ? '' : 's')); },

    // kitchen
    loc: (el) => { ui.kitchenLoc = el.dataset.id; render(); },
    item: (el) => sheetItem(el.dataset.id),
    addItem: () => sheetAddItem(),
    itemCreate: () => {
      const name = document.getElementById('itName').value.trim().toLowerCase();
      if (!name) { toast('Give the item a name'); return; }
      const key = K.matchKey(name);
      let finalKey = key;
      if (!S.catalog[key]) {
        // New kind of thing: remember it so recipes that use it can find it in the kitchen
        finalKey = K.normName(name) || name;
        if (!S.catalog[finalKey]) S.catalog[finalKey] = { name: finalKey, cat: 'Other', loc: document.getElementById('itLoc').value, shelf: 14, packQty: parseFloat(document.getElementById('itQty').value) || 1, packUnit: document.getElementById('itUnit').value, price: null, density: null, staple: false };
        K.reindex();
      }
      K.addItem(finalKey, parseFloat(document.getElementById('itQty').value) || 1, document.getElementById('itUnit').value, { loc: document.getElementById('itLoc').value, expires: document.getElementById('itExp').value || undefined, name: finalKey });
      save(); closeSheet(); render(); toast('Added ' + name);
    },
    itemSave: (el) => {
      const it = S.items.find((i) => i.id === el.dataset.id);
      if (!it) return;
      const name = document.getElementById('itName').value.trim();
      if (name && !it.leftoverOf) {
        it.name = name.toLowerCase();
        const mk = K.matchKey(name);
        if (S.catalog[mk]) it.key = mk;
        else { it.key = K.normName(name) || it.name; if (!S.catalog[it.key]) S.catalog[it.key] = { name: it.key, cat: 'Other', loc: it.loc, shelf: 14, packQty: 1, packUnit: '', price: null, density: null, staple: false }; K.reindex(); }
      }
      it.qty = parseFloat(document.getElementById('itQty').value) || 0;
      it.unit = document.getElementById('itUnit').value;
      it.loc = document.getElementById('itLoc').value;
      it.expires = document.getElementById('itExp').value || it.expires;
      if (it.qty <= 0) S.items.splice(S.items.indexOf(it), 1);
      save(); closeSheet(); render();
    },
    itemUsed: (el) => { S.items = S.items.filter((i) => i.id !== el.dataset.id); save(); closeSheet(); render(); toast('Removed from the kitchen'); },
    itemToss: (el) => {
      const it = S.items.find((i) => i.id === el.dataset.id);
      if (!it) return;
      const c = it.leftoverOf ? null : K.ingredientCost({ key: it.key, qty: it.qty, unit: it.unit });
      S.waste.push({ id: K.uid(), date: K.today(), key: it.key, name: it.name, cost: c && c.cost != null ? K.round(c.cost) : 0 });
      S.items = S.items.filter((i) => i.id !== it.id);
      save(); closeSheet(); render(); toast('Logged as thrown out. The Costs tab uses this to spot waste.');
    },
    receipt: () => sheetReceipt(),
    rcRead: () => { ui.receipt.text = document.getElementById('rcText').value; readReceiptLines(); rerenderReceipt(); },
    rcEvent: () => { ui.receipt.event = !ui.receipt.event; rerenderReceipt(); },
    rcDel: (el) => { ui.receipt.lines.splice(+el.dataset.i, 1); rerenderReceipt(); },
    rcAdd: () => { ui.receipt.lines.push({ code: '', codeKey: '', price: 0, name: '', known: false, manual: true, forUs: true }); rerenderReceipt(); const n = document.getElementById('rcN-' + (ui.receipt.lines.length - 1)); if (n) n.focus(); },
    rcNoCrop: () => { ui.receipt.noCrop = !ui.receipt.noCrop; if (ui.receipt.photo) ocrPhoto(ui.receipt.photo); },
    rcFor: (el) => { ui.receipt.lines[+el.dataset.i].forUs = el.dataset.v === '1'; rerenderReceipt(); },
    rcSave: () => saveReceipt(),

    // recipes
    rchip: (el) => { ui.rchip = el.dataset.id; render(); },
    rchipGo: (el) => { ui.rchip = el.dataset.id; ui.rq = ''; go('recipes'); },
    canNow: () => { ui.canNow = !ui.canNow; render(); },
    addRecipe: () => sheetRecipeEditor(null),
    editRecipe: () => sheetRecipeEditor(S.recipes.find((r) => r.id === ui.recipeId)),
    parseRecipe: () => {
      const text = document.getElementById('pasteAll').value;
      if (/^\s*https?:\/\/\S+\s*$/.test(text)) { document.getElementById('rUrl').value = text.trim(); document.getElementById('pasteAll').value = ''; fetchRecipe(); return; }
      const p = K.parseRecipeText(text);
      fillRecipeForm(p, text);
      document.getElementById('parseNote').textContent = 'Found ' + p.ingredients.length + ' ingredients and ' + p.steps.length + ' steps. Check them below, then save.';
    },
    fetchRecipe: () => fetchRecipe(),
    copyBookmark: async () => {
      try { await navigator.clipboard.writeText(bookmarkCode()); toast('Copied. Now paste it as the bookmark\'s address in Safari.'); }
      catch (e) { const el = document.getElementById('bmCode'); const r = document.createRange(); r.selectNodeContents(el); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast('Copy was blocked. The code is selected: tap Copy.'); }
    },
    linkReader: () => { S.settings.linkReader = S.settings.linkReader === false; save(); sheetSettings(); },
    saveRecipe: (el) => {
      const v = (id) => document.getElementById(id).value;
      const name = v('rName').trim();
      if (!name) { toast('Give the recipe a name'); return; }
      const ingredients = v('rIng').split('\n').map((l) => l.trim()).filter(Boolean).map(K.parseIngredient);
      for (const g of ingredients) g.key = K.matchKey(g.name);
      const fields = {
        name, cuisine: v('rCuisine'), servings: Math.max(1, parseInt(v('rServ'), 10) || S.settings.household), time: parseInt(v('rTime'), 10) || null,
        tags: document.getElementById('rCel').checked ? ['celebration'] : [], source: v('rSource').trim(), notes: v('rNotes').trim(),
        ingredients, steps: v('rSteps').split('\n').map((l) => l.trim()).filter(Boolean),
      };
      let r = S.recipes.find((x) => x.id === el.dataset.id);
      if (r) Object.assign(r, fields);
      else { r = { id: K.uid(), rating: 0, yields: [], cooked: [], created: K.today(), ...fields }; S.recipes.push(r); }
      save(); closeSheet(); ui.recipeId = null; go('recipe-' + r.id); toast('Recipe saved');
    },
    delRecipe: () => {
      if (ui.confirm !== 'del-' + ui.recipeId) { ui.confirm = 'del-' + ui.recipeId; render(); return; }
      S.recipes = S.recipes.filter((r) => r.id !== ui.recipeId);
      for (const p of Object.values(S.plan)) if (p.dinner && p.dinner.recipeId === ui.recipeId) delete p.dinner;
      ui.confirm = null; save(); go('recipes'); toast('Recipe deleted');
    },
    people: (el) => { ui.people = K.clamp(ui.people + +el.dataset.n, 1, 60); ui.scaleTouched = true; render(); },
    makeScale: (el) => { const r = S.recipes.find((x) => x.id === ui.recipeId); ui.people = Math.max(1, Math.round(r.servings * +el.dataset.n)); ui.extra = 0; ui.scaleTouched = +el.dataset.n !== 1; render(); },
    cookMode: () => setCookMode(!ui.cookMode),
    got: (el) => { const i = +el.dataset.i; if (el.checked) ui.got.add(i); else ui.got.delete(i); el.closest('label').classList.toggle('got', el.checked); },
    here: (el, ev) => { if (ev.target.closest('.timer')) return; const i = +el.dataset.i; ui.here = ui.here === i ? -1 : i; document.querySelectorAll('ol.steps li').forEach((li, j) => { li.className = j === ui.here ? 'here' : j < ui.here ? 'past' : ''; }); },
    timer: (el) => {
      const id = el.dataset.tid;
      const t = ui.timers[id];
      if (t && !t.done) { delete ui.timers[id]; el.classList.remove('run'); el.querySelector('span').textContent = 'Stopped'; return; }
      ui.timers[id] = { end: Date.now() + +el.dataset.sec * 1000, label: el.closest('li').textContent.slice(0, 40) };
      try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (e) { /* ignore */ }
      tickTimers();
    },
    planIt: () => { const r = S.recipes.find((x) => x.id === ui.recipeId); let d = K.today(); for (let i = 0; i < 14; i++) { const p = S.plan[K.addDays(K.today(), i)]; if (!p || !p.dinner) { d = K.addDays(K.today(), i); break; } } const sc = K.round((ui.people + ui.extra) / r.servings, 3); K.dayPlan(d).dinner = { type: 'recipe', recipeId: r.id, scale: sc }; save(); toast('Planned for ' + K.fmtDate(d, { weekday: 'long' }) + '. Change it on This week.'); },
    finish: () => sheetFinish(),
    finLeft: (el) => { ui.fin.left = +el.dataset.n; rerenderFinish(); },
    finRate: (el) => { ui.fin.rate = +el.dataset.n; rerenderFinish(); },
    finScale: (el) => { ui.fin.scale = +el.dataset.n; finPlan(); rerenderFinish(); },
    finAll: (el) => { const row = ui.fin.rows[+el.dataset.i]; row.take = row.have; rerenderFinish(); },
    finNone: (el) => { ui.fin.rows[+el.dataset.i].take = 0; rerenderFinish(); },
    finSave: () => {
      const r = S.recipes.find((x) => x.id === ui.recipeId);
      const scale = ui.fin.scale, made = r.servings * scale;
      const cost = K.recipeCost(r, made).total;
      for (const row of ui.fin.rows) K.takeOut(row.key, Math.min(row.take || 0, row.have), row.unit);
      const left = ui.fin.left;
      const ate = Math.max(1, Math.round(made - left));
      S.log.push({ id: K.uid(), date: K.today(), type: 'cooked', recipeId: r.id, servings: ate, leftovers: left, cost: K.round(cost) });
      r.cooked = (r.cooked || []).concat(K.today());
      r.yields = (r.yields || []).concat(K.round((S.settings.household + left) / scale, 1));
      r.rating = ui.fin.rate;
      if (left > 0) S.items.push({ id: K.uid(), name: r.name + ' (leftovers)', key: 'leftover', qty: left, unit: 'serving', loc: 'fridge', expires: K.addDays(K.today(), 4), added: K.today(), leftoverOf: r.id });
      const tp = K.dayPlan(K.today());
      if (!tp.dinner || tp.dinner.type !== 'recipe') tp.dinner = { type: 'recipe', recipeId: r.id, scale };
      ui.timers = {};
      const taken = ui.fin.rows.filter((row) => row.take > 0).length;
      save(); closeSheet(); setCookMode(false, true); go('tonight');
      toast('Saved. ' + (taken ? 'Took ' + taken + ' thing' + (taken > 1 ? 's' : '') + ' out of the kitchen' : 'Nothing taken out of the kitchen') + (left ? ', and ' + left + ' serving' + (left > 1 ? 's' : '') + ' of leftovers went in the fridge.' : '.'));
    },

    // costs
    range: (el) => { ui.costRange = el.dataset.id; render(); },
    scrollPrices: () => { const p = document.getElementById('prices'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
  };

  const CH = {
    casual: (el) => { const p = K.dayPlan(el.dataset.date); p[el.dataset.meal] = el.value.trim(); save(); },
    rq: (el) => { ui.rq = el.value; const pos = el.selectionStart; render(); const n = document.getElementById('rsearch'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } } },
    pickSearch: (el) => { const q = el.value.toLowerCase(); document.querySelectorAll('#pickList .opt').forEach((o) => { o.hidden = q && !o.dataset.name.includes(q); }); },
    itName: (el) => {
      const key = K.matchKey(el.value), c = S.catalog[key];
      if (!c || document.querySelector('[data-act="itemSave"]')) return;
      document.getElementById('itQty').value = c.packQty; document.getElementById('itUnit').value = c.packUnit; document.getElementById('itLoc').value = c.loc;
      document.getElementById('itExp').value = K.addDays(K.today(), c.shelf);
    },
    rcStore: (el) => { ui.receipt.store = el.value; if (ui.receipt.lines.length) { readReceiptLines(); rerenderReceipt(); } },
    rcDate: (el) => { ui.receipt.date = el.value || K.today(); },
    rcText: (el) => { ui.receipt.text = el.value; },
    rcName: (el) => { const l = ui.receipt.lines[+el.dataset.i]; l.name = el.value; },
    rcPrice: (el, ev) => { const l = ui.receipt.lines[+el.dataset.i]; l.price = parseFloat(el.value) || 0; l.check = false; if (ev && ev.type === 'change') rerenderReceipt(); },
    rcTax: (el) => { ui.receipt.tax = parseFloat(el.value) || 0; rerenderReceipt(); },
    finTake: (el) => { const row = ui.fin.rows[+el.dataset.i]; const v = parseFloat(el.value); row.take = isFinite(v) && v >= 0 ? v : 0; },
    rcPhoto: (el) => { const f = el.files && el.files[0]; if (f) ocrPhoto(f); },
    stores: (el) => { const list = el.value.split(',').map((s) => s.trim()).filter(Boolean); if (list.length) { S.settings.stores = list; save(); } },
    restore: (el) => {
      const f = el.files && el.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try { const d = JSON.parse(rd.result); if (!d || !Array.isArray(d.recipes) || !d.catalog) throw new Error('bad'); S = d; K.useState(S); applyTheme(); save(); closeSheet(); render(); toast('Backup restored'); }
        catch (e) { toast('That file isn\'t a Kitchen backup'); }
      };
      rd.readAsText(f);
    },
  };

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (ev.target.id === 'scrim') { closeSheet(); return; }
    if (!el) return;
    const f = A[el.dataset.act];
    if (!f) return;
    if (el.tagName !== 'INPUT') ev.preventDefault();
    if (ui.confirm && !['delRecipe', 'eraseAll', 'loadSample'].includes(el.dataset.act)) { ui.confirm = null; }
    f(el, ev);
  });
  document.addEventListener('change', (ev) => {
    const el = ev.target.closest('[data-change]');
    if (el && CH[el.dataset.change] && !['rq', 'pickSearch'].includes(el.dataset.change)) CH[el.dataset.change](el, ev);
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target.closest('[data-change]');
    if (el && ['rq', 'pickSearch', 'rcText', 'rcName', 'rcPrice', 'itName', 'finTake'].includes(el.dataset.change)) CH[el.dataset.change](el, ev);
  });
  document.addEventListener('submit', (ev) => {
    const f = ev.target.closest('[data-form]');
    if (!f) return;
    ev.preventDefault();
    if (f.dataset.form === 'gAdd') {
      const inp = document.getElementById('gAddName');
      const n = K.importGroceryText(inp.value);
      inp.value = '';
      if (n) { save(); render(); const i2 = document.getElementById('gAddName'); if (i2) i2.focus(); }
    }
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeSheet(); });
  window.addEventListener('hashchange', route);

  // ---------- start ----------
  (async function start() {
    S = await K.loadState();
    // New device, or one still showing the untouched early sample: start with the family recipes.
    if (!S || (S.sample && !S.keptSample)) { S = K.makeFamily(); K.saveState(S); }
    // Opened before the first receipt was added and nothing logged yet: add it now.
    else if (!S.sample && !S.receipts.length && !S.items.length && K.loadSeedReceipts) { K.useState(S); K.loadSeedReceipts(S); K.saveState(S); }
    if (!S.sample && K.addNewFamilyRecipes && K.addNewFamilyRecipes(S)) K.saveState(S);
    if (!S.sample && K.applyStorePrices && K.applyStorePrices(S)) K.saveState(S);
    K.useState(S);
    if (K.upgradeCatalog(S)) { K.reindex(); K.saveState(S); }
    S.settings = Object.assign({ household: 3, theme: 'system', stores: K.DEFAULT_STORES.slice() }, S.settings || {});
    K.useState(S);
    ui.people = S.settings.household;
    applyTheme();
    route();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  })();
})();
