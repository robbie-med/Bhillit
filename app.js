// ============================================================
//  Bhillit — config + MDM engine (unchanged clinical logic)
// ============================================================
const LEVEL_RANK = { none: 0, sf: 1, low: 2, mod: 3, high: 4 };
const LEVEL_LABEL = { none: 'None', sf: 'Straightforward', low: 'Low', mod: 'Moderate', high: 'High' };

const PROBLEMS = [
  { id: 'minor',         label: 'Minor / self-limited', level: 'sf',   counter: true,  short: 'minor' },
  { id: 'stable',        label: 'Stable chronic',       level: 'low',  counter: true,  short: 'stable chronic' },
  { id: 'acute-uncomp',  label: 'Acute uncomplicated',  level: 'low',  counter: false, short: 'acute uncomplicated' },
  { id: 'undx',          label: 'New problem, uncertain Px', level: 'mod', counter: false, short: 'new undx problem' },
  { id: 'systemic',      label: 'Acute w/ systemic sx', level: 'mod',  counter: false, short: 'acute w/ systemic sx' },
  { id: 'exac',          label: 'Chronic w/ exacerbation', level: 'mod', counter: false, short: 'chronic exacerbation' },
  { id: 'complicated',   label: 'Acute complicated injury', level: 'mod', counter: false, short: 'complicated injury' },
  { id: 'severe-exac',   label: 'Severe exacerbation',  level: 'high', counter: false, short: 'severe exacerbation' },
  { id: 'threat',        label: 'Threat to life / fxn', level: 'high', counter: false, short: 'threat to life/fxn' },
];

const DATA = [
  { id: 'note',   label: 'Outside note reviewed', counter: true,  cat: 1, short: 'outside note(s)' },
  { id: 'result', label: 'Test result reviewed',  counter: true,  cat: 1, short: 'test result(s)' },
  { id: 'order',  label: 'Test ordered',          counter: true,  cat: 1, short: 'test order(s)' },
  { id: 'historian', label: 'Independent historian', counter: false, cat: 1, short: 'independent historian' },
  { id: 'interp',    label: 'Indep. interp of test', counter: false, cat: 2, short: 'independent interp' },
  { id: 'discuss',   label: 'External clinician discussion', counter: false, cat: 3, short: 'external discussion' },
];

const RISK = [
  { id: 'none-r',   label: 'Reassurance only',          level: 'sf',   short: 'no Rx, reassurance' },
  { id: 'otc',      label: 'OTC recommended (no Rx)',   level: 'low',  short: 'OTC recommended' },
  { id: 'minor-sx', label: 'Minor sx, no risk factors', level: 'low',  short: 'minor surgery' },
  { id: 'rx',       label: 'Prescription management',   level: 'mod',  short: 'prescription drug management' },
  { id: 'sdoh',     label: 'SDOH limiting tx',          level: 'mod',  short: 'SDOH limiting management' },
  { id: 'minor-sx-rf', label: 'Minor sx w/ risk factors', level: 'mod', short: 'minor surgery w/ risk' },
  { id: 'major-sx-elec', label: 'Elective major surgery',   level: 'mod',  short: 'elective major surgery' },
  { id: 'hosp',     label: 'Decision: hospitalization', level: 'high', short: 'hospitalization decision' },
  { id: 'monitor',  label: 'Intensive drug monitoring', level: 'high', short: 'intensive drug monitoring' },
  { id: 'emerg-sx', label: 'Emergency major surgery',   level: 'high', short: 'emergency surgery' },
  { id: 'dnr',      label: 'DNR / de-escalation',       level: 'high', short: 'DNR / de-escalation' },
];

const EXTRAS = [
  { id: 'awv',       label: 'Medicare AWV (G0438/G0439)', codes: ['G0438 or G0439', '-25 on E/M'] },
  { id: 'preventive', label: 'Preventive visit (99395-7)', codes: ['99395-97', '-25 on E/M'] },
  { id: 'tobacco',   label: 'Tobacco counseling',         codes: ['99406 (3-10 min) / 99407 (>10 min)'] },
  { id: 'obesity',   label: 'Obesity counseling (Mcare)', codes: ['G0447'] },
  { id: 'alcohol',   label: 'Alcohol counseling',         codes: ['G0442/G0443'] },
  { id: 'depression', label: 'Depression screen',         codes: ['G0444'] },
  { id: 'paperwork', label: 'Forms / paperwork',          codes: ['99080 (rarely paid; check policy)'] },
];

