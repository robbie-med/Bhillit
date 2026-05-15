// --- Config ---
const LEVELS = ['none', 'sf', 'low', 'mod', 'high'];
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

// --- State ---
const state = {
  ptType: 'est', // 'est' or 'new'
  problems: {},  // id -> count (0 means off; for toggles 0/1)
  data:     {},
  risk:     {},  // id -> boolean
  extras:   {},
};

// --- Render ---
function renderChips(containerId, items, kind) {
  const c = document.getElementById(containerId);
  c.innerHTML = '';
  items.forEach(item => {
    const b = document.createElement('button');
    b.className = 'chip' + (item.counter ? ' counter' : '');
    b.dataset.id = item.id;
    b.dataset.kind = kind;
    if (item.level) b.dataset.level = item.level;

    if (item.level) {
      const dot = document.createElement('span');
      dot.className = 'lvl-dot ' + item.level;
      b.appendChild(dot);
    }
    const lbl = document.createElement('span');
    lbl.textContent = item.label;
    b.appendChild(lbl);

    if (item.counter) {
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
  if (item.counter) {
    bag[item.id] = (bag[item.id] || 0) + 1;
  } else {
    bag[item.id] = !bag[item.id];
  }
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

function resetAll() {
  state.problems = {}; state.data = {}; state.risk = {}; state.extras = {};
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.remove('on', 'sf', 'low', 'mod', 'high');
    const ct = c.querySelector('.count'); if (ct) ct.textContent = '1';
  });
  recompute();
}

// --- Compute ---
function computeProblems() {
  const s = state.problems;
  const reasons = [];
  let level = 'none';

  const minorCt = s['minor'] || 0;
  const stableCt = s['stable'] || 0;

  // High triggers
  if (s['threat']) { level = 'high'; reasons.push('threat to life/fxn'); }
  else if (s['severe-exac']) { level = 'high'; reasons.push('severe exacerbation'); }
  // Moderate triggers
  else if (s['exac'] || s['systemic'] || s['undx'] || s['complicated'] || stableCt >= 2) {
    level = 'mod';
    if (s['exac']) reasons.push('chronic exacerbation');
    if (s['systemic']) reasons.push('acute w/ systemic sx');
    if (s['undx']) reasons.push('new undx problem');
    if (s['complicated']) reasons.push('complicated injury');
    if (stableCt >= 2) reasons.push(stableCt + ' stable chronic');
  }
  // Low triggers
  else if (stableCt === 1 || s['acute-uncomp'] || minorCt >= 2) {
    level = 'low';
    if (stableCt === 1) reasons.push('1 stable chronic');
    if (s['acute-uncomp']) reasons.push('acute uncomplicated');
    if (minorCt >= 2) reasons.push(minorCt + ' minor');
  }
  // SF
  else if (minorCt === 1) {
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

  // Extensive: 2 of 3 categories at moderate level
  const cat1Mod = cat1Count >= 3;
  const catsMet = (cat1Mod ? 1 : 0) + (cat2 ? 1 : 0) + (cat3 ? 1 : 0);
  if (catsMet >= 2) {
    level = 'high';
  } else if (cat1Count >= 3 || cat2 || cat3) {
    level = 'mod';
  } else if (cat1Count >= 2 || s['historian']) {
    level = 'low';
  } else if (cat1Count >= 1) {
    level = 'sf'; // treat as minimal
  }

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
  // For each level (low, mod, high), check if 2 of 3 hit
  const levels = ['high', 'mod', 'low', 'sf'];
  for (const tgt of levels) {
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

const CODE_TABLE = {
  est: { sf: '99212', low: '99213', mod: '99214', high: '99215' },
  new: { sf: '99202', low: '99203', mod: '99204', high: '99205' },
};

function recompute() {
  const prob = computeProblems();
  const data = computeData();
  const risk = computeRisk();

  setSecLvl('probLvl', prob.level);
  setSecLvl('dataLvl', data.level);
  setSecLvl('riskLvl', risk.level);

  const out = deriveCode(prob.level, data.level, risk.level);
  const codeEl = document.getElementById('codeOut');
  const driverEl = document.getElementById('driverOut');
  codeEl.classList.remove('sf', 'low', 'mod', 'high', 'empty');

  if (out.mdmLevel === 'none') {
    codeEl.textContent = '—';
    codeEl.classList.add('empty');
    driverEl.innerHTML = 'Tap above to start.';
  } else {
    const code = CODE_TABLE[state.ptType][out.mdmLevel];
    codeEl.textContent = code;
    codeEl.classList.add(out.mdmLevel);
    const ptLabel = state.ptType === 'new' ? 'new' : 'est';
    driverEl.innerHTML = `<strong>${LEVEL_LABEL[out.mdmLevel]} MDM</strong> &middot; ${ptLabel} pt &middot; driven by <strong>${out.drivers.join(' + ')}</strong>`;
  }

  // Breakdown
  setBd('bdProb', 'Problems', prob, out.drivers.includes('problems'), out.mdmLevel);
  setBd('bdData', 'Data',     data, out.drivers.includes('data'), out.mdmLevel);
  setBd('bdRisk', 'Risk',     risk, out.drivers.includes('risk'), out.mdmLevel);

  // Addons
  renderAddons(risk);
}

function setSecLvl(id, lvl) {
  const el = document.getElementById(id);
  el.classList.remove('sf', 'low', 'mod', 'high');
  if (lvl && lvl !== 'none') {
    el.classList.add(lvl);
    el.textContent = LEVEL_LABEL[lvl];
  } else {
    el.textContent = '—';
  }
}

function setBd(id, label, result, used, mdmLevel) {
  const el = document.getElementById(id);
  el.classList.toggle('used', used && mdmLevel !== 'none');
  const v = el.querySelector('.v');
  const reasonStr = result.reasons.length ? ` (${result.reasons.join(', ')})` : '';
  v.textContent = LEVEL_LABEL[result.level] + reasonStr;
}

function renderAddons(risk) {
  const c = document.getElementById('addonsOut');
  c.innerHTML = '';
  const tags = new Set();

  // Any extras selected
  let hasModifier25Trigger = false;
  EXTRAS.forEach(e => {
    if (state.extras[e.id]) {
      e.codes.forEach(code => tags.add(code));
      if (e.id === 'awv' || e.id === 'preventive') hasModifier25Trigger = true;
    }
  });

  // Rx flag
  if (state.risk['rx']) tags.add('Rx mgmt → moderate risk locked in');

  // Hospitalization decision
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

// --- Wire up ---
document.addEventListener('DOMContentLoaded', () => {
  renderChips('probChips', PROBLEMS, 'problems');
  renderChips('dataChips', DATA, 'data');
  renderChips('riskChips', RISK, 'risk');
  // Extras render with light-touch
  const extrasC = document.getElementById('extrasChips');
  EXTRAS.forEach(e => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.dataset.id = e.id;
    b.textContent = e.label;
    b.addEventListener('click', () => {
      state.extras[e.id] = !state.extras[e.id];
      b.classList.toggle('on', state.extras[e.id]);
      if (state.extras[e.id]) b.classList.add('mod');
      else b.classList.remove('mod');
      recompute();
    });
    extrasC.appendChild(b);
  });

  document.getElementById('reset').addEventListener('click', () => {
    if (Object.keys(state.problems).length + Object.keys(state.data).length + Object.keys(state.risk).length + Object.keys(state.extras).length === 0) return;
    resetAll();
  });

  const ptBtn = document.getElementById('ptType');
  ptBtn.addEventListener('click', () => {
    state.ptType = state.ptType === 'est' ? 'new' : 'est';
    ptBtn.textContent = state.ptType === 'est' ? 'Established' : 'New';
    recompute();
  });

  document.getElementById('result').addEventListener('click', () => {
    document.getElementById('result').classList.toggle('open');
  });

  recompute();
});

// --- Service worker registration (offline support) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
