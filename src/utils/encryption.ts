import crypto from "crypto";

const IV_LENGTH = 16;
const ALGORITHM = "aes-256-cbc";

const resolveEncryptionKey = () => {
  const secret = process.env.BANK_DETAILS_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("BANK_DETAILS_ENCRYPTION_KEY is not defined");
  }

  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }

  const base64Buffer = Buffer.from(secret, "base64");
  if (base64Buffer.length === 32 && base64Buffer.toString("base64") === secret) {
    return base64Buffer;
  }

  if (Buffer.byteLength(secret, "utf8") === 32) {
    return Buffer.from(secret, "utf8");
  }

  throw new Error(
    "BANK_DETAILS_ENCRYPTION_KEY must be a 32-byte utf8 string, base64, or 64-char hex value",
  );
};

export const encrypt = (text: string) => {
  const encryptionKey = resolveEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);

  return {
    encryptedData: encrypted.toString("hex"),
    iv: iv.toString("hex"),
  };
};

export const decrypt = (encryptedData: string, iv: string) => {
  const encryptionKey = resolveEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    encryptionKey,
    Buffer.from(iv, "hex"),
  );

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};

export const maskSensitiveValue = (value: string, visibleDigits = 4) => {
  const trimmedValue = value.trim();
  const visibleSegment = trimmedValue.slice(-visibleDigits);
  const maskedSegmentLength = Math.max(trimmedValue.length - visibleDigits, 0);
  const maskedSegment = "*".repeat(maskedSegmentLength);
  const combined = `${maskedSegment}${visibleSegment}`;

  return combined.replace(/(.{4})/g, "$1 ").trim();
};
