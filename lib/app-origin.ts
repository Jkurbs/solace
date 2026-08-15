export const defaultAppOrigin = 'https://app.solace.fyi';

export function getAppOrigin(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_ORIGIN) {
    return process.env.NEXT_PUBLIC_APP_ORIGIN;
  }

  return defaultAppOrigin;
}
