import { isRateLimitMessage } from "@/lib/rate-limit";

export function Loading() {
  return <p className="muted">Loading…</p>;
}

export function ErrorMessage({ message }: { message: string }) {
  // The daily request limit is announced once by the pop-up (RateLimitNotice), never as a red message on the screen. A screen
  // that could not load because of it shows this short grey note instead of an empty space.
  if (isRateLimitMessage(message)) {
    return (
      <p className="muted" role="status">
        This isn&apos;t available right now. Please try again later.
      </p>
    );
  }
  return (
    <p className="error" role="alert">
      {message}
    </p>
  );
}
