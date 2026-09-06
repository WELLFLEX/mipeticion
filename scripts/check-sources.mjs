import { readFile, writeFile, mkdir } from 'node:fs/promises';
const catalog = JSON.parse(await readFile('data/catalog/entidades.v1.json', 'utf8'));
const urls = [
  ...new Set(
    catalog.entidades.flatMap((e) => [
      ...e.fuentes.map((s) => s.url),
      ...e.canales.map((c) => c.url),
      e.tramiteDirecto.url,
    ]),
  ),
];
const results = [];
for (const url of urls) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15_000) });
    results.push({ url, status: r.status, finalUrl: r.url, needsReview: !r.ok || r.url !== url });
    await r.body?.cancel();
  } catch {
    results.push({ url, status: null, needsReview: true });
  }
}
const stale = catalog.entidades.flatMap((e) =>
  e.fuentes
    .filter((s) => Date.now() - Date.parse(s.verificadoEl) > 30 * 86400000)
    .map((s) => ({ entity: e.slug, source: s.id, verified: s.verificadoEl })),
);
await mkdir('reports', { recursive: true });
await writeFile(
  'reports/source-check.json',
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      notice:
        'An HTTP success is not a verified filing channel. Human review required; no catalog data was changed.',
      stale,
      results,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    checked: results.length,
    flagged: results.filter((r) => r.needsReview).length,
    stale: stale.length,
  }),
);
if (results.some((r) => r.needsReview) || stale.length) process.exitCode = 1;
