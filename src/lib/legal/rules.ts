export const LEGAL_VERSION = 'ley1755-art14-v1';
export const LEGAL_SOURCE =
  'https://www1.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=65334';
export const FUNDAMENTOS = [
  'El artículo 23 de la Constitución Política reconoce el derecho a presentar peticiones respetuosas a las autoridades y a obtener pronta resolución.',
  'La Ley 1755 de 2015 regula el ejercicio del derecho fundamental de petición. Solicito una respuesta clara, de fondo y congruente con lo solicitado.',
];
export function fraseTermino(dias: number) {
  return `Solicito respuesta dentro del término general de ${dias} días hábiles previsto en el artículo 14 de la Ley 1755 de 2015, salvo que resulte aplicable una norma especial. Si se requiere información adicional, traslado o ampliación del término, solicito que se me informe por el canal de notificación indicado.`;
}