const CODE_TABLE = {
  est: { sf: '99212', low: '99213', mod: '99214', high: '99215' },
  new: { sf: '99202', low: '99203', mod: '99204', high: '99205' },
};

const BENCHMARK = { sf: 8, low: 38, mod: 46, high: 8 };
const LEVEL_ORDER = ['sf', 'low', 'mod', 'high'];

const state = { ptType: 'est', problems: {}, data: {}, risk: {}, extras: {} };
let current = null;     // last computed result
let lastResult = null;  // { code, level, ptType, driverText } or null
let lastSavedId = null; // id of the entry saved for the current visit

function computeProblems() {
  const s = state.problems;
  const reasons = [];
  let level = 'none';
  const minorCt = s['minor'] || 0;
  const stableCt = s['stable'] || 0;
  if (s['threat']) { level = 'high'; reasons.push('threat to life/fxn'); }
  else if (s['severe-exac']) { level = 'high'; reasons.push('severe exacerbation'); }
  else if (s['exac'] || s['systemic'] || s['undx'] || s['complicated'] || stableCt >= 2) {
    level = 'mod';
    if (s['exac']) reasons.push('chronic exacerbation');
    if (s['systemic']) reasons.push('acute w/ systemic sx');
    if (s['undx']) reasons.push('new undx problem');
    if (s['complicated']) reasons.push('complicated injury');
    if (stableCt >= 2) reasons.push(stableCt + ' stable chronic');
  } else if (stableCt === 1 || s['acute-uncomp'] || minorCt >= 2) {
    level = 'low';
    if (stableCt === 1) reasons.push('1 stable chronic');
    if (s['acute-uncomp']) reasons.push('acute uncomplicated');
    if (minorCt >= 2) reasons.push(minorCt + ' minor');
  } else if (minorCt === 1) {
    level = 'sf';
    reasons.push('1 minor');
  }
  return { level, reasons };
}

function computeData() {
  const s = state.data;
  const cat1Count = (s['note'] || 0) + (s['result'] || 0) + (s['order'] || 0) + (s['historian'] ? 1 : 0);
  const cat2 = !!s['interp'];
  const cat3 = !!s['discuss'];
  const reasons = [];
  let level = 'none';
  const cat1Mod = cat1Count >= 3;
  const catsMet = (cat1Mod ? 1 : 0) + (cat2 ? 1 : 0) + (cat3 ? 1 : 0);
  if (catsMet >= 2) level = 'high';
  else if (cat1Count >= 3 || cat2 || cat3) level = 'mod';
  else if (cat1Count >= 2 || s['historian']) level = 'low';
  else if (cat1Count >= 1) level = 'sf';
  if (cat1Count) reasons.push(cat1Count + ' Cat-1 item' + (cat1Count > 1 ? 's' : ''));
  if (cat2) reasons.push('indep interp');
  if (cat3) reasons.push('external discussion');
  return { level, reasons };
}

function computeRisk() {
  const s = state.risk;
  let topLevel = 'none';
  const reasons = [];
  RISK.forEach(r => {
    if (s[r.id]) {
      if (LEVEL_RANK[r.level] > LEVEL_RANK[topLevel]) topLevel = r.level;
      reasons.push(r.short);
    }
  });
  return { level: topLevel, reasons };
}

function deriveCode(probLvl, dataLvl, riskLvl) {
  for (const tgt of ['high', 'mod', 'low', 'sf']) {
    const r = LEVEL_RANK[tgt];
    let hits = 0;
    const which = [];
    if (LEVEL_RANK[probLvl] >= r) { hits++; which.push('problems'); }
    if (LEVEL_RANK[dataLvl] >= r) { hits++; which.push('data'); }
    if (LEVEL_RANK[riskLvl] >= r) { hits++; which.push('risk'); }
    if (hits >= 2) return { mdmLevel: tgt, drivers: which };
  }
  return { mdmLevel: 'none', drivers: [] };
}

// ============================================================
//  Coding log (persisted locally)
// ============================================================
const LOG_KEY = 'emCoderLog_v1';
let logEntries = loadLog();
let logFilter = 'all';

