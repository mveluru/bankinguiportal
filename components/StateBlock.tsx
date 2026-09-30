export function Loading() {
  return <p className="muted">Loading…</p>;
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="error" role="alert">
      {message}
    </p>
  );
}
