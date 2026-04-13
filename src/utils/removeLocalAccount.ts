/**
 * Remove a cached account from localStorage (legacy demo storage).
 * Does not affect Convex; call deleteUserByEmail for server-side removal.
 */
export function removeLocalAccount(email: string): void {
  const key = email.trim().toLowerCase();
  try {
    const storedUsers = JSON.parse(
      localStorage.getItem('fursure_users') || '{}'
    ) as Record<string, unknown>;
    if (key in storedUsers) {
      delete storedUsers[key];
      localStorage.setItem('fursure_users', JSON.stringify(storedUsers));
    }
  } catch {
    // ignore
  }
  try {
    const raw = localStorage.getItem('fursure_current_user');
    if (!raw) return;
    const cur = JSON.parse(raw) as { email?: string };
    if (cur?.email && cur.email.trim().toLowerCase() === key) {
      localStorage.removeItem('fursure_current_user');
    }
  } catch {
    localStorage.removeItem('fursure_current_user');
  }
}
