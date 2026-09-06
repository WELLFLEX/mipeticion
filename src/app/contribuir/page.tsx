export const metadata = { title: 'Contribuye a MiPetición' };
export default function Page() {
  return (
    <div className="container page narrow">
      <p className="eyebrow">Muchas formas de ayudar</p>
      <h1>Hagamos más fácil el siguiente paso.</h1>
      <p className="lead">
        Puedes contribuir aunque no escribas código. Una instrucción clara o una barrera detectada a
        tiempo puede hacer la diferencia.
      </p>
      <div className="stack prose-content">
        <section className="panel">
          <h2>Verifica una guía</h2>
          <p>
            Revisa el canal de una entidad y explica qué cambió. Incluye el enlace oficial, la fecha
            y los pasos que verificaste. No publiques capturas con datos personales.
          </p>
        </section>
        <section className="panel">
          <h2>Prueba la experiencia</h2>
          <p>
            Cuéntanos si algo resulta confuso, si un control no funciona con teclado o lector de
            pantalla, o si el texto es difícil de entender. Usa ejemplos inventados.
          </p>
        </section>
        <section className="panel">
          <h2>Diseña o desarrolla</h2>
          <p>
            El proyecto usa Next.js, TypeScript y Supabase. Puedes trabajar localmente con
            plantillas, sin pagar servicios de IA. Cada cambio recibe revisión antes de publicarse.
          </p>
          <p>El código usa Apache-2.0. Los datos tienen su propia licencia y atribuciones.</p>
        </section>
        <a
          className="button"
          href="https://github.com/WELLFLEX/mipeticion/blob/main/CONTRIBUTING.md"
        >
          Leer cómo contribuir en GitHub →
        </a>
        <p className="field-help">
          Si encuentras un problema de seguridad, usa el canal privado indicado en SECURITY.md.
          Nunca abras un issue con información privada de una persona.
        </p>
      </div>
    </div>
  );
}
