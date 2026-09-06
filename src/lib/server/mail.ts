import { z } from 'zod';
const email = z.email();
export function reminderMessage(kind: 'reminder' | 'expiry') {
  const url = new URL('/mis-solicitudes', process.env.APP_URL).href;
  return kind === 'expiry'
    ? {
        subject: 'Revisa tus datos guardados en MiPetición',
        text:
          'Tienes datos guardados sin actividad en MiPetición. Podrán eliminarse después de 30 días, cuando se cumplan 12 meses sin actividad. Entra a tu cuenta para exportarlos o registrar una novedad si deseas conservarlos.\n\n' +
          url,
      }
    : {
        subject: 'Un momento para revisar tus solicitudes',
        text:
          'Puedes entrar a MiPetición para revisar tus solicitudes y registrar cualquier novedad. Este aviso no confirma un estado oficial ni un incumplimiento.\n\n' +
          url +
          '\n\nPuedes desactivar estos recordatorios en tu cuenta.',
      };
}
export async function sendJobEmail(id: string, to: string, kind: 'reminder' | 'expiry') {
  if (!email.safeParse(to).success) throw new Error('invalid_recipient');
  const message = reminderMessage(kind);
  // Stable content + stable job ID; retries never exceed the provider's 24-hour window.
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'mipeticion-job-' + id,
    },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], ...message }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('email_delivery_failed');
  // Do not log recipient addresses, response bodies or provider errors.
}
