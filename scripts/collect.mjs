process.env.TZ = 'Asia/Shanghai';

import fs from 'node:fs';

const CONFIG = {
  modrinthProjectId: 'WVhTwkpD',
  curseforgeSlug: 'crosshairbobbingmod',
  curseforgeModId: 1673018,
  githubRepo: 'xuanwz11353/CrosshairBobbingMod-Remake-1.21.1',
  historyDays: 90,
  keepDays: 180,
  dataFile: 'downloads.json',
};

const MODRINTH_TOKEN = process.env.MODRINTH_TOKEN || '';
const CURSEFORGE_API_KEY = process.env.CURSEFORGE_API_KEY || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const UA = 'CrosshairBobbingMod-Stats/1.0';
const ANALYTICS = 'https://api.modrinth.com/v3/analytics';
const ALL_TIME_START = '2024-01-01T00:00:00Z';

const pad = (n) => String(n).padStart(2, '0');
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(s, n) {
  const d = new Date(s + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function beijingMidnightUTC(dateStr) {
  return new Date(dateStr + 'T00:00:00+08:00').toISOString();
}

async function analytics(metrics, { daily = false } = {}) {
  if (!MODRINTH_TOKEN) {
    console.error('MODRINTH_TOKEN missing');
    return null;
  }
  let time_range, slices;
  if (daily) {
    const endDate = addDays(localToday(), 1);
    const startDate = addDays(endDate, -CONFIG.historyDays);
    time_range = { start: beijingMidnightUTC(startDate), end: beijingMidnightUTC(endDate) };
    slices = CONFIG.historyDays;
  } else {
    time_range = { start: ALL_TIME_START, end: new Date().toISOString() };
    slices = 1;
  }
  const res = await fetch(ANALYTICS, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MODRINTH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ time_range: { ...time_range, resolution: { slices } }, return_metrics: metrics }),
  });
  if (!res.ok) {
    console.error('Modrinth analytics', res.status, (await res.text()).slice(0, 200));
    return null;
  }
  return res.json();
}

async function modrinthDaily() {
  const json = await analytics({ project_downloads: { bucket_by: ['project_id'] }, project_views: {} }, { daily: true });
  if (!json) return null;
  const endDate = addDays(localToday(), 1);
  const startDate = addDays(endDate, -CONFIG.historyDays);
  const out = {};
  (json.metrics || []).forEach((bucket, i) => {
    const date = addDays(startDate, i);
    let downloads = 0, views = 0;
    for (const m of bucket) {
      if (m.metric_kind === 'downloads' && (!m.source_project || m.source_project === CONFIG.modrinthProjectId)) downloads += m.downloads || 0;
      if (m.metric_kind === 'views') views += m.views || 0;
    }
    out[date] = { downloads, views };
  });
  return out;
}

async function modrinthTotal() {
  const res = await fetch(`https://api.modrinth.com/v2/project/${CONFIG.modrinthProjectId}`);
  if (!res.ok) throw new Error(`modrinth project ${res.status}`);
  return (await res.json()).downloads;
}

async function modrinthViewsTotal() {
  const json = await analytics({ project_views: {} });
  if (!json) return null;
  let total = 0;
  for (const bucket of json.metrics || []) for (const m of bucket) if (m.metric_kind === 'views') total += m.views || 0;
  return total;
}

async function modrinthBreakdowns() {
  const [loadersJson, versionsJson, meta] = await Promise.all([
    analytics({ project_downloads: { bucket_by: ['loader'] } }),
    analytics({ project_downloads: { bucket_by: ['version_id'] } }),
    fetch(`https://api.modrinth.com/v2/project/${CONFIG.modrinthProjectId}/version`).then((r) => (r.ok ? r.json() : [])),
  ]);
  const loaders = { fabric: 0, neoforge: 0, unknown: 0 };
  if (loadersJson) {
    for (const bucket of loadersJson.metrics || []) for (const m of bucket) {
      if (m.metric_kind !== 'downloads') continue;
      const key = m.loader === 'fabric' ? 'fabric' : m.loader === 'neoforge' ? 'neoforge' : 'unknown';
      loaders[key] += m.downloads || 0;
    }
  }
  const versionMap = {};
  if (versionsJson) {
    for (const bucket of versionsJson.metrics || []) for (const m of bucket) {
      if (m.metric_kind !== 'downloads' || !m.version_id) continue;
      versionMap[m.version_id] = (versionMap[m.version_id] || 0) + (m.downloads || 0);
    }
  }
  const versions = (meta || []).map((v) => ({ name: v.version_number, platform: 'modrinth', loaders: v.loaders, downloads: versionMap[v.id] || 0 }));
  return { loaders, versions };
}

