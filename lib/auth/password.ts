import { hash, verify } from "@node-rs/argon2";

export async function hashOwnerPassword(password: string) {
  if (password.length < 10) throw new Error("Owner password must contain at least 10 characters.");
  return hash(password, { algorithm: 2 });
}

export async function verifyOwnerPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
