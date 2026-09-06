import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { getEntidad } from '../../src/lib/entidades';
import { ensamblarPeticion } from '../../src/lib/peticion/ensamblar';
import { TemplateProvider } from '../../src/lib/llm/template';
import type { CaseRecord } from '../../src/lib/tracking/model';
test('account UI contract: failed code, explicit save, filing, exception, export and deletion', async ({
  page,
}) => {
  let loggedIn = false,
    reminders = false;
  const records: CaseRecord[] = [];
  let authRequests = 0,
    deletedAccount = false;
  const input = {
    quePaso: 'Presenté una solicitud al SENA y quiero saber cómo va.',
    quePides: 'Solicito conocer el estado de mi trámite.',
    entitySlug: 'sena',
    pathway: 'estado' as const,
    mode: 'template' as const,
    aceptaVeracidad: true as const,
    aceptaTratamientoDatos: true as const,
  };
  const entity = getEntidad('sena')!;
  const documento = ensamblarPeticion({
    input: {
      ...input,
      peticionario: {
        nombre: 'Persona Sintética',
        docType: 'CC',
        docNumber: 'SYNTHETIC-123',
        correo: 'prueba@example.com',
        ciudad: 'Bogotá',
        direccionNotificacion: '',
      },
    },
    content: await new TemplateProvider().generarContenido({ input, entity }),
    ciudadFecha: 'Bogotá, 6 de septiembre de 2026',
  });
  await page.addInitScript(
    (draft) => sessionStorage.setItem('mipeticion:borrador:v2', JSON.stringify(draft)),
    { version: 2, actualizado: new Date().toISOString(), persistent: false, ...input, documento },
  );
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname,
      method = req.method(),
      body = method === 'GET' || method === 'DELETE' ? null : req.postDataJSON();
    const respond = (data: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (path === '/api/auth/session')
      return respond({
        available: true,
        user: loggedIn ? { id: 'synthetic-user', email: 'prueba@example.com', reminders } : null,
      });
    if (path === '/api/auth/request') {
      expect(body.consent).toBe(true);
      authRequests++;
      return respond({ ok: true });
    }
    if (path === '/api/auth/verify') {
      if (body.token === '000000')
        return respond({ error: 'El código no es válido o expiró.' }, 401);
      loggedIn = true;
      return respond({ ok: true });
    }
    if (path === '/api/cases') {
      if (method === 'GET') return respond({ cases: records });
      expect(body.consent).toBe(true);
      expect(body.documento.peticionario.nombre).toBe('Persona Sintética');
      records.push({
        id: body.id,
        entity: body.entitySlug,
        pathway: body.pathway,
        document: body.documento,
        current_filing_id: null,
        estimate_state: 'not_filed',
        last_activity_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        filings: [],
        events: [],
      });
      return respond({ id: body.id }, 201);
    }
    if (path.startsWith('/api/cases/')) {
      const c = records[0];
      expect(c).toBeTruthy();
      if (method === 'DELETE') {
        records.splice(0);
        return respond({ ok: true });
      }
      c.events.push({
        id: crypto.randomUUID(),
        type: body.type,
        occurred_on: body.date,
        payload: { note: body.note, radicado: body.radicado },
        created_at: new Date().toISOString(),
      });
      if (body.type === 'filed') {
        c.current_filing_id = 'filing';
        c.estimate_state = 'estimated';
        c.filings = [
          {
            id: 'filing',
            filed_date: body.date,
            radicado_number: body.radicado,
            due_date: '2026-08-10',
            legal_term_days: 15,
          },
        ];
      } else if (body.type === 'extended') c.estimate_state = 'uncertain';
      return respond({ ok: true });
    }
    if (path === '/api/account') {
      if (method === 'DELETE') {
        loggedIn = false;
        deletedAccount = true;
        return respond({ ok: true });
      }
      reminders = body.reminders;
      return respond({ ok: true });
    }
    return respond({ error: 'Unexpected test request ' + path }, 500);
  });
  await page.goto('/mis-solicitudes?guardar=1');
  await page.getByLabel('Correo electrónico', { exact: true }).fill('prueba@example.com');
  await page.getByRole('checkbox', { name: /Autorizo el tratamiento de mi correo/ }).check();
  await page.getByRole('button', { name: 'Enviar código' }).click();
  expect(authRequests).toBe(1);
  await page.getByLabel('Código del correo').fill('000000');
  await page.getByRole('button', { name: 'Entrar a mi cuenta' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('no es válido');
  await page.getByLabel('Código del correo').fill('123456');
  await page.getByRole('button', { name: 'Entrar a mi cuenta' }).click();
  await expect(
    page.getByRole('heading', { name: 'Guarda este borrador si lo deseas' }),
  ).toBeVisible();
  expect(records).toHaveLength(0);
  await page.getByRole('checkbox', { name: /Quiero guardar esta solicitud/ }).check();
  await page.getByRole('button', { name: 'Guardar en mi cuenta' }).click();
  await expect(page.getByText('Pendiente de radicar', { exact: true })).toBeVisible();
  expect(records).toHaveLength(1);
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .exclude('nextjs-portal')
    .analyze();
  expect(scan.violations).toEqual([]);
  await page.getByLabel('Fecha de recepción confirmada').fill('2026-07-16');
  await page.getByLabel('Número de radicado').fill('SYNTHETIC-001');
  await page.getByRole('button', { name: 'Registrar novedad' }).click();
  await expect(page.getByText(/Fecha estimada de respuesta/)).toBeVisible();
  await page.getByLabel('Qué quieres registrar').selectOption('extended');
  await page.getByLabel('Fecha de la novedad').fill('2026-07-20');
  await page
    .getByLabel('Nota para ti')
    .fill('La entidad informó una ampliación; revisar la comunicación.');
  await page.getByRole('button', { name: 'Registrar novedad' }).click();
  await expect(page.getByText('El plazo necesita revisión', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: /Quiero recordatorios/ }).check();
  await expect.poll(() => reminders).toBe(true);
  const exportEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar solicitud', exact: true }).click();
  expect((await exportEvent).suggestedFilename()).toBe('mi-solicitud.json');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Eliminar esta solicitud', exact: true }).click();
  await expect(page.getByText('Todavía no has guardado solicitudes.')).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Eliminar mi cuenta', exact: true }).click();
  await expect.poll(() => deletedAccount).toBe(true);
});
