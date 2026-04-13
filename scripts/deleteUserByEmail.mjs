/**
 * One-off: npx convex run with JSON args (avoids shell quoting issues on Windows).
 * Usage: node scripts/deleteUserByEmail.mjs petowner4@gmail.com
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/deleteUserByEmail.mjs <email>");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const inner = JSON.stringify({ email: email.trim().toLowerCase() });
// Double-stringify so the inner JSON is one safe shell argument
const arg = JSON.stringify(inner);

execSync(`npx convex run users:deleteUserByEmail ${arg}`, {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
