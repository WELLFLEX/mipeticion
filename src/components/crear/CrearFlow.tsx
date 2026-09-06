'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ENTIDADES, getEntidad, getRuta, type RutaId } from '@/lib/entidades';
import { analizarRelato, narrativeSchema, type Analysis } from '@/lib/intake/analyze';
import {
  cargarBorrador,
  guardarBorrador,
  limpiarBorrador,
  type Borrador,
} from '@/lib/peticion/storage';
import {
  contentResponseSchema,
  peticionarioSchema,
  type Peticionario,
} from '@/lib/schema/peticion';
import { ensamblarPeticion } from '@/lib/peticion/ensamblar';
import { hoyEnColombia, formatFechaLarga } from '@/lib/legal/date-utils';
import { PeticionPreview } from '@/components/preview/PeticionPreview';
import { FilingGuide } from '@/components/entities/FilingGuide';
import { Icon } from '@/components/Icon';
const EMPTY: Peticionario = {
  nombre: '',
  docType: 'CC',
  docNumber: '',
  correo: '',
  ciudad: '',
  direccionNotificacion: '',
};
export function CrearFlow({
  initialEntity = '',
  initialPathway = 'informacion',
}: {
  initialEntity?: string;
  initialPathway?: RutaId;
}) {
  const [draft, setDraft] = useState<Borrador>({
    version: 2,
    actualizado: new Date(0).toISOString(),
    persistent: false,
    quePaso: '',
    quePides: '',
    entitySlug: initialEntity,
    pathway: initialPathway,
    mode: 'template',
  });
  const [ready, setReady] = useState(false),
    [step, setStep] = useState(0),
    [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [consent, setConsent] = useState(false),
    [storageWarning, setStorageWarning] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const stored = cargarBorrador();
    /* eslint-disable react-hooks/set-state-in-effect -- Restore a browser-only draft after hydration. */
    if (stored) {
      setDraft(stored);
      if (stored.documento) setStep(4);
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => setStorageWarning(!guardarBorrador(draft)), 250);
    return () => clearTimeout(timer);
  }, [draft, ready]);
  useEffect(() => {
    if (ready) {
      titleRef.current?.focus();
    }
  }, [step, ready]);
  const entity = getEntidad(draft.entitySlug),
    identity = { ...EMPTY, ...draft.identificacion };
  const patch = (values: Partial<Borrador>) =>
    setDraft((d) => ({ ...d, ...values, actualizado: new Date().toISOString() }));
  const narrativePatch = (values: Partial<Borrador>) => {
    patch({ ...values, documento: undefined, meta: undefined });
    setConfirmed(false);
  };
  function back() {
    setError('');
    setStep(Math.max(0, step - 1));
  }
  function reviewRoute() {
    const parsed = narrativeSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    const result = analizarRelato(parsed.data);
    setAnalysis(result);
    patch({
      entitySlug:
        initialEntity ||
        (result.candidates.length === 1 ? result.candidates[0].entitySlug : draft.entitySlug),
      pathway: result.pathway ?? draft.pathway,
    });
    setError('');
    setStep(2);
  }
  async function generate() {
    const parsed = peticionarioSchema.safeParse(identity);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (!entity || !confirmed || !consent) {
      setError('Confirma la entidad y la autorización para continuar.');
      setStep(2);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const input = {
        quePaso: draft.quePaso,
        quePides: draft.quePides,
        entitySlug: entity.slug,
        pathway: draft.pathway,
        mode: draft.mode,
        aceptaVeracidad: true as const,
        aceptaTratamientoDatos: true as const,
      };
      const response = draft.documento
        ? Response.json({
            content: {
              asunto: draft.documento.asunto,
              hechos: draft.documento.hechos,
              peticiones: draft.documento.peticiones,
            },
            meta: draft.meta,
          })
        : await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
            signal: AbortSignal.timeout(35_000),
          });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'No pudimos preparar el documento.');
      const generated = contentResponseSchema.parse(result);
      const content = draft.documento
        ? {
            asunto: draft.documento.asunto,
            saludo: draft.documento.saludo,
            cuerpoIntro: draft.documento.cuerpoIntro,
            hechos: draft.documento.hechos,
            peticiones: draft.documento.peticiones,
          }
        : generated.content;
      const meta = draft.documento ? draft.meta : generated.meta;
      const documento = ensamblarPeticion({
        input: { ...input, peticionario: parsed.data },
        content,
        ciudadFecha: parsed.data.ciudad + ', ' + formatFechaLarga(hoyEnColombia()),
      });
      patch({ documento, meta, identificacion: parsed.data });
      setStep(4);
    } catch (err) {
      setError(
        err instanceof Error && err.name !== 'TimeoutError'
          ? err.message
          : 'La respuesta tardó demasiado. Puedes volver a intentarlo con la plantilla sin IA.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function askRoutingAi() {
    if (!consent) {
      setError('Autoriza el tratamiento del relato antes de pedir ayuda de IA.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quePaso: draft.quePaso,
          quePides: draft.quePides,
          useAi: true,
          consent: true,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAnalysis(result);
      setConfirmed(false);
      patch({
        entitySlug:
          result.candidates.length === 1 ? result.candidates[0].entitySlug : draft.entitySlug,
        pathway: result.pathway ?? draft.pathway,
        documento: undefined,
        meta: undefined,
      });
    } catch {
      setError(
        'No pudimos obtener ayuda de IA. Puedes elegir la entidad y la ruta con el directorio.',
      );
    } finally {
      setBusy(false);
    }
  }
  const stage = step < 2 ? 0 : step === 2 ? 1 : step < 5 ? 2 : 3;
  return (
    <>
      <ol className="flow-progress" aria-label="Tu progreso">
        {['Cuéntanos', 'Entidad', 'Revisa', 'Radica', 'Seguimiento'].map((label, i) => (
          <li
            key={label}
            className={i <= stage ? 'active' : ''}
            aria-current={i === stage ? 'step' : undefined}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>
      {!ready ? (
        <div className="panel" role="status">
          Preparando tu espacio…
        </div>
      ) : (
        <>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 20 }}>
            <span className="field-help">
              {draft.persistent
                ? 'Borrador en este dispositivo · 7 días'
                : 'Borrador privado en esta pestaña'}
            </span>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draft.persistent}
                onChange={(e) => patch({ persistent: e.target.checked })}
              />{' '}
              Recordarlo en este dispositivo
            </label>
          </div>
          {draft.persistent && (
            <p className="field-help">
              Evita esta opción en computadores compartidos. Se elimina tras 7 días sin editar.
            </p>
          )}
          {storageWarning && (
            <p className="notice warning" role="status">
              Tu navegador no permite guardar el borrador. Mantén abierta esta página y descarga tu
              documento antes de salir.
            </p>
          )}
          <section className="panel" aria-busy={busy}>
            {step === 0 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (draft.quePaso.trim().length < 20) {
                    setError('Cuéntanos al menos 20 caracteres para entender tu caso.');
                    return;
                  }
                  setError('');
                  setStep(1);
                }}
              >
                <p className="eyebrow">Empecemos por tu historia</p>
                <h2 ref={titleRef} tabIndex={-1} style={{ marginTop: 16 }}>
                  ¿Qué pasó?
                </h2>
                <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
                  Cuéntanos con tus palabras. Menciona la entidad y lo que ocurrió. Por ahora, omite
                  nombres completos, documentos y otros datos privados.
                </p>
                <label className="form-label" htmlFor="quePaso">
                  Tu situación
                </label>
                <textarea
                  id="quePaso"
                  className="control"
                  rows={6}
                  value={draft.quePaso}
                  minLength={20}
                  maxLength={4000}
                  required
                  aria-describedby="story-help"
                  onChange={(e) => narrativePatch({ quePaso: e.target.value })}
                  placeholder="Por ejemplo: presenté una solicitud en el SENA hace un mes y todavía no sé en qué va…"
                />
                <p className="field-help" id="story-help">
                  No necesitas lenguaje legal. {draft.quePaso.length}/4000 caracteres.
                </p>
                <details style={{ marginTop: 20, fontSize: 13 }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--brand)' }}>
                    Ver un ejemplo para empezar
                  </summary>
                  <div className="stack" style={{ marginTop: 12 }}>
                    {ENTIDADES.map((e) => (
                      <button
                        key={e.slug}
                        type="button"
                        className="choice"
                        style={{ textAlign: 'left' }}
                        onClick={() => narrativePatch({ quePaso: e.ejemplo })}
                      >
                        {e.ejemplo}
                      </button>
                    ))}
                  </div>
                </details>
                <div className="flow-actions">
                  <span className="field-help">Sin cuenta. A tu ritmo.</span>
                  <button className="button" type="submit">
                    Continuar <Icon size={17} />
                  </button>
                </div>
              </form>
            )}
            {step === 1 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  reviewRoute();
                }}
              >
                <h2 ref={titleRef} tabIndex={-1}>
                  ¿Qué necesitas que hagan?
                </h2>
                <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
                  Dinos qué respuesta, información o aclaración estás buscando.
                </p>
                <label className="form-label" htmlFor="quePides">
                  Lo que solicitas
                </label>
                <textarea
                  id="quePides"
                  className="control"
                  rows={5}
                  required
                  minLength={10}
                  maxLength={2000}
                  value={draft.quePides}
                  onChange={(e) => narrativePatch({ quePides: e.target.value })}
                  placeholder="Quiero que me informen en qué estado está mi solicitud y qué paso sigue."
                />
                <p className="field-help">Sé concreto: ¿qué te ayudaría a avanzar?</p>
                <div className="flow-actions">
                  <button type="button" className="button secondary" onClick={back}>
                    Volver
                  </button>
                  <button type="submit" className="button">
                    Encontrar mi ruta <Icon size={17} />
                  </button>
                </div>
              </form>
            )}
            {step === 2 && (
              <>
                <h2 ref={titleRef} tabIndex={-1}>
                  {analysis?.status === 'referral'
                    ? 'Tu caso necesita otra ruta'
                    : 'Confirmemos a quién dirigirte'}
                </h2>
                {analysis?.status === 'referral' ? (
                  <div className="stack">
                    <div className="notice warning">
                      <strong>{analysis.referral?.title}</strong>
                      <p>{analysis.referral?.description}</p>
                    </div>
                    <a
                      className="button"
                      href={analysis.referral?.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Consultar orientación oficial <Icon name="external" size={16} />
                    </a>
                    <button className="button secondary" onClick={back}>
                      Revisar mi relato
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!entity || !confirmed || !consent) {
                        setError(
                          'Selecciona y confirma la entidad, y acepta el tratamiento para preparar el documento.',
                        );
                        return;
                      }
                      setError('');
                      setStep(3);
                    }}
                  >
                    {analysis?.notice && (
                      <p className="notice" role="status">
                        {analysis.notice}
                      </p>
                    )}
                    {analysis?.questions.map((q) => (
                      <p key={q} className="muted">
                        {q}
                      </p>
                    ))}
                    {analysis?.candidates.length === 1 && (
                      <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>
                        {analysis.candidates[0].reason}
                      </p>
                    )}
                    <div className="stack">
                      <div>
                        <label htmlFor="entidad" className="form-label">
                          Entidad
                        </label>
                        <select
                          id="entidad"
                          className="control"
                          required
                          value={draft.entitySlug}
                          onChange={(e) => {
                            narrativePatch({ entitySlug: e.target.value });
                          }}
                        >
                          <option value="">Selecciona una entidad</option>
                          {ENTIDADES.map((e) => (
                            <option key={e.slug} value={e.slug}>
                              {e.nombreCorto}
                            </option>
                          ))}
                        </select>
                        <Link href="/entidades" className="text-link">
                          No encuentro la entidad →
                        </Link>
                      </div>
                      {entity && (
                        <>
                          <div className="notice">
                            <strong>Antes de preparar una petición</strong>
                            <p>{entity.tramiteDirecto.descripcion}</p>
                            <a
                              className="text-link"
                              href={entity.tramiteDirecto.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Revisar el portal oficial ↗
                            </a>
                          </div>
                          <fieldset>
                            <legend className="form-label">
                              ¿Cuál de estas opciones describe tu solicitud?
                            </legend>
                            <div className="choice-grid">
                              {entity.rutas.map((r) => (
                                <label key={r.id} className="choice">
                                  <input
                                    type="radio"
                                    name="pathway"
                                    value={r.id}
                                    checked={draft.pathway === r.id}
                                    onChange={() => narrativePatch({ pathway: r.id })}
                                  />
                                  <div>
                                    <strong>{r.titulo}</strong>
                                    <span>{r.orientacion}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </fieldset>
                          <p className="field-help">
                            Ten a mano: {getRuta(entity, draft.pathway).requisitos.join('; ')}. No
                            inventes información que no conoces.
                          </p>
                          <a
                            href={entity.fuentes[0].url}
                            className="text-link"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Fuente: {entity.fuentes[0].titulo} ↗
                          </a>
                        </>
                      )}
                      <fieldset>
                        <legend className="form-label">¿Cómo quieres preparar el borrador?</legend>
                        <div className="choice-grid">
                          <label className="choice">
                            <input
                              type="radio"
                              name="mode"
                              checked={draft.mode === 'template'}
                              onChange={() => {
                                patch({ mode: 'template' });
                                setConsent(false);
                              }}
                            />
                            <div>
                              <strong>Plantilla sin IA</strong>
                              <span>
                                Organiza tus palabras sin enviarlas a un proveedor de inteligencia
                                artificial.
                              </span>
                            </div>
                          </label>
                          <label className="choice">
                            <input
                              type="radio"
                              name="mode"
                              checked={draft.mode === 'ai'}
                              onChange={() => {
                                patch({ mode: 'ai' });
                                setConsent(false);
                              }}
                            />
                            <div>
                              <strong>Ayuda de IA para redactar</strong>
                              <span>
                                Anthropic recibe el relato y lo que solicitas. Revisa el texto
                                antes: podría contener datos personales.
                              </span>
                            </div>
                          </label>
                        </div>
                      </fieldset>
                      {draft.mode === 'ai' && (
                        <button
                          type="button"
                          className="button secondary"
                          disabled={busy || !consent}
                          onClick={() => void askRoutingAi()}
                        >
                          {busy
                            ? 'Revisando tu relato…'
                            : 'Pedir ayuda de IA para identificar mi ruta'}
                        </button>
                      )}
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          required
                          checked={confirmed}
                          onChange={(e) => setConfirmed(e.target.checked)}
                        />
                        Confirmo la entidad y el tipo de solicitud. Presento esta solicitud para mí
                        y revisaré que los hechos sean veraces.
                      </label>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          required
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                        />
                        <span>
                          Autorizo el tratamiento necesario para preparar el documento según la{' '}
                          <Link href="/privacidad" style={{ textDecoration: 'underline' }}>
                            política de privacidad
                          </Link>
                          {draft.mode === 'ai' ? ', incluido el envío del relato a Anthropic' : ''}.
                        </span>
                      </label>
                    </div>
                    <div className="flow-actions">
                      <button type="button" className="button secondary" onClick={back}>
                        Volver
                      </button>
                      <button type="submit" className="button">
                        Continuar <Icon size={17} />
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
            {step === 3 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void generate();
                }}
              >
                <h2 ref={titleRef} tabIndex={-1}>
                  Ahora, los datos de tu documento
                </h2>
                <div className="notice" style={{ marginBottom: 24 }}>
                  <strong>Tu solicitud a {entity?.nombreCorto}</strong>
                  <p>{draft.quePides}</p>
                </div>
                <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
                  Estos datos se incorporan en tu navegador. No se envían a la IA. El servidor los
                  procesa al descargar el PDF; solo se guardan en una cuenta si tú lo decides.
                </p>
                <div className="stack">
                  {[
                    { id: 'nombre', label: 'Nombre completo', auto: 'name' },
                    { id: 'docNumber', label: 'Número de documento', auto: 'off' },
                    {
                      id: 'ciudad',
                      label: 'Ciudad desde donde presentas la solicitud',
                      auto: 'address-level2',
                    },
                    { id: 'correo', label: 'Correo para recibir la respuesta', auto: 'email' },
                    {
                      id: 'direccionNotificacion',
                      label: 'Dirección de notificación (opcional)',
                      auto: 'street-address',
                    },
                  ].map((f) => (
                    <div key={f.id}>
                      <label className="form-label" htmlFor={f.id}>
                        {f.label}
                      </label>
                      {f.id === 'docNumber' && (
                        <>
                          <label className="form-label" htmlFor="docType">
                            Tipo de documento
                          </label>
                          <select
                            id="docType"
                            className="control"
                            style={{ marginBottom: 12 }}
                            value={identity.docType}
                            onChange={(e) =>
                              patch({
                                identificacion: {
                                  ...identity,
                                  docType: e.target.value as Peticionario['docType'],
                                },
                              })
                            }
                          >
                            <option value="CC">Cédula de ciudadanía</option>
                            <option value="CE">Cédula de extranjería</option>
                            <option value="PASAPORTE">Pasaporte</option>
                          </select>
                        </>
                      )}
                      <input
                        id={f.id}
                        className="control"
                        type={f.id === 'correo' ? 'email' : 'text'}
                        autoComplete={f.auto}
                        required={f.id !== 'direccionNotificacion'}
                        maxLength={f.id === 'docNumber' ? 40 : f.id === 'ciudad' ? 80 : 160}
                        value={identity[f.id as keyof Peticionario]}
                        onChange={(e) =>
                          patch({ identificacion: { ...identity, [f.id]: e.target.value } })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="flow-actions">
                  <button type="button" className="button secondary" onClick={back} disabled={busy}>
                    Volver
                  </button>
                  <button type="submit" className="button" disabled={busy}>
                    {busy ? 'Preparando tu borrador…' : 'Preparar mi borrador'}{' '}
                    {!busy && <Icon size={17} />}
                  </button>
                </div>
              </form>
            )}
            {step === 4 && draft.documento && (
              <>
                <h2 ref={titleRef} tabIndex={-1}>
                  Tu petición, lista para revisar
                </h2>
                <PeticionPreview
                  documento={draft.documento}
                  meta={draft.meta ?? null}
                  onChange={(documento) => patch({ documento })}
                  onEditarDatos={() => {
                    setStep(3);
                    setConfirmed(true);
                    setConsent(true);
                  }}
                  onRadicar={() => setStep(5)}
                />
              </>
            )}
            {step === 5 && entity && (
              <>
                <h2 ref={titleRef} tabIndex={-1}>
                  El siguiente paso: radicar
                </h2>
                <FilingGuide entity={entity} />
                <div className="flow-actions">
                  <button className="button secondary" onClick={() => setStep(4)}>
                    Volver al documento
                  </button>
                  <Link className="button" href="/mis-solicitudes?guardar=1">
                    Guardar y seguir mi solicitud
                  </Link>
                </div>
              </>
            )}
            {error && (
              <p className="notice error" style={{ marginTop: 20 }} role="alert">
                {error}
              </p>
            )}
          </section>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 15 }}>
            <p className="field-help">Tú revisas y radicas. No somos una entidad pública.</p>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                if (window.confirm('¿Borrar este borrador y empezar de nuevo?')) {
                  limpiarBorrador();
                  setDraft({
                    version: 2,
                    actualizado: new Date().toISOString(),
                    persistent: false,
                    quePaso: '',
                    quePides: '',
                    entitySlug: '',
                    pathway: 'informacion',
                    mode: 'template',
                  });
                  setStep(0);
                  setAnalysis(null);
                  setConfirmed(false);
                  setConsent(false);
                  setError('');
                }
              }}
            >
              Borrar borrador
            </button>
          </div>
        </>
      )}
    </>
  );
}
