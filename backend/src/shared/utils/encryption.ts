import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;
  let key = process.env.ENCRYPTION_KEY;
  if (!key || key === "kmenu-encryption-key-change-in-production-32b" || key.length < 16) {
    key = crypto.randomBytes(32).toString("hex");
    process.env.ENCRYPTION_KEY = key;
    console.log(`[ENCRYPTION] Auto-generated key: ${key}`);
    console.log(`[ENCRYPTION] Add this to your .env file to keep it persistent:`);
    console.log(`[ENCRYPTION] ENCRYPTION_KEY=${key}`);
  }
  cachedKey = crypto.scryptSync(key, crypto.randomBytes(16).toString("hex"), KEY_LENGTH);
  return cachedKey;
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(encrypted: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }
  const [ivHex, tagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}
