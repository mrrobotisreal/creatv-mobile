import "react-native-url-polyfill/auto";
import "react-native-get-random-values";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import * as aesjs from "aes-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in env."
  );
}

const KEY_STORAGE_KEY = "creatv_supabase_encryption_key";
const STORAGE_PREFIX = "creatv:supabase:";

async function getEncryptionKey(): Promise<Uint8Array> {
  const storedKey = await SecureStore.getItemAsync(KEY_STORAGE_KEY);
  if (storedKey) {
    return aesjs.utils.hex.toBytes(storedKey);
  }

  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  const keyHex = aesjs.utils.hex.fromBytes(key);
  await SecureStore.setItemAsync(KEY_STORAGE_KEY, keyHex, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}

async function encryptValue(value: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = new Uint8Array(16);
  crypto.getRandomValues(iv);
  const counter = new aesjs.Counter(iv);
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, counter);
  const encryptedBytes = aesCtr.encrypt(aesjs.utils.utf8.toBytes(value));
  return `${aesjs.utils.hex.fromBytes(iv)}:${aesjs.utils.hex.fromBytes(encryptedBytes)}`;
}

async function decryptValue(payload: string): Promise<string | null> {
  const [ivHex, dataHex] = payload.split(":");
  if (!ivHex || !dataHex) {
    return null;
  }
  const key = await getEncryptionKey();
  const iv = aesjs.utils.hex.toBytes(ivHex);
  const counter = new aesjs.Counter(iv);
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, counter);
  const decryptedBytes = aesCtr.decrypt(aesjs.utils.hex.toBytes(dataHex));
  return aesjs.utils.utf8.fromBytes(decryptedBytes);
}

// Supabase session values can exceed SecureStore limits. We store the AES key in SecureStore
// and keep encrypted session payloads in AsyncStorage.
const LargeSecureStore = {
  async getItem(key: string) {
    const storedValue = await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!storedValue) {
      return null;
    }
    return decryptValue(storedValue);
  },
  async setItem(key: string, value: string) {
    const encrypted = await encryptValue(value);
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, encrypted);
  },
  async removeItem(key: string) {
    await AsyncStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: LargeSecureStore,
  },
});