function loadLog() {
  try {
    const v = JSON.parse(localStorage.getItem(LOG_KEY));
    return Array.isArray(v) ? v : [];
  } catch (e) { return []; }
}
function saveLog() {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(logEntries)); } catch (e) {}
}
function addLogEntry(fav) {
  if (!lastResult) return null;
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ts: Date.now(),
    code: lastResult.code,
    level: lastResult.level,
    ptType: lastResult.ptType,
    fav: !!fav,
  };
  logEntries.push(entry);
  saveLog();
  refreshAll();
  return entry.id;
}
function deleteLogEntry(id) {
  logEntries = logEntries.filter(e => e.id !== id);
  if (lastSavedId === id) lastSavedId = null;
  saveLog();
  refreshAll();
}
function toggleFav(id) {
  const e = logEntries.find(x => x.id === id);
  if (!e) return;
  e.fav = !e.fav;
  saveLog();
  refreshAll();
  paintResult();
}
function clearLog() {
  if (!logEntries.length) return;
  if (!confirm('Delete all ' + logEntries.length + ' logged visit(s)? This cannot be undone.')) return;
  logEntries = [];
  lastSavedId = null;
  saveLog();
  refreshAll();
}

// ============================================================
//  Chips
// ============================================================
function renderChips(containerId, items, kind) {
  const c = document.getElementById(containerId);
  c.innerHTML = '';
  items.forEach(item => {
    const b = document.createElement('button');
    b.className = 'chip' + (item.counter ? ' counter' : '');
    b.dataset.id = item.id;
    if (item.level) {
      const dot = document.createElement('span');
      dot.className = 'lvl-dot ' + item.level;
      b.appendChild(dot);
    }
    const lbl = document.createElement('span');
    lbl.textContent = item.label;
    b.appendChild(lbl);
    if (item.counter) {
      const minus = document.createElement('span');
      minus.className = 'minus';
      minus.setAttribute('role', 'button');
      minus.setAttribute('aria-label', 'Remove one ' + item.label);
      minus.textContent = '−';
      minus.addEventListener('click', ev => { ev.stopPropagation(); onChipDec(kind, item, b); });
      b.appendChild(minus);
      const ct = document.createElement('span');
      ct.className = 'count';
      ct.textContent = '1';
      b.appendChild(ct);
    }
    b.addEventListener('click', () => onChipTap(kind, item, b));
    c.appendChild(b);
  });
}
function onChipTap(kind, item, btn) {
  const bag = state[kind];
  if (kind === 'extras') {
    bag[item.id] = !bag[item.id];
    btn.classList.toggle('on', !!bag[item.id]);
    btn.classList.toggle('mod', !!bag[item.id]);
    recompute();
    return;
  }
  if (item.counter) bag[item.id] = (bag[item.id] || 0) + 1;
  else bag[item.id] = !bag[item.id];
  syncChip(btn, item, bag[item.id]);
  recompute();
}
function onChipDec(kind, item, btn) {
  const bag = state[kind];
  const cur = bag[item.id] || 0;
  if (cur <= 0) return;
  bag[item.id] = cur - 1;
  syncChip(btn, item, bag[item.id]);
  recompute();
}
function syncChip(btn, item, val) {
  if (item.counter) {
    const on = val > 0;
    btn.classList.toggle('on', on);
    if (item.level) btn.classList.toggle(item.level, on);
    const ct = btn.querySelector('.count');
    if (ct) ct.textContent = val || 1;
  } else {
    btn.classList.toggle('on', !!val);
    if (item.level) btn.classList.toggle(item.level, !!val);
  }
}
function resetInputs() {
  state.problems = {}; state.data = {}; state.risk = {}; state.extras = {};
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.remove('on', 'sf', 'low', 'mod', 'high');
    const ct = c.querySelector('.count'); if (ct) ct.textContent = '1';
  });
}

// ============================================================
//  Compute + paint result views
// ============================================================
function recompute() {
  const prob = computeProblems();
  const data = computeData();
  const risk = computeRisk();
  const out = deriveCode(prob.level, data.level, risk.level);
  let code = null, driverText;
  if (out.mdmLevel === 'none') {
    driverText = 'Complete the steps to see your code.';
    lastResult = null;
  } else {
    code = CODE_TABLE[state.ptType][out.mdmLevel];
    const ptLabel = state.ptType === 'new' ? 'new' : 'est';
    driverText = `<strong>${LEVEL_LABEL[out.mdmLevel]} MDM</strong> &middot; ${ptLabel} pt &middot; driven by <strong>${out.drivers.join(' + ')}</strong>`;
    lastResult = { code, level: out.mdmLevel, ptType: state.ptType, driverText };
  }
  current = { prob, data, risk, out, code, driverText };
  paintResult();
}

