import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import catalog from '../../data/catalog/entidades.v1.json';
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
}
async function accessibility(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .exclude('nextjs-portal')
    .analyze();
  expect(results.violations).toEqual([]);
}
test('home, search, guide, keyboard and mobile accessibility', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu voz cuenta');
  await noOverflow(page);
  await accessibility(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.getByRole('link', { name: 'Buscar una entidad', exact: true }).first().click();
  await page.getByRole('searchbox').fill('pensiones');
  await expect(page.getByRole('heading', { name: 'Colpensiones', exact: true })).toBeVisible();
  await noOverflow(page);
  await accessibility(page);
  await page.goto('/entidades/sena');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('SENA');
  await accessibility(page);
  await page.goto('/guia-dian');
  await expect(page).toHaveURL(/entidades\/dian/);
  expect(errors).toEqual([]);
});
const requests = {
  informacion: 'Necesito copias de los documentos de mi expediente.',
  estado: 'Quiero conocer en qué estado está mi trámite.',
  atencion: 'Quiero que revisen la atención administrativa que recibí.',
};
for (const entity of catalog.entidades)
  for (const [index, route] of entity.rutas.entries()) {
    test('draft through official guide: ' + entity.slug + ' / ' + route.id, async ({ page }) => {
      const sent: Record<string, unknown>[] = [];
      page.on('request', (r) => {
        if (r.url().endsWith('/api/generate')) sent.push(r.postDataJSON());
      });
      await page.goto('/crear?entidad=' + entity.slug + '&ruta=' + route.id);
      await page
        .getByLabel('Tu situación', { exact: true })
        .fill(
          'Hice una gestión en ' +
            entity.nombreCorto +
            ' hace varias semanas y necesito orientación.',
        );
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await page.getByLabel('Lo que solicitas').fill(requests[route.id as keyof typeof requests]);
      await page.getByRole('button', { name: 'Encontrar mi ruta' }).click();
      await expect(page.getByLabel('Entidad', { exact: true })).toHaveValue(entity.slug);
      await page.locator('input[name="pathway"][value="' + route.id + '"]').check();
      if (index === 1) await page.getByRole('radio', { name: /Ayuda de IA para redactar/ }).check();
      await page.getByRole('checkbox', { name: /Confirmo la entidad/ }).check();
      await page.getByRole('checkbox', { name: /Autorizo el tratamiento necesario/ }).check();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await page.getByLabel('Nombre completo', { exact: true }).fill('Persona Sintética de Prueba');
      await page.getByLabel('Número de documento', { exact: true }).fill('SYNTHETIC-123');
      await page.getByLabel('Ciudad desde donde').fill('Bogotá');
      await page.getByLabel('Correo para recibir').fill('prueba@example.com');
      await page.getByRole('button', { name: 'Preparar mi borrador' }).click();
      // Exercise real per-minute limits without disabling or weakening them for the test.
      const result = page.getByRole('heading', { name: 'Tu petición, lista para revisar' });
      await expect(result.or(page.locator('main').getByRole('alert'))).toBeVisible({
        timeout: 35000,
      });
      if (await page.locator('main').getByRole('alert').isVisible()) {
        await expect(page.locator('main').getByRole('alert')).toContainText('límite temporal');
        await page.waitForTimeout(60_000);
        await page.getByRole('button', { name: 'Preparar mi borrador' }).click();
      }
      await expect(result).toBeVisible();
      await expect(page.getByText('Borrador con plantilla', { exact: true })).toBeVisible();
      if (index === 1)
        await expect(
          page.getByText(/La IA no está disponible o alcanzó su presupuesto/),
        ).toBeVisible();
      for (const body of sent)
        expect(JSON.stringify(body)).not.toMatch(/Persona Sintética|SYNTHETIC-123|prueba@example/);
      await page
        .getByLabel('Hecho 1', { exact: true })
        .fill('Hecho corregido: fui a la oficina y guardé mi constancia.');
      await noOverflow(page);
      if (entity.slug === 'sena' && index === 0) {
        await accessibility(page);
        await page.getByRole('button', { name: 'Editar mis datos' }).click();
        await page.getByLabel('Nombre completo', { exact: true }).fill('Otra Persona Sintética');
        await page.getByRole('button', { name: 'Preparar mi borrador' }).click();
        await expect(page.getByLabel('Hecho 1', { exact: true })).toHaveValue(
          'Hecho corregido: fui a la oficina y guardé mi constancia.',
        );
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click();
        const download = await downloadPromise;
        await download.saveAs('/tmp/mipeticion-synthetic.pdf');
        const bytes = await readFile((await download.path())!);
        expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
        expect(bytes.length).toBeGreaterThan(1000);
      }
      await page.getByRole('button', { name: 'Ver cómo radicar mi petición' }).click();
      await expect(page.getByRole('heading', { name: 'El siguiente paso: radicar' })).toBeVisible();
      await expect(
        page.getByText(/Descargar o guardar en MiPetición no radica/i).first(),
      ).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('mipeticion:borrador:v2'))).toBeNull();
      await noOverflow(page);
    });
  }
test('unsupported urgent case is referred and account configuration is explained', async ({
  page,
}) => {
  await page.goto('/crear');
  await page
    .getByLabel('Tu situación', { exact: true })
    .fill('Estoy en un hospital y mi EPS no entrega los medicamentos.');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Lo que solicitas').fill('Necesito atención urgente por un riesgo vital.');
  await page.getByRole('button', { name: 'Encontrar mi ruta' }).click();
  await expect(page.getByRole('heading', { name: 'Tu caso necesita otra ruta' })).toBeVisible();
  await expect(page.getByLabel('Nombre completo')).toHaveCount(0);
  await page.goto('/mis-solicitudes');
  await expect(
    page.getByRole('heading', { name: 'El seguimiento con cuenta está en preparación' }),
  ).toBeVisible();
  await accessibility(page);
  await page.goto('/privacidad');
  await noOverflow(page);
  await accessibility(page);
});
test('device opt-in, expiry, slow network and zoom reflow', async ({ page }) => {
  await page.goto('/crear');
  await page
    .getByLabel('Tu situación', { exact: true })
    .fill('Mi solicitud sintética para revisar un borrador.');
  await page.getByRole('checkbox', { name: 'Recordarlo en este dispositivo' }).check();
  await expect
    .poll(() => page.evaluate(() => Boolean(localStorage.getItem('mipeticion:borrador:v2'))))
    .toBe(true);
  await page.evaluate(() => {
    const key = 'mipeticion:borrador:v2';
    const b = JSON.parse(localStorage.getItem(key)!);
    b.actualizado = '2000-01-01T00:00:00Z';
    localStorage.setItem(key, JSON.stringify(b));
    sessionStorage.clear();
  });
  await page.reload();
  await expect(page.getByLabel('Tu situación', { exact: true })).toHaveValue('');
  await page.setViewportSize({ width: 320, height: 700 });
  await noOverflow(page);
  await page.goto('/');
  await page.evaluate(() => {
    document.body.style.zoom = '2';
  });
  await noOverflow(page);
  await page.route('**/api/auth/session', async (route) => {
    await new Promise((r) => setTimeout(r, 1200));
    await route.continue();
  });
  await page.goto('/mis-solicitudes');
  await expect(page.getByText('Cargando tu espacio privado…')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'El seguimiento con cuenta está en preparación' }),
  ).toBeVisible();
});
