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

const dayStr = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => {
  const d = new Date(s + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return dayStr(d);
};

async function modrinthDaily() {
  if (!MODRINTH_TOKEN) {
    console.error('MODRINTH_TOKEN missing, skip daily analytics');
    return null;
  }
  const end = addDays(dayStr(new Date()), 1);
  const start = addDays(end, -CONFIG.historyDays);
  const res = await fetch('https://api.modrinth.com/v3/analytics', {
    method: 'POST',
    headers: { Authorization: `Bearer ${MODRINTH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      time_range: { start: `${start}T00:00:00Z`, end: `${end}T00:00:00Z`, resolution: { slices: CONFIG.historyDays } },
      return_metrics: { project_downloads: { bucket_by: ['project_id'] } },
    }),
  });
  if (!res.ok) {
    console.error('Modrinth analytics failed:', res.status, await res.text());
    return null;
  }
  const json = await res.json();
  const out = {};
  (json.metrics || []).forEach((bucket, i) => {
    const date = addDays(start, i);
    let v = 0;
    for (const m of bucket) if (m.source_project === CONFIG.modrinthProjectId) v = m.downloads || 0;
    out[date] = v;
  });
  return out;
}

async function modrinthTotal() {
  const res = await fetch(`https://api.modrinth.com/v2/project/${CONFIG.modrinthProjectId}`);
  if (!res.ok) throw new Error(`modrinth project ${res.status}`);
  return (await res.json()).downloads;
}

async function curseforgeTotal() {
  if (CURSEFORGE_API_KEY) {
    try {
      const res = await fetch(`https://api.curseforge.com/v1/mods/${CONFIG.curseforgeModId}`, {
        headers: { 'x-api-key': CURSEFORGE_API_KEY, Accept: 'application/json', 'User-Agent': UA },
      });
      if (res.ok) {
        const j = await res.json();
        return j.data.downloadCount;
      }
      console.error(`CurseForge Core API ${res.status}, falling back to cfwidget`);
    } catch (e) {
      console.error('CurseForge Core API error, falling back to cfwidget:', e.message);
    }
  }
  const res = await fetch(`https://api.cfwidget.com/minecraft/mc-mods/${CONFIG.curseforgeSlug}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`cfwidget ${res.status}`);
  const j = await res.json();
  return j.downloads.total;
}

async function githubTotal() {
  let total = 0;
  let page = 1;
  const headers = { 'User-Agent': UA, Accept: 'application/vnd.github+json' };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  while (true) {
    const res = await fetch(`https://api.github.com/repos/${CONFIG.githubRepo}/releases?per_page=100&page=${page}`, { headers });
    if (!res.ok) throw new Error(`github ${res.status}`);
    const releases = await res.json();
    if (!Array.isArray(releases) || releases.length === 0) break;
    for (const r of releases) for (const a of (r.assets || [])) total += a.download_count || 0;
    if (releases.length < 100) break;
    page++;
  }
  return total;
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
  const today = dayStr(new Date());

  const [mTotal, fTotal, gTotal, mDaily] = await Promise.all([
    modrinthTotal().catch((e) => (console.error(e.message), null)),
    curseforgeTotal().catch((e) => (console.error(e.message), null)),
    githubTotal().catch((e) => (console.error(e.message), null)),
    modrinthDaily().catch((e) => (console.error(e.message), null)),
  ]);

  if (mTotal != null) data.totals.modrinth = mTotal;
  if (fTotal != null) snapshot(data, 'curseforge', fTotal, today);
  if (gTotal != null) snapshot(data, 'github', gTotal, today);
  if (mDaily) {
    for (const [d, v] of Object.entries(mDaily)) {
      data.daily[d] = data.daily[d] || {};
      data.daily[d].modrinth = v;
    }
  }

  data.updated = new Date().toISOString();
  const dates = Object.keys(data.daily).sort();
  if (dates.length > CONFIG.keepDays) {
    for (const d of dates.slice(0, dates.length - CONFIG.keepDays)) delete data.daily[d];
  }

  fs.writeFileSync(CONFIG.dataFile, JSON.stringify(data, null, 2));
  console.log('OK', JSON.stringify(data.totals));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
