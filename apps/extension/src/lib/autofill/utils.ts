export function nanoid(size = 10): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let out = "";
  const cryptoObj = globalThis.crypto || (globalThis as any).msCrypto;
  if (cryptoObj?.getRandomValues) {
    const arr = new Uint8Array(size);
    cryptoObj.getRandomValues(arr);
    for (let i = 0; i < size; i++) {
      out += chars[arr[i] % chars.length];
    }
    return out;
  }
  for (let i = 0; i < size; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function normalizeSpaces(text: string | undefined): string | undefined {
  if (!text) return text;
  return text.replace(/\s+/g, " ").trim();
}

export function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const cleaned = base64.split(",").pop() ?? base64;
  const binary = atob(cleaned);
  const len = binary.length;
  const buffer = new ArrayBuffer(len);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes as Uint8Array<ArrayBuffer>;
}

export function makeFileFromBase64(
  base64: string,
  filename: string,
  mime = "application/octet-stream",
): File {
  const bytes = base64ToUint8Array(base64);
  const blob = new Blob([bytes], { type: mime });
  return new File([blob], filename, { type: mime });
}
