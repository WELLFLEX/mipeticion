/**
 * Renderiza el documento estructurado a texto plano, para "copiar texto" y como
 * base compartida con el PDF.
 */
import { docTypeLabel } from '@/lib/legal/constants';
import type { PeticionDocument } from '@/lib/schema/peticion';

export function documentoATexto(doc: PeticionDocument): string {
  const p = doc.peticionario;
  const L: string[] = [];

  L.push(doc.ciudadFecha);
  L.push('');
  L.push('Señores');
  L.push(doc.destinatario.entidad.toUpperCase());
  if (doc.destinatario.dependencia) L.push(doc.destinatario.dependencia);
  if (doc.destinatario.ciudad) L.push(doc.destinatario.ciudad);
  L.push('');
  L.push(`Asunto: ${doc.asunto}`);
  L.push('');
  if (doc.saludo) {
    L.push(doc.saludo);
    L.push('');
  }
  L.push(
    `Yo, ${p.nombre}, identificado(a) con ${docTypeLabel(p.docType)} No. ${p.docNumber}` +
      (p.ciudad ? `, con domicilio en ${p.ciudad}` : '') +
      ', en ejercicio del derecho fundamental de petición, me permito presentar la siguiente solicitud.',
  );
  if (doc.cuerpoIntro) {
    L.push('');
    L.push(doc.cuerpoIntro);
  }
  L.push('');
  L.push('HECHOS');
  doc.hechos.forEach((h, i) => L.push(`${i + 1}. ${h}`));
  L.push('');
  L.push('FUNDAMENTOS DE DERECHO');
  doc.fundamentos.forEach((f, i) => L.push(`${i + 1}. ${f}`));
  L.push('');
  L.push('PETICIONES');
  doc.peticiones.forEach((pe, i) => L.push(`${i + 1}. ${pe}`));
  L.push('');
  L.push(doc.solicitudRespuestaTermino);
  L.push('');
  L.push('NOTIFICACIONES');
  if (doc.notificacion.direccion) L.push(`Dirección: ${doc.notificacion.direccion}`);
  if (doc.notificacion.correo) L.push(`Correo electrónico: ${doc.notificacion.correo}`);
  L.push('');
  L.push('Atentamente,');
  L.push('');
  L.push('');
  L.push('_______________________________');
  L.push(doc.firma.nombre);
  L.push(doc.firma.documento);

  return L.join('\n');
}
