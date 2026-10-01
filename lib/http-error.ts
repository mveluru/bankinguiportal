/** Business-rule failures come back as plain text, bean-validation failures as Spring's JSON error. */
export async function readErrorMessage(res: Response): Promise<string> {
  const body = await res.text();
  try {
    const json = JSON.parse(body);
    const fields = Array.isArray(json.errors)
      ? json.errors.map((e: { defaultMessage?: string }) => e.defaultMessage).filter(Boolean)
      : [];
    return fields.length ? fields.join("; ") : json.message ?? json.error ?? body;
  } catch {
    return body || `Request failed (${res.status})`;
  }
}
