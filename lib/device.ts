/** "Chrome on macOS" from a user-agent string, or null when there is nothing to go on. Client-safe. */
export function describeDevice(ua?: string): string | null {
  if (!ua) return null;
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : null;
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : null;
  return browser || os ? [browser, os].filter(Boolean).join(" on ") : ua.slice(0, 30);
}