function paintResult() {
  if (!current) return;
  const { prob, data, risk, out, code, driverText } = current;

  document.querySelectorAll('.js-code').forEach(el => {
    el.classList.remove('sf', 'low', 'mod', 'high', 'empty');
    if (out.mdmLevel === 'none') { el.textContent = '—'; el.classList.add('empty'); }
    else { el.textContent = code; el.classList.add(out.mdmLevel); }
  });
  document.querySelectorAll('.js-driver').forEach(el => { el.innerHTML = driverText; });

  setStepBadge('prob', prob.level);
  setStepBadge('data', data.level);
  setStepBadge('risk', risk.level);

  setBd('bdProb', prob, out.drivers.includes('problems'), out.mdmLevel);
  setBd('bdData', data, out.drivers.includes('data'), out.mdmLevel);
  setBd('bdRisk', risk, out.drivers.includes('risk'), out.mdmLevel);
  renderAddons();

  const favBtn = document.getElementById('favBtn');
  if (favBtn) {
    favBtn.disabled = !lastResult;
    const saved = lastSavedId && logEntries.find(e => e.id === lastSavedId);
    favBtn.classList.toggle('on', !!(saved && saved.fav));
  }
}

function setStepBadge(sec, lvl) {
  document.querySelectorAll('.js-steplvl[data-sec="' + sec + '"]').forEach(el => {
    el.classList.remove('sf', 'low', 'mod', 'high');
    if (lvl && lvl !== 'none') { el.classList.add(lvl); el.textContent = LEVEL_LABEL[lvl]; }
    else el.textContent = '—';
  });
}
function setBd(id, result, used, mdmLevel) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('used', used && mdmLevel !== 'none');
  const reasonStr = result.reasons.length ? ` (${result.reasons.join(', ')})` : '';
  el.querySelector('.v').textContent = LEVEL_LABEL[result.level] + reasonStr;
}
function renderAddons() {
  const c = document.getElementById('addonsOut');
  if (!c) return;
  c.innerHTML = '';
  const tags = new Set();
  EXTRAS.forEach(e => { if (state.extras[e.id]) e.codes.forEach(code => tags.add(code)); });
  if (state.risk['rx']) tags.add('Rx mgmt → moderate risk locked in');
  if (state.risk['hosp']) tags.add('Document decision re: admission explicitly');
  tags.forEach(t => {
    const span = document.createElement('span');
    span.className = 'addon';
    span.textContent = t;
    c.appendChild(span);
  });
  if (!tags.size) {
    const span = document.createElement('span');
    span.className = 'addon';
    span.style.background = 'transparent';
    span.style.color = 'var(--muted)';
    span.style.fontWeight = '400';
    span.textContent = 'No add-ons selected.';
    c.appendChild(span);
  }
}

// ============================================================
//  Screen routing
// ============================================================
const TAB_SCREENS = ['home', 'history', 'favorites', 'settings'];
function go(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const scr = document.getElementById('scr-' + name);
  if (scr) scr.classList.add('active');
  const tabbar = document.getElementById('tabbar');
  const isTab = TAB_SCREENS.includes(name);
  tabbar.classList.toggle('show', isTab);
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.go === name));
  if (name === 'history') renderLog();
  if (name === 'favorites') renderFavorites();
  if (name === 'home') renderRecent();
  window.scrollTo(0, 0);
  const body = scr && scr.querySelector('.page-body, .wiz-scroll, .sheet');
  if (body) body.scrollTop = 0;
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

// ============================================================
//  Wizard
// ============================================================
const N_STEPS = 6;
let currentStep = 0;

