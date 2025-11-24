import { createHash, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const key = (process.env.SECRET_KEY || "").padEnd(32, "0").slice(0, 32);

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function encryptJson(obj) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key), iv);
  const data = Buffer.from(JSON.stringify(obj));
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptJson(b64) {
  const buf = Buffer.from(b64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(dec.toString("utf8"));
}