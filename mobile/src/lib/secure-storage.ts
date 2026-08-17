import * as SecureStore from "expo-secure-store";
const CHUNK_SIZE = 1800;
export const secureStorage = {
  async getItem(key: string) {
    if (process.env.EXPO_OS === "web")
      return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
    const count = Number(await SecureStore.getItemAsync(`${key}.chunks`));
    if (!count) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(`${key}.${index}`)),
    );
    return chunks.every((chunk) => chunk !== null) ? chunks.join("") : null;
  },
  async setItem(key: string, value: string) {
    if (process.env.EXPO_OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
      return;
    }
    await this.removeItem(key);
    const chunks = Array.from({ length: Math.ceil(value.length / CHUNK_SIZE) }, (_, index) =>
      value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
    );
    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(`${key}.${index}`, chunk)),
    );
    await SecureStore.setItemAsync(`${key}.chunks`, String(chunks.length));
  },
  async removeItem(key: string) {
    if (process.env.EXPO_OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
      return;
    }
    const count = Number(await SecureStore.getItemAsync(`${key}.chunks`));
    if (count)
      await Promise.all(
        Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(`${key}.${index}`)),
      );
    await SecureStore.deleteItemAsync(`${key}.chunks`);
  },
};
