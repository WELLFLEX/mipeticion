'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { cargarBorrador, limpiarBorrador, type Borrador } from '@/lib/peticion/storage';
import { getEntidad } from '@/lib/entidades';
import {
  EVENT_LABELS,
  caseStatus,
  type CaseRecord,
  type CaseEventInput,
} from '@/lib/tracking/model';
import { hoyEnColombia, toISODate } from '@/lib/legal/date-utils';
import { documentoATexto } from '@/lib/peticion/texto';
type User = { id: string; email: string; reminders: boolean };
async function api(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No pudimos completar la acción.');
  return data;
}
function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Tracker({ saveDraft }: { saveDraft: boolean }) {
  const [ready, setReady] = useState(false),
    [available, setAvailable] = useState(false),
    [user, setUser] = useState<User | null>(null);
  const [cases, setCases] = useState<CaseRecord[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [draft, setDraft] = useState<Borrador | null>(null);
  const [email, setEmail] = useState(''),
    [token, setToken] = useState(''),
    [sent, setSent] = useState(false),
    [consent, setConsent] = useState(false),
    [saveConsent, setSaveConsent] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [event, setEvent] = useState<CaseEventInput>({
    type: 'filed',
    date: toISODate(hoyEnColombia()),
    radicado: '',
    note: '',
  });
  const [draftId] = useState(() => crypto.randomUUID());
  const refresh = useCallback(async () => {
    const session = await api('/api/auth/session');
    setAvailable(session.available);
    setUser(session.user);
    if (session.user) setCases((await api('/api/cases')).cases);
    else setCases([]);
  }, []);
  useEffect(() => {
    let active = true;
    api('/api/auth/session')
      .then(async (session) => {
        const records = session.user ? (await api('/api/cases')).cases : [];
        if (active) {
          setAvailable(session.available);
          setUser(session.user);
          setCases(records);
          setDraft(cargarBorrador());
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setError('No pudimos cargar tu cuenta. Recarga la página para intentar de nuevo.');
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }
  const current = cases.find((c) => c.id === selected);
  function choose(c: CaseRecord) {
    setSelected(c.id);
    setEvent({
      type: c.current_filing_id ? 'note' : 'filed',
      date: toISODate(hoyEnColombia()),
      radicado: '',
      note: '',
    });
    setMessage('');
    setError('');
  }
  const status = current ? caseStatus(current) : null;
  return (
    <div className="stack" aria-busy={busy}>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {!ready ? (
        <p role="status">Cargando tu espacio privado…</p>
      ) : !available ? (
        <section className="panel">
          <h2>El seguimiento con cuenta está en preparación</h2>
          <p className="muted">
            Puedes preparar tu petición, descargarla y radicarla ahora. Guarda el documento y la
            constancia en un lugar seguro. Activaremos las cuentas cuando esté lista la
            configuración del piloto.
          </p>
          <div className="row" style={{ marginTop: 24 }}>
            <Link className="button" href="/crear">
              {draft?.documento ? 'Volver a mi borrador' : 'Crear una petición'}
            </Link>
            <Link className="button secondary" href="/guias">
              Cómo hacer seguimiento
            </Link>
          </div>
        </section>
      ) : !user ? (
        <section className="panel">
          <h2>Entra con un código en tu correo</h2>
          <p className="muted">
            La cuenta es opcional y gratuita. Tu borrador todavía no se guardará en una cuenta.
          </p>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                if (sent) {
                  await api('/api/auth/verify', 'POST', { email, token });
                  await refresh();
                  setMessage('Ya puedes guardar y seguir tus solicitudes.');
                } else {
                  await api('/api/auth/request', 'POST', { email, consent });
                  setSent(true);
                  setMessage('Revisa tu correo, incluida la carpeta de spam.');
                }
              });
            }}
          >
            <div>
              <label className="form-label" htmlFor="account-email">
                Correo electrónico
              </label>
              <input
                className="control"
                id="account-email"
                autoComplete="email"
                type="email"
                required
                maxLength={160}
                disabled={sent}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {sent ? (
              <div>
                <label className="form-label" htmlFor="otp">
                  Código del correo
                </label>
                <input
                  id="otp"
                  className="control"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6,10}"
                  maxLength={10}
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
            ) : (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  Autorizo el tratamiento de mi correo para crear y proteger mi cuenta según la{' '}
                  <Link href="/privacidad" className="text-link">
                    política de privacidad
                  </Link>
                  .
                </span>
              </label>
            )}
            <div className="row">
              <button className="button" disabled={busy}>
                {busy ? 'Un momento…' : sent ? 'Entrar a mi cuenta' : 'Enviar código'}
              </button>
              {sent && (
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setSent(false);
                    setToken('');
                  }}
                >
                  Solicitar otro código
                </button>
              )}
            </div>
          </form>
        </section>
      ) : (
        <>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <p className="muted">Tu espacio privado · {user.email}</p>
            <button
              className="text-link"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await api('/api/auth/logout', 'POST');
                  await refresh();
                  setSelected(null);
                })
              }
            >
              Cerrar sesión
            </button>
          </div>
          {saveDraft && draft?.documento && (
            <section className="panel">
              <h2>Guarda este borrador si lo deseas</h2>
              <p>
                <strong>{getEntidad(draft.entitySlug)?.nombreCorto}</strong> ·{' '}
                {draft.documento.asunto}
              </p>
              <p className="field-help">
                Se guardan tu documento y los datos que contiene en Supabase. Esto no radica la
                solicitud.
              </p>
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    const saved = await api('/api/cases', 'POST', {
                      id: draftId,
                      entitySlug: draft.entitySlug,
                      pathway: draft.pathway,
                      documento: draft.documento,
                      consent: saveConsent,
                    });
                    await refresh();
                    setSelected(saved.id);
                    setDraft(null);
                    setEvent({
                      type: 'filed',
                      date: toISODate(hoyEnColombia()),
                      radicado: '',
                      note: '',
                    });
                    setMessage(
                      'Guardaste tu borrador. Registra el radicado solo después de enviarlo por el canal oficial.',
                    );
                  });
                }}
              >
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    required
                    checked={saveConsent}
                    onChange={(e) => setSaveConsent(e.target.checked)}
                  />
                  Quiero guardar esta solicitud en mi cuenta. Entiendo la política de privacidad y
                  la eliminación por inactividad.
                </label>
                <button className="button" disabled={busy}>
                  Guardar en mi cuenta
                </button>
              </form>
            </section>
          )}
          {!current ? (
            <section className="stack">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h2>Mis solicitudes</h2>
                <Link href="/crear" className="button secondary">
                  Crear otra petición
                </Link>
              </div>
              {cases.length === 0 ? (
                <div className="panel">
                  <p>Todavía no has guardado solicitudes.</p>
                  <p className="muted">
                    Al terminar tu borrador, elige «Guardar y hacer seguimiento».
                  </p>
                </div>
              ) : (
                cases.map((c) => (
                  <button
                    type="button"
                    className="panel choice"
                    style={{ textAlign: 'left' }}
                    key={c.id}
                    onClick={() => choose(c)}
                  >
                    <div>
                      <span className="eyebrow">
                        {getEntidad(c.entity)?.nombreCorto ?? c.entity}
                      </span>
                      <h3 style={{ marginTop: 10 }}>
                        {c.document?.asunto ?? 'Solicitud anterior'}
                      </h3>
                      <p className="muted">{caseStatus(c).label}</p>
                    </div>
                    <span aria-hidden="true">→</span>
                  </button>
                ))
              )}
            </section>
          ) : (
            <section className="stack">
              <button
                className="text-link"
                style={{ alignSelf: 'start' }}
                onClick={() => setSelected(null)}
              >
                ← Todas mis solicitudes
              </button>
              <div className="panel">
                <span className="eyebrow">
                  {getEntidad(current.entity)?.nombreCorto ?? current.entity}
                </span>
                <h2 style={{ marginTop: 16 }}>
                  {current.document?.asunto ?? 'Solicitud anterior'}
                </h2>
                <div className="notice">
                  <strong>{status?.label}</strong>
                  <p>{status?.description}</p>
                </div>
                {current.current_filing_id && (
                  <p className="field-help">
                    Radicado registrado:{' '}
                    {
                      current.filings.find((f) => f.id === current.current_filing_id)
                        ?.radicado_number
                    }
                  </p>
                )}
                <div className="row" style={{ marginTop: 20 }}>
                  <Link
                    className="button secondary"
                    href={'/entidades/' + current.entity + '#radicar'}
                  >
                    Consultar canal oficial
                  </Link>
                  <button
                    className="button secondary"
                    onClick={() => download('mi-solicitud.json', JSON.stringify(current, null, 2))}
                  >
                    Exportar solicitud
                  </button>
                </div>
                {current.document && (
                  <details style={{ marginTop: 24 }}>
                    <summary>Ver mi documento</summary>
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit',
                        fontSize: 14,
                        lineHeight: 1.8,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {documentoATexto(current.document)}
                    </pre>
                  </details>
                )}
              </div>
              <form
                className="panel stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await api('/api/cases/' + current.id, 'POST', event);
                    await refresh();
                    setEvent({ ...event, type: 'note', note: '', radicado: '' });
                    setMessage('Novedad registrada. El estado refleja lo que tú has informado.');
                  });
                }}
              >
                <h2>{current.current_filing_id ? 'Registra una novedad' : '¿Ya la radicaste?'}</h2>
                <p className="muted">
                  Abrir el portal o descargar un PDF no significa que la entidad recibió tu
                  petición. Usa los datos de la constancia.
                </p>
                <div>
                  <label className="form-label" htmlFor="event-type">
                    Qué quieres registrar
                  </label>
                  <select
                    id="event-type"
                    className="control"
                    value={event.type}
                    onChange={(e) =>
                      setEvent({ ...event, type: e.target.value as CaseEventInput['type'] })
                    }
                  >
                    {Object.entries(EVENT_LABELS)
                      .filter(([key]) =>
                        current.current_filing_id
                          ? key !== 'filed'
                          : ['filed', 'note'].includes(key),
                      )
                      .map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" htmlFor="event-date">
                    {['filed', 'receipt_corrected'].includes(event.type)
                      ? 'Fecha de recepción confirmada por la entidad'
                      : 'Fecha de la novedad'}
                  </label>
                  <input
                    id="event-date"
                    type="date"
                    required
                    className="control"
                    min="2000-01-01"
                    max={toISODate(hoyEnColombia())}
                    value={event.date}
                    onChange={(e) => setEvent({ ...event, date: e.target.value })}
                  />
                </div>
                {['filed', 'receipt_corrected'].includes(event.type) && (
                  <div>
                    <label className="form-label" htmlFor="radicado">
                      Número de radicado de la constancia
                    </label>
                    <input
                      id="radicado"
                      className="control"
                      required
                      maxLength={120}
                      value={event.radicado}
                      onChange={(e) => setEvent({ ...event, radicado: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <label className="form-label" htmlFor="event-note">
                    Nota para ti (opcional)
                  </label>
                  <textarea
                    id="event-note"
                    className="control"
                    rows={3}
                    maxLength={2000}
                    value={event.note}
                    onChange={(e) => setEvent({ ...event, note: e.target.value })}
                  />
                </div>
                <button className="button" disabled={busy}>
                  {busy ? 'Guardando…' : 'Registrar novedad'}
                </button>
              </form>
              <section className="panel">
                <h2>Tu recorrido</h2>
                <ol className="timeline">
                  <li>
                    <strong>Borrador guardado</strong>
                    <p className="muted">{current.created_at.slice(0, 10)}</p>
                  </li>
                  {[...current.events]
                    .sort((a, b) => a.created_at.localeCompare(b.created_at))
                    .map((e) => (
                      <li key={e.id}>
                        <strong>{EVENT_LABELS[e.type] ?? 'Registro anterior'}</strong>
                        <p className="muted">
                          {e.occurred_on ?? e.created_at.slice(0, 10)}
                          {e.payload?.radicado ? ' · ' + e.payload.radicado : ''}
                        </p>
                        {e.payload?.note && (
                          <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                            {e.payload.note}
                          </p>
                        )}
                      </li>
                    ))}
                </ol>
              </section>
              <button
                className="text-link"
                onClick={() => {
                  if (
                    window.confirm(
                      '¿Eliminar esta solicitud y todas sus novedades? Esta acción no se puede deshacer.',
                    )
                  )
                    void run(async () => {
                      await api('/api/cases/' + current.id, 'DELETE');
                      setSelected(null);
                      await refresh();
                      setMessage('Solicitud eliminada de tu cuenta.');
                    });
                }}
              >
                Eliminar esta solicitud
              </button>
            </section>
          )}
          <section className="panel stack">
            <h2>Tu cuenta, bajo tu control</h2>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={user.reminders}
                disabled={busy}
                onChange={(e) => {
                  const reminders = e.target.checked;
                  const previous = user;
                  setUser({ ...user, reminders });
                  void run(async () => {
                    try {
                      await api('/api/account', 'PATCH', { reminders });
                      await refresh();
                    } catch (error) {
                      setUser(previous);
                      throw error;
                    }
                  });
                }}
              />
              Quiero recordatorios por correo para revisar mis solicitudes.
            </label>
            <p className="field-help">
              Los correos no incluyen entidades, radicados ni detalles de tu caso. Te avisaremos
              antes de eliminar solicitudes que lleven 12 meses sin actividad. Registrar una nota
              renueva su conservación.
            </p>
            <div className="row">
              <button
                className="button secondary"
                onClick={() =>
                  download(
                    'mipeticion-exportacion.json',
                    JSON.stringify({ account: user, cases }, null, 2),
                  )
                }
              >
                Exportar mis datos
              </button>
              <button
                className="text-link"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      '¿Eliminar tu cuenta y todas tus solicitudes? Esta acción no se puede deshacer.',
                    )
                  )
                    void run(async () => {
                      await api('/api/account', 'DELETE');
                      limpiarBorrador();
                      setDraft(null);
                      setSelected(null);
                      await refresh();
                      setMessage('Tu cuenta y tus solicitudes se eliminaron.');
                    });
                }}
              >
                Eliminar mi cuenta
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
