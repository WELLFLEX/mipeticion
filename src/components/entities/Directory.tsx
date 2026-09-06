'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ENTIDADES } from '@/lib/entidades';
import { normalize } from '@/lib/intake/analyze';
import { Icon } from '@/components/Icon';
export function Directory() {
  const [query, setQuery] = useState('');
  const entities = ENTIDADES.filter((e) =>
    normalize([e.nombre, e.descripcion, ...e.aliases].join(' ')).includes(normalize(query)),
  );
  return (
    <>
      <div className="panel" style={{ marginBottom: 24 }}>
        <label htmlFor="buscar" className="form-label">
          Busca por entidad o por tema
        </label>
        <input
          id="buscar"
          className="control"
          type="search"
          placeholder="Por ejemplo: SENA, pensiones o crédito educativo"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="field-help" role="status">
          {entities.length} entidades disponibles en este piloto.
        </p>
      </div>
      <div className="cards">
        {entities.map((e) => (
          <article className="card" key={e.slug}>
            <span className="badge">Entidad nacional</span>
            <h2 style={{ fontSize: 23, fontWeight: 650, marginTop: 20 }}>{e.nombreCorto}</h2>
            <p>{e.descripcion}</p>
            <p className="field-help">Información · Estado de trámites · Atención</p>
            <Link className="text-link" href={'/entidades/' + e.slug}>
              Ver guía y canales <Icon size={17} />
            </Link>
          </article>
        ))}
      </div>
      {entities.length === 0 && (
        <div className="notice">
          <p>
            Todavía no tenemos una guía para esa búsqueda. Puedes consultar el directorio oficial o
            ayudarnos a ampliar la cobertura.
          </p>
          <a
            href="https://www.funcionpublica.gov.co/VisualSIE/faces/reporte/publico.xhtml?externo=true&idConsulta=Pr&idReporte=61"
            className="text-link"
          >
            Abrir el directorio SIGEP ↗
          </a>
        </div>
      )}
    </>
  );
}
