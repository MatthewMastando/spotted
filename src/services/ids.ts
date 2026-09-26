export type IdFactory = (prefix: string) => string;

let nextId = 0;

export const createId: IdFactory = (prefix) => {
  nextId += 1;
  const randomId =
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}_${randomId}_${nextId.toString(36)}`;
};
