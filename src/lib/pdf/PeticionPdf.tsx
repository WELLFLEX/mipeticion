/**
 * Documento PDF del derecho de petición (server-only, @react-pdf/renderer).
 * Usa Helvetica (incluida) que soporta acentos y ñ.
 */
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { DISCLAIMER, docTypeLabel } from '@/lib/legal/constants';
import type { PeticionDocument } from '@/lib/schema/peticion';

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 70,
    paddingHorizontal: 64,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#111827',
    lineHeight: 1.45,
  },
  right: { textAlign: 'right', color: '#374151' },
  bold: { fontFamily: 'Helvetica-Bold' },
  gap8: { marginBottom: 8 },
  gap12: { marginBottom: 12 },
  entidad: { fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  heading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    marginTop: 14,
    marginBottom: 5,
  },
  justify: { textAlign: 'justify' },
  item: { flexDirection: 'row', marginBottom: 4 },
  num: { width: 20, fontFamily: 'Helvetica-Bold' },
  itemText: { flex: 1, textAlign: 'justify' },
  termino: {
    marginTop: 12,
    marginBottom: 12,
    textAlign: 'justify',
  },
  firmaLinea: { marginTop: 36, borderTopWidth: 1, borderTopColor: '#111827', width: 220 },
  firmaNombre: { fontFamily: 'Helvetica-Bold', marginTop: 2 },
  muted: { color: '#6b7280' },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 64,
    right: 64,
    fontSize: 7.5,
    color: '#9ca3af',
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
  },
});

function Numbered({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((t, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.num}>{i + 1}.</Text>
          <Text style={styles.itemText}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

export function PeticionPdf({ documento }: { documento: PeticionDocument }) {
  const p = documento.peticionario;
  const encabezado =
    `Yo, ${p.nombre}, identificado(a) con ${docTypeLabel(p.docType)} No. ${p.docNumber}` +
    (p.ciudad ? `, con domicilio en ${p.ciudad}` : '') +
    ', en ejercicio del derecho fundamental de petición, me permito presentar la siguiente solicitud.';

  return (
    <Document
      title={`Derecho de petición — ${p.nombre}`}
      author={p.nombre}
      subject={documento.asunto}
    >
      <Page size="LETTER" style={styles.page}>
        <Text style={[styles.right, styles.gap12]}>{documento.ciudadFecha}</Text>

        <View style={styles.gap12}>
          <Text>Señores</Text>
          <Text style={styles.entidad}>{documento.destinatario.entidad}</Text>
          {documento.destinatario.dependencia ? (
            <Text>{documento.destinatario.dependencia}</Text>
          ) : null}
          {documento.destinatario.ciudad ? (
            <Text style={styles.muted}>{documento.destinatario.ciudad}</Text>
          ) : null}
        </View>

        <Text style={styles.gap12}>
          <Text style={styles.bold}>Asunto: </Text>
          {documento.asunto}
        </Text>

        {documento.saludo ? <Text style={styles.gap8}>{documento.saludo}</Text> : null}

        <Text style={[styles.justify, styles.gap8]}>{encabezado}</Text>
        {documento.cuerpoIntro ? (
          <Text style={[styles.justify, styles.gap8]}>{documento.cuerpoIntro}</Text>
        ) : null}

        <Text style={styles.heading}>HECHOS</Text>
        <Numbered items={documento.hechos} />

        <Text style={styles.heading}>FUNDAMENTOS DE DERECHO</Text>
        <Numbered items={documento.fundamentos} />

        <Text style={styles.heading}>PETICIONES</Text>
        <Numbered items={documento.peticiones} />

        <Text style={styles.termino}>{documento.solicitudRespuestaTermino}</Text>

        <Text style={styles.heading}>NOTIFICACIONES</Text>
        {documento.notificacion.direccion ? (
          <Text>Dirección: {documento.notificacion.direccion}</Text>
        ) : null}
        {documento.notificacion.correo ? (
          <Text>Correo electrónico: {documento.notificacion.correo}</Text>
        ) : null}

        <View wrap={false}>
          <Text style={{ marginTop: 18 }}>Atentamente,</Text>
          <View style={styles.firmaLinea} />
          <Text style={styles.firmaNombre}>{documento.firma.nombre}</Text>
          <Text style={styles.muted}>{documento.firma.documento}</Text>
        </View>

        <Text style={styles.footer} fixed>
          {DISCLAIMER} · Generado con MiPeticion.
        </Text>
      </Page>
    </Document>
  );
}
