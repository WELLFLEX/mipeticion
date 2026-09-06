import { Tracker } from '@/components/tracking/Tracker';
export const metadata = { title: 'Mis solicitudes', robots: { index: false, follow: false } };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ guardar?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="container page narrow">
      <p className="eyebrow">Cada paso cuenta</p>
      <h1>Mis solicitudes</h1>
      <p className="lead">
        Guarda tu constancia, registra lo que ocurre y encuentra el siguiente paso.
      </p>
      <Tracker saveDraft={params.guardar === '1'} />
    </div>
  );
}
