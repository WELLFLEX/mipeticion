'use client';
export function EditableList({
  title,
  singular,
  items,
  onChange,
}: {
  title: string;
  singular: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <section>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 className="form-label">{title}</h3>
        <button
          type="button"
          className="text-link"
          disabled={items.length >= 20}
          onClick={() => onChange([...items, ''])}
        >
          + Agregar {singular.toLowerCase()}
        </button>
      </div>
      <ol className="stack">
        {items.map((item, i) => (
          <li key={i}>
            <label className="form-label" htmlFor={singular + i}>
              {singular} {i + 1}
            </label>
            <textarea
              id={singular + i}
              className="control"
              rows={3}
              value={item}
              maxLength={1200}
              onChange={(e) => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
            />
            {items.length > 1 && (
              <button
                type="button"
                className="text-link"
                aria-label={`Eliminar ${singular.toLowerCase()} ${i + 1}`}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                Eliminar
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