function buildStepDots() {
  const c = document.getElementById('stepDots');
  c.innerHTML = '';
  for (let i = 0; i < N_STEPS; i++) {
    const d = document.createElement('span');
    d.className = 'pd';
    c.appendChild(d);
  }
}
function showStep(i) {
  currentStep = Math.max(0, Math.min(N_STEPS - 1, i));
  document.querySelectorAll('.wstep').forEach(w => {
    w.classList.toggle('active', +w.dataset.step === currentStep);
  });
  document.getElementById('stepCount').textContent = `Step ${currentStep + 1} of ${N_STEPS}`;
  document.querySelectorAll('#stepDots .pd').forEach((d, idx) => {
    d.classList.toggle('done', idx < currentStep);
    d.classList.toggle('cur', idx === currentStep);
  });
  const isReview = currentStep === N_STEPS - 1;
  document.getElementById('liveResult').style.display = isReview ? 'none' : '';
  document.getElementById('wizPrimary').textContent = isReview ? 'Save to History' : 'Continue';
  document.getElementById('wizSecondary').textContent = isReview ? 'Start Over' : 'Skip to Results';
  const sc = document.querySelector('#scr-wizard .wiz-scroll');
  if (sc) sc.scrollTop = 0;
  paintResult();
}
function startNewVisit() {
  resetInputs();
  state.ptType = localStorage.getItem('emCoderDefaultPt') === 'new' ? 'new' : 'est';
  lastSavedId = null;
  document.querySelectorAll('.select-card').forEach(c => c.classList.toggle('on', c.dataset.pt === state.ptType));
  recompute();
  go('wizard');
  document.getElementById('tabbar').classList.remove('show');
  showStep(0);
}
function saveVisit() {
  if (!lastResult) { toast('Add inputs to get a code first'); return; }
  if (lastSavedId && logEntries.find(e => e.id === lastSavedId)) {
    toast('Already saved to History');
  } else {
    lastSavedId = addLogEntry(false);
    toast('Saved to History');
  }
  go('home');
}