async function githubData() {
  let total = 0;
  const loaders = { fabric: 0, neoforge: 0, unknown: 0 };
  const versions = [];
  let page = 1;
  const headers = { 'User-Agent': UA, Accept: 'application/vnd.github+json' };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  while (true) {
    const res = await fetch(`https://api.github.com/repos/${CONFIG.githubRepo}/releases?per_page=100&page=${page}`, { headers });
    if (!res.ok) throw new Error(`github ${res.status}`);
    const releases = await res.json();
    if (!Array.isArray(releases) || releases.length === 0) break;
    for (const r of releases) {
      let relTotal = 0;
      for (const a of r.assets || []) {
        const c = a.download_count || 0;
        relTotal += c;
        total += c;
        const name = `${a.name} ${r.tag_name}`.toLowerCase();
        const key = name.includes('neoforge') ? 'neoforge' : name.includes('fabric') ? 'fabric' : 'unknown';
        loaders[key] += c;
      }
      versions.push({ name: r.tag_name, platform: 'github', downloads: relTotal });
    }
    if (releases.length < 100) break;
    page++;
  }
  return { total, loaders, versions };
}

async function curseforgeTotal() {
  try {
    const res = await fetch(`https://api.cfwidget.com/minecraft/mc-mods/${CONFIG.curseforgeSlug}`, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      const j = await res.json();
      return { total: j.downloads.total, source: 'cfwidget' };
    }
    console.error(`cfwidget ${res.status}`);
  } catch (e) {
    console.error('cfwidget error:', e.message);
  }

  if (CURSEFORGE_API_KEY) {
    try {
      const res = await fetch(`https://api.curseforge.com/v1/mods/${CONFIG.curseforgeModId}`, {
        headers: { 'x-api-key': CURSEFORGE_API_KEY, Accept: 'application/json', 'User-Agent': UA },
      });
      if (res.ok) {
        const j = await res.json();
        return { total: j.data.downloadCount, source: 'curseforge-api' };
      }
      console.error(`CurseForge Core API ${res.status}`);
    } catch (e) {
      console.error('CurseForge Core API error:', e.message);
    }
  }

  const res = await fetch(`https://mod.mcimirror.top/curseforge/v1/mods/${CONFIG.curseforgeModId}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`cfmirror ${res.status}`);
  const j = await res.json();
  return { total: j.data.downloadCount, source: 'cfmirror' };
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG.dataFile, 'utf8'));
  } catch {
    return { daily: {}, totals: {}, snapshots: {} };
  }
}

function snapshot(data, key, total, today) {
  const prev = data.snapshots[key];
  if (prev && prev.date !== today) {
    data.daily[today] = data.daily[today] || {};
    data.daily[today][key] = Math.max(0, total - prev.total);
  }
  data.snapshots[key] = { date: today, total };
  data.totals[key] = total;
}

async function main() {
  const data = load();
  data.daily = data.daily || {};
  data.totals = data.totals || {};
  data.snapshots = data.snapshots || {};
  data.sources = data.sources || {};
  const today = localToday();

  const [mTotal, cfRes, gh, mDaily, mViews, mBreak] = await Promise.all([
    modrinthTotal().catch((e) => (console.error(e.message), null)),
    curseforgeTotal().catch((e) => (console.error(e.message), null)),
    githubData().catch((e) => (console.error(e.message), null)),
    modrinthDaily().catch((e) => (console.error(e.message), null)),
    modrinthViewsTotal().catch((e) => (console.error(e.message), null)),
    modrinthBreakdowns().catch((e) => (console.error(e.message), null)),
  ]);

  if (mTotal != null) data.totals.modrinth = mTotal;
  if (mViews != null) data.totals.views = mViews;
  if (cfRes != null) {
    data.sources.curseforge = cfRes.source;
    snapshot(data, 'curseforge', cfRes.total, today);
  }
  if (gh) snapshot(data, 'github', gh.total, today);
  if (mDaily) {
    for (const [d, v] of Object.entries(mDaily)) {
      data.daily[d] = data.daily[d] || {};
      data.daily[d].modrinth = v.downloads;
      data.daily[d].views = v.views;
    }
  }

  if (mBreak || gh) {
    const loaders = { fabric: 0, neoforge: 0, unknown: 0 };
    if (mBreak) for (const k of Object.keys(loaders)) loaders[k] += mBreak.loaders[k] || 0;
    if (gh) for (const k of Object.keys(loaders)) loaders[k] += gh.loaders[k] || 0;
    const versions = [...(mBreak ? mBreak.versions : []), ...(gh ? gh.versions : [])];
    versions.sort((a, b) => b.downloads - a.downloads);
    data.breakdown = { loaders, versions };
  }

  data.updated = new Date().toISOString();
  const dates = Object.keys(data.daily).sort();
  if (dates.length > CONFIG.keepDays) {
    for (const d of dates.slice(0, dates.length - CONFIG.keepDays)) delete data.daily[d];
  }

  fs.writeFileSync(CONFIG.dataFile, JSON.stringify(data, null, 2));
  console.log('OK', JSON.stringify(data.totals), 'cf=' + data.sources.curseforge);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
