const headerValue = (value?: string | string[]): string => Array.isArray(value) ? value[0] ?? '' : value ?? '';

export const isCronAuthorized = (
  headers: { authorization?: string | string[]; 'x-cron-secret'?: string | string[] },
  cronSecret: string
): boolean => {
  if (!cronSecret) return true;
  return headerValue(headers.authorization) === `Bearer ${cronSecret}`
    || headerValue(headers['x-cron-secret']) === cronSecret;
};
