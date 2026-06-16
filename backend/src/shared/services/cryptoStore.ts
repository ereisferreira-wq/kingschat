import * as fs from "fs";
import * as path from "path";
import { encrypt, decrypt, isEncrypted } from "../utils/encryption";
import logger from "../utils/logger";
import { initAuthCreds } from "@whiskeysockets/baileys/lib/Utils/auth-utils.js";

function readEncrypted(filePath: string): any {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = isEncrypted(raw) ? decrypt(raw) : raw;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function writeEncrypted(filePath: string, data: any): void {
  const json = JSON.stringify(data);
  const encrypted = encrypt(json);
  fs.writeFileSync(filePath, encrypted, "utf-8");
}

export function encryptAllSessionFiles(sessionDir: string): void {
  try {
    if (!fs.existsSync(sessionDir)) return;
    const files = fs.readdirSync(sessionDir);
    for (const file of files) {
      const filePath = path.join(sessionDir, file);
      if (fs.statSync(filePath).isFile()) {
        const raw = fs.readFileSync(filePath, "utf-8");
        if (!isEncrypted(raw)) {
          const encrypted = encrypt(raw);
          fs.writeFileSync(filePath, encrypted, "utf-8");
          logger.info(`Encrypted session file: ${file}`);
        }
      }
    }
    logger.info(`All session files encrypted in ${sessionDir}`);
  } catch (err) {
    logger.error(`Failed to encrypt session files: ${err}`);
  }
}

export function useEncryptedAuthState(sessionDir: string) {
  const credsPath = path.join(sessionDir, "creds.json");

  const creds = readEncrypted(credsPath) || initAuthCreds();

  const keys: any = {
    get: async (type: string, ids: string[]) => {
      const data: Record<string, any> = {};
      for (const id of ids) {
        const filePath = path.join(sessionDir, `${type}-${id}.json`);
        data[id] = readEncrypted(filePath);
      }
      return data;
    },
    set: async (data: any) => {
      for (const category in data) {
        for (const id in data[category]) {
          const filePath = path.join(sessionDir, `${category}-${id}.json`);
          if (data[category][id]) {
            writeEncrypted(filePath, data[category][id]);
          }
        }
      }
    },
    delete: async (type: string, ids: string[]) => {
      for (const id of ids) {
        const filePath = path.join(sessionDir, `${type}-${id}.json`);
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
      }
    },
  };

  return {
    state: { creds, keys },
    saveCreds: async () => {
      writeEncrypted(credsPath, creds);
    },
  };
}
