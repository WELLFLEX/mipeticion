// Official DANE ArcGIS host; source IDs are NOT DIVIPOLA codes.
import { mkdir, writeFile } from 'node:fs/promises';
const source =
  'https://portalgis.dane.gov.co/mparcgis/rest/services/Divipola/Serv_DIVIPOLA_MGN_2024/FeatureServer';
async function get(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error('DANE unavailable: ' + r.status);
  const json = await r.json();
  if (json.error) throw new Error('DANE query failed');
  return json;
}
const service = await get(source + '?f=json');
const layer = service.layers.find((l) => l.name === 'Municipio');
if (!layer) throw new Error('Municipality layer missing');
const metadata = await get(source + '/' + layer.id + '?f=json');
const fields = ['DPTO_CCDGO', 'MPIO_CCDGO', 'MPIO_CDPMP', 'DPTO_CNMBRE', 'MPIO_CNMBRE'];
for (const f of fields)
  if (!metadata.fields.some((actual) => actual.name === f))
    throw new Error('DANE schema changed: ' + f);
const countUrl = new URL(source + '/' + layer.id + '/query');
for (const [key, value] of Object.entries({ f: 'json', where: '1=1', returnCountOnly: 'true' }))
  countUrl.searchParams.set(key, value);
const expected = (await get(countUrl)).count;
if (!Number.isInteger(expected) || expected > metadata.maxRecordCount)
  throw new Error('DANE snapshot exceeds service limit; reviewed pagination needed');
const url = new URL(source + '/' + layer.id + '/query');
for (const [key, value] of Object.entries({
  f: 'json',
  where: '1=1',
  outFields: fields.join(','),
  returnGeometry: 'false',
}))
  url.searchParams.set(key, value);
// This service rejects resultOffset/resultRecordCount even below its limit.
const page = await get(url);
if (
  page.exceededTransferLimit ||
  !Array.isArray(page.features) ||
  page.features.length !== expected
)
  throw new Error('DANE snapshot incomplete');
const rows = page.features.map((f) => f.attributes);
const municipios = rows
  .map((r) => {
    const departamento = String(r.DPTO_CCDGO).padStart(2, '0'),
      local = String(r.MPIO_CCDGO).padStart(3, '0'),
      codigo = String(r.MPIO_CDPMP).padStart(5, '0');
    if (
      !/^\d{5}$/.test(codigo) ||
      codigo !== departamento + local ||
      !r.MPIO_CNMBRE ||
      !r.DPTO_CNMBRE
    )
      throw new Error('Invalid DIVIPOLA mapping');
    return { codigo, departamento, nombre: r.MPIO_CNMBRE, nombreDepartamento: r.DPTO_CNMBRE };
  })
  .sort((a, b) => a.codigo.localeCompare(b.codigo));
if (municipios.length < 1100 || new Set(municipios.map((m) => m.codigo)).size !== municipios.length)
  throw new Error('Incomplete or duplicate geography');
if (
  !municipios.some((m) => m.codigo === '11001' && m.nombre.includes('BOGOT')) ||
  !municipios.some((m) => m.codigo === '05001' && m.nombre.includes('MEDELL'))
)
  throw new Error('Known mappings changed');
await mkdir('data/staging', { recursive: true });
await writeFile(
  'data/staging/divipola-2024.json',
  JSON.stringify(
    {
      version: 'MGN-2024',
      license: 'CC-BY-4.0',
      licenseUrl:
        'https://geoportal.dane.gov.co/acerca-del-geoportal/licencia-y-condiciones-de-uso/',
      source,
      layerId: layer.id,
      attribution: 'Departamento Administrativo Nacional de Estadística (DANE)',
      retrievedAt: new Date().toISOString().slice(0, 10),
      mapping: 'MPIO_CDPMP = DPTO_CCDGO + MPIO_CCDGO; never OBJECTID',
      municipios,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Staged ' +
    municipios.length +
    ' validated DIVIPOLA entries. Human review required before publishing.',
);
