export const parseVnd = (value: string): number | null => {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return Number(digits);
};

export const formatVnd = (value?: number | null, suffix = 'đ'): string => {
  if (value === null || value === undefined) return 'N/A';
  return `${new Intl.NumberFormat('vi-VN').format(value)} ${suffix}`;
};

export const formatSignedVnd = (value?: number | null, suffix = 'đ'): string => {
  if (value === null || value === undefined) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatVnd(value, suffix)}`;
};
