const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export function getApiBaseUrl(): string {
  const publicBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (publicBackendUrl) {
    return trimTrailingSlash(publicBackendUrl);
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return `${base}${normalizedPath}`;
}