// ============================================================
//  History / Favorites / Recent rendering
// ============================================================
function filteredEntries() {
  return logFilter === 'all' ? logEntries : logEntries.filter(e => e.ptType === logFilter);
}
function levelCounts(entries) {
  const c = { sf: 0, low: 0, mod: 0, high: 0 };
  entries.forEach(e => { if (c[e.level] != null) c[e.level]++; });
  return c;
}
function buildBar(el, pct, counts, showCount) {
  el.innerHTML = '';
  const total = LEVEL_ORDER.reduce((s, k) => s + pct[k], 0);
  if (total <= 0) {
    el.classList.add('empty');
    const s = document.createElement('span');
    s.textContent = 'No data yet';
    el.appendChild(s);
    return;
  }
  el.classList.remove('empty');
  LEVEL_ORDER.forEach(k => {
    if (pct[k] <= 0) return;
    const seg = document.createElement('div');
    seg.className = 'b-seg ' + k;
    seg.style.width = pct[k] + '%';
    const label = Math.round(pct[k]) + '%';
    seg.title = LEVEL_LABEL[k] + ': ' + label + (showCount && counts ? ' (' + counts[k] + ')' : '');
    if (pct[k] >= 12) seg.textContent = label;
    el.appendChild(seg);
  });
}
function fmtDate(ts) {
  try {
    const d = new Date(ts);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const yest = new Date(today); yest.setDate(today.getDate() - 1);
    const isYest = d.toDateString() === yest.toDateString();
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (sameDay) return time;
    if (isYest) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch (e) { return ''; }
}
function visitRow(e, opts) {
  const li = document.createElement('li');
  li.className = 'visit-row';
  const av = document.createElement('span');
  av.className = 'avatar ' + (e.ptType === 'new' ? 'new' : 'est');
  av.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>';
  const main = document.createElement('div');
  main.className = 'vr-main';
  main.innerHTML = `<div class="vr-t">${fmtDate(e.ts)}</div><div class="vr-s">${e.ptType === 'new' ? 'New Patient' : 'Established'} &middot; ${LEVEL_LABEL[e.level]}</div>`;
  const chip = document.createElement('span');
  chip.className = 'code-chip ' + e.level;
  chip.textContent = e.code;
  li.appendChild(av);
  li.appendChild(main);
  li.appendChild(chip);
  if (opts && opts.book) {
    const bk = document.createElement('button');
    bk.className = 'vr-book' + (e.fav ? ' on' : '');
    bk.setAttribute('aria-label', e.fav ? 'Remove from favorites' : 'Add to favorites');
    bk.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
    bk.addEventListener('click', ev => { ev.stopPropagation(); toggleFav(e.id); });
    li.appendChild(bk);
  }
  if (opts && opts.del) {
    const del = document.createElement('button');
    del.className = 'vr-del';
    del.setAttribute('aria-label', 'Delete ' + e.code + ' visit');
    del.textContent = '×';
    del.addEventListener('click', ev => { ev.stopPropagation(); deleteLogEntry(e.id); });
    li.appendChild(del);
  }
  return li;
}
function renderRecent() {
  const list = document.getElementById('recentList');
  list.innerHTML = '';
  const recent = logEntries.slice().sort((a, b) => b.ts - a.ts).slice(0, 4);
  if (!recent.length) {
    const li = document.createElement('li');
    li.className = 'empty-note';
    li.textContent = 'No visits yet. Tap “New Visit” to code your first.';
    list.appendChild(li);
    return;
  }
  recent.forEach(e => {
    const row = visitRow(e, {});
    row.addEventListener('click', () => go('history'));
    list.appendChild(row);
  });
}
function renderFavorites() {
  const list = document.getElementById('favList');
  list.innerHTML = '';
  const favs = logEntries.filter(e => e.fav).sort((a, b) => b.ts - a.ts);
  if (!favs.length) {
    const li = document.createElement('li');
    li.className = 'empty-note';
    li.textContent = 'No favorites yet. Tap the bookmark on a visit to save it here.';
    list.appendChild(li);
    return;
  }
  favs.forEach(e => list.appendChild(visitRow(e, { book: true, del: true })));
}
function renderLog() {
  const entries = filteredEntries();
  const counts = levelCounts(entries);
  const n = entries.length;
  const all = logEntries.length;
  const yourPct = { sf: 0, low: 0, mod: 0, high: 0 };
  if (n > 0) LEVEL_ORDER.forEach(k => { yourPct[k] = (counts[k] / n) * 100; });
  buildBar(document.getElementById('yourBar'), yourPct, counts, true);
  buildBar(document.getElementById('refBar'), BENCHMARK, null, false);
  document.getElementById('yourCount').textContent =
    n + ' logged' + (logFilter !== 'all' ? ' (' + logFilter + ')' : '');

  const body = document.getElementById('cmpBody');
  body.innerHTML = '';
  LEVEL_ORDER.forEach(k => {
    const yPct = n > 0 ? yourPct[k] : 0;
    const delta = yPct - BENCHMARK[k];
    const dCell = n > 0
      ? `<td class="${delta > 0.5 ? 'delta-up' : delta < -0.5 ? 'delta-dn' : ''}">${delta > 0 ? '+' : ''}${Math.round(delta)}</td>`
      : '<td>—</td>';
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td>${LEVEL_LABEL[k]}</td><td>${n > 0 ? Math.round(yPct) + '%' : '—'}</td>` +
      `<td>${counts[k]}</td><td>${BENCHMARK[k]}%</td>` + dCell;
    body.appendChild(tr);
  });

  document.getElementById('logSummary').textContent =
    all + ' visit' + (all === 1 ? '' : 's') + ' logged total';
  document.getElementById('clearLog').disabled = all === 0;

  const list = document.getElementById('logList');
  list.innerHTML = '';
  if (!entries.length) {
    const li = document.createElement('li');
    li.className = 'empty-note';
    li.textContent = all === 0 ? 'No visits logged yet.' : 'No visits match this filter.';
    list.appendChild(li);
    return;
  }
  entries.slice().sort((a, b) => b.ts - a.ts)
    .forEach(e => list.appendChild(visitRow(e, { book: true, del: true })));
}
function refreshAll() {
  if (document.getElementById('scr-history')) renderLog();
  renderRecent();
  renderFavorites();
}

// ============================================================
//  Splash / onboarding
// ============================================================
const SLIDES = [
  'Move through your visit.<br>Code with confidence.',
  'Automatic E/M leveling.<br>Answer a few quick prompts.',
  'Track every visit.<br>See your mix vs. a benchmark.',
];
let slideIdx = 0;
function showSlide(i) {
  slideIdx = (i + SLIDES.length) % SLIDES.length;
  document.getElementById('splashTag').innerHTML = SLIDES[slideIdx];
  document.querySelectorAll('#splashDots .dot').forEach((d, idx) =>
    d.classList.toggle('on', idx === slideIdx));
  document.getElementById('splashNext').textContent =
    slideIdx === SLIDES.length - 1 ? 'Get Started' : 'Next';
}
function finishOnboarding() {
  try { localStorage.setItem('emCoderOnboarded', '1'); } catch (e) {}
  go('home');
}

// ============================================================
//  Wire up
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  renderChips('probChips', PROBLEMS, 'problems');
  renderChips('dataChips', DATA, 'data');
  renderChips('riskChips', RISK, 'risk');
  renderChips('extrasChips', EXTRAS, 'extras');
  buildStepDots();

  // greeting
  const h = new Date().getHours();
  document.getElementById('greetHi').textContent =
    'Good ' + (h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening');

  // default patient type from settings
  const defPt = localStorage.getItem('emCoderDefaultPt') === 'new' ? 'new' : 'est';
  document.querySelectorAll('#defaultPt button').forEach(b =>
    b.classList.toggle('on', b.dataset.pt === defPt));

  // splash
  showSlide(0);
  document.getElementById('splashNext').addEventListener('click', () => {
    if (slideIdx < SLIDES.length - 1) showSlide(slideIdx + 1);
    else finishOnboarding();
  });
  document.querySelectorAll('#splashDots .dot').forEach((d, i) =>
    d.addEventListener('click', () => showSlide(i)));

  // bottom nav
  document.querySelectorAll('[data-go]').forEach(el =>
    el.addEventListener('click', () => go(el.dataset.go)));

  // home
  document.getElementById('homeNewVisit').addEventListener('click', startNewVisit);
  document.getElementById('quickStart').addEventListener('click', startNewVisit);
  document.getElementById('bellBtn').addEventListener('click', () => toast('No new notifications'));

  // wizard nav
  document.getElementById('wizBack').addEventListener('click', () => {
    if (currentStep > 0) showStep(currentStep - 1);
    else go('home');
  });
  document.getElementById('wizPrimary').addEventListener('click', () => {
    if (currentStep < N_STEPS - 1) showStep(currentStep + 1);
    else saveVisit();
  });
  document.getElementById('wizSecondary').addEventListener('click', () => {
    if (currentStep < N_STEPS - 1) showStep(N_STEPS - 1);
    else startNewVisit();
  });
  document.getElementById('viewDetails').addEventListener('click', () => showStep(N_STEPS - 1));

  // patient type select cards
  document.querySelectorAll('.select-card').forEach(card => {
    card.addEventListener('click', () => {
      state.ptType = card.dataset.pt;
      document.querySelectorAll('.select-card').forEach(c =>
        c.classList.toggle('on', c === card));
      recompute();
    });
  });

  // review favorite/bookmark
  document.getElementById('favBtn').addEventListener('click', () => {
    if (!lastResult) return;
    if (lastSavedId && logEntries.find(e => e.id === lastSavedId)) {
      toggleFav(lastSavedId);
      const e = logEntries.find(x => x.id === lastSavedId);
      toast(e && e.fav ? 'Added to Favorites' : 'Removed from Favorites');
    } else {
      lastSavedId = addLogEntry(true);
      toast('Saved to Favorites');
    }
    paintResult();
  });

  // history controls
  document.getElementById('logFilter').addEventListener('click', e => {
    const btn = e.target.closest('button[data-f]');
    if (!btn) return;
    logFilter = btn.dataset.f;
    document.querySelectorAll('#logFilter button').forEach(b =>
      b.classList.toggle('on', b === btn));
    renderLog();
  });
  document.getElementById('clearLog').addEventListener('click', clearLog);

  // settings
  document.getElementById('defaultPt').addEventListener('click', e => {
    const btn = e.target.closest('button[data-pt]');
    if (!btn) return;
    try { localStorage.setItem('emCoderDefaultPt', btn.dataset.pt); } catch (er) {}
    document.querySelectorAll('#defaultPt button').forEach(b =>
      b.classList.toggle('on', b === btn));
    toast('Default set to ' + (btn.dataset.pt === 'new' ? 'New' : 'Established'));
  });
  document.getElementById('showIntro').addEventListener('click', () => {
    showSlide(0);
    go('splash');
  });
  document.getElementById('settingsClear').addEventListener('click', clearLog);

  recompute();
  refreshAll();

  // initial screen
  let onboarded = false;
  try { onboarded = localStorage.getItem('emCoderOnboarded') === '1'; } catch (e) {}
  go(onboarded ? 'home' : 'splash');
});

// ---- Service worker (offline) ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err =>
      console.warn('Service worker registration failed:', err));
  });
}
