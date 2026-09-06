export function storageConfigured() {
  return Boolean(
    process.env.TRACKING_ENABLED === 'true' &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.PRIVACY_OPERATOR &&
    process.env.PRIVACY_EMAIL &&
    process.env.APP_URL &&
    process.env.RATE_LIMIT_SECRET &&
    process.env.CRON_SECRET &&
    process.env.RESEND_API_KEY &&
    process.env.MAIL_FROM,
  );
}
export function serviceConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
export const publicConfig = () => ({
  trackingAvailable: storageConfigured(),
  operator: process.env.PRIVACY_OPERATOR || null,
  privacyEmail: process.env.PRIVACY_EMAIL || null,
});
