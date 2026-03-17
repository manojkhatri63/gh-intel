const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

function isLoopbackUrl(value: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(value);
}

export function getApiBaseUrl(): string {
  const publicBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (publicBackendUrl) {
    const normalized = trimTrailingSlash(publicBackendUrl);

    // In production, never allow a loopback URL from public env vars.
    if (process.env.NODE_ENV === 'production' && isLoopbackUrl(normalized)) {
      return '';
    }

    return normalized;
  }

  return '';
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return `${base}${normalizedPath}`;
}
