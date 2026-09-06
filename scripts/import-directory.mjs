// Read-only upstream imports. Never publish or overwrite reviewed catalog entries.
import { mkdir, writeFile } from 'node:fs/promises';
const SOURCE = 'https://www.datos.gov.co/resource/h7zv-k39x.json';
const query = new URL(SOURCE);
query.searchParams.set(
  '$select',
  'dm_institucion_cod_institucion,nombre,ccb_nit_inst,orden,sector,ccb_pagina_web',
);
query.searchParams.set('$order', 'dm_institucion_cod_institucion');
query.searchParams.set('$limit', '5000');
const rows = [];
for (let offset = 0; offset < 50000; offset += 5000) {
  query.searchParams.set('$offset', String(offset));
  const response = await fetch(query, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error('Registry unavailable: ' + response.status);
  const page = await response.json();
  if (
    !Array.isArray(page) ||
    page.some(
      (r) => typeof r.nombre !== 'string' || typeof r.dm_institucion_cod_institucion !== 'string',
    )
  )
    throw new Error('Registry schema changed');
  rows.push(...page);
  if (page.length < 5000) break;
  if (offset === 45000) throw new Error('Registry pagination exceeded bound');
}
if (rows.length < 5) throw new Error('Incomplete registry');
const metadataResponse = await fetch('https://www.datos.gov.co/api/views/h7zv-k39x.json', {
  signal: AbortSignal.timeout(30_000),
});
if (!metadataResponse.ok) throw new Error('Metadata unavailable');
const metadata = await metadataResponse.json();
if (metadata.licenseId !== 'CC_40_BY_SA')
  throw new Error('Upstream license changed; review before importing');
await mkdir('data/staging', { recursive: true });
await writeFile(
  'data/staging/registry.json',
  JSON.stringify(
    {
      source: SOURCE,
      license: 'CC-BY-SA-4.0',
      retrievedAt: new Date().toISOString().slice(0, 10),
      rows,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Staged ' +
    rows.length +
    ' public entity identity records. Review the diff; contact details are unverified leads.',
);
