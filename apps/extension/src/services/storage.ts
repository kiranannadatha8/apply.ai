export const EXT_STORAGE_KEYS = {
  extToken: "extToken",
  extTokenExp: "extTokenExp",
} as const;

export async function setExtToken(token: string, expUnixSec?: number) {
  await chrome.storage.local.set({ [EXT_STORAGE_KEYS.extToken]: token });
  if (expUnixSec)
    await chrome.storage.local.set({
      [EXT_STORAGE_KEYS.extTokenExp]: expUnixSec,
    });
}
export async function getExtToken(): Promise<string | null> {
  const { extToken } = await chrome.storage.local.get(
    EXT_STORAGE_KEYS.extToken,
  );
  return extToken ?? null;
}
export async function clearExtToken() {
  await chrome.storage.local.remove([
    EXT_STORAGE_KEYS.extToken,
    EXT_STORAGE_KEYS.extTokenExp,
  ]);
}
