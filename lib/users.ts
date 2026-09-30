export interface DemoUser {
  username: string;
  password: string;
  customerId: string;
}

/** Parses DEMO_USERS ("username:password:customerId,..."). Server-side only. */
export function demoUsers(): DemoUser[] {
  const raw = process.env.DEMO_USERS ?? "demo:demo1234:CUST-DEMO";
  return raw
    .split(",")
    .map((entry) => entry.trim().split(":"))
    .filter((p) => p.length === 3 && p.every(Boolean))
    .map(([username, password, customerId]) => ({ username, password, customerId }));
}

export function authenticate(username: string, password: string): DemoUser | null {
  const user = demoUsers().find((u) => u.username === username);
  // Compare in full either way so timing doesn't reveal whether the username exists.
  const expected = user?.password ?? "\0";
  let diff = expected.length ^ password.length;
  for (let i = 0; i < Math.max(expected.length, password.length); i++) {
    diff |= (expected.charCodeAt(i) || 0) ^ (password.charCodeAt(i) || 0);
  }
  return user && diff === 0 ? user : null;
}
