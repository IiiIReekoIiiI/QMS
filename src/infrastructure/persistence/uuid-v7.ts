export function createUuidV7(now = Date.now()): string {
  const randomBytes = new Uint8Array(10);
  globalThis.crypto.getRandomValues(randomBytes);

  const timestamp = BigInt(now);
  const bytes = new Uint8Array(16);

  bytes[0] = Number((timestamp >> 40n) & 0xffn);
  bytes[1] = Number((timestamp >> 32n) & 0xffn);
  bytes[2] = Number((timestamp >> 24n) & 0xffn);
  bytes[3] = Number((timestamp >> 16n) & 0xffn);
  bytes[4] = Number((timestamp >> 8n) & 0xffn);
  bytes[5] = Number(timestamp & 0xffn);
  bytes[6] = 0x70 | (randomBytes[0] & 0x0f);
  bytes[7] = randomBytes[1];
  bytes[8] = 0x80 | (randomBytes[2] & 0x3f);
  bytes.set(randomBytes.slice(3), 9);

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
