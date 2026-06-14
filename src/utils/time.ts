import { env } from '../config/env.js';

export const nowIso = (): string => new Date().toISOString();

export const todayInTimezone = (timezone = env.timezone): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

export const formatDateTimeVi = (iso?: string | null): string => {
  if (!iso) return 'Chưa rõ';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: env.timezone,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(iso));
};

export const formatDateVi = (date = new Date()): string =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: env.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
