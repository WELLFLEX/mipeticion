'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  peticionDocumentSchema,
  type GenerateResponse,
  type PeticionDocument,
} from '@/lib/schema/peticion';
import { documentoATexto } from '@/lib/peticion/texto';
import { LEGAL_SOURCE } from '@/lib/legal/rules';
import { EditableList } from './EditableList';
export function PeticionPreview({
  documento,
  meta,
  onChange,
  onEditarDatos,
  onRadicar,
}: {
  documento: PeticionDocument;
  meta: GenerateResponse['meta'] | null;
  onChange: (d: PeticionDocument) => void;
  onEditarDatos: () => void;
  onRadicar: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  function validated() {
    const result = peticionDocumentSchema.safeParse(documento);
    if (!result.success) {
      setError(
        'Revisa los campos: cada hecho y petición debe tener texto, y el correo debe ser válido.',
      );
      return null;
    }
    setError('');
    return result.data;
  }
  async function download() {
    const doc = validated();
    if (!doc) return;
    setBusy(true);
    try {
      const r = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento: doc }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) throw new Error('PDF');
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'peticion-' + (meta?.entitySlug ?? 'documento') + '.pdf';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage('PDF descargado. Recuerda enviarlo por el canal oficial.');
    } catch {
      setError('No pudimos preparar el PDF. Puedes copiar el texto o volver a intentarlo.');
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    const doc = validated();
    if (!doc) return;
    try {
      await navigator.clipboard.writeText(documentoATexto(doc));
      setMessage('Texto copiado.');
    } catch {
      setError('Tu navegador no permite copiar automáticamente. Descarga el PDF.');
    }
  }
  return (
    <div className="stack">
      <div className="notice">
        <strong>
          {meta?.proveedor === 'anthropic' ? 'Borrador con ayuda de IA' : 'Borrador con plantilla'}
        </strong>
        <p>
          {meta?.fallbackReason ??
            'Comprueba que el documento diga exactamente lo que quieres solicitar. Puedes editar los hechos y las peticiones.'}
        </p>
        {meta?.proveedor === 'legacy' && (
          <p>
            Este borrador viene de la versión anterior. Revisa sus fundamentos y plazos antes de
            usarlo.
          </p>
        )}
      </div>
      <details open>
        <summary className="form-label" style={{ cursor: 'pointer' }}>
          En palabras sencillas
        </summary>
        <p className="muted" style={{ fontSize: 14 }}>
          Diriges tu solicitud a {documento.destinatario.entidad}. Solicitas:
        </p>
        <ul style={{ paddingLeft: 20, listStyle: 'disc', fontSize: 14 }}>
          {documento.peticiones.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </details>
      <div className="row">
        <button className="button" onClick={download} disabled={busy}>
          {busy ? 'Preparando PDF…' : 'Descargar PDF'}
        </button>
        <button className="button secondary" onClick={copy}>
          Copiar texto
        </button>
        <button className="text-link" onClick={onEditarDatos}>
          Editar mis datos
        </button>
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <p className="field-help">
        {documento.ciudadFecha} · {documento.destinatario.entidad}
      </p>
      <div>
        <label htmlFor="asunto" className="form-label">
          Asunto
        </label>
        <input
          id="asunto"
          className="control"
          value={documento.asunto}
          maxLength={240}
          onChange={(e) => onChange({ ...documento, asunto: e.target.value })}
        />
      </div>
      <EditableList
        title="Hechos"
        singular="Hecho"
        items={documento.hechos}
        onChange={(hechos) => onChange({ ...documento, hechos })}
      />
      <EditableList
        title="Peticiones"
        singular="Petición"
        items={documento.peticiones}
        onChange={(peticiones) => onChange({ ...documento, peticiones })}
      />
      <details>
        <summary className="form-label" style={{ cursor: 'pointer' }}>
          Fundamentos y solicitud de respuesta
        </summary>
        <div className="field-help">
          {documento.fundamentos.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p>{documento.solicitudRespuestaTermino}</p>
          <a href={LEGAL_SOURCE} target="_blank" rel="noreferrer" className="text-link">
            Consultar la fuente legal ↗
          </a>
        </div>
      </details>
      <p className="field-help">
        Firma: {documento.firma.nombre}. Notificaciones: {documento.notificacion.correo}.
      </p>
      <div className="notice warning">
        Descargar este documento no lo envía. Revisa la guía para radicarlo y conserva la constancia
        que entrega la entidad.
      </div>
      <div className="row">
        <button
          className="button"
          onClick={() => {
            if (validated()) onRadicar();
          }}
        >
          Ver cómo radicar mi petición →
        </button>
        <Link className="text-link" href="/mis-solicitudes?guardar=1">
          Guardar en mi cuenta
        </Link>
      </div>
    </div>
  );
}
