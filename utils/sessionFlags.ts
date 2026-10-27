// utils/sessionFlags.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Call this BEFORE logout() when the user intentionally signs out. */
export async function markIntentionalLogout(): Promise<void> {
  await AsyncStorage.setItem("@intentional_logout", "true");
}

/**
 * Read & clear the intentional-logout flag.
 * Returns true if the last logout was user-initiated.
 */
export async function consumeIntentionalLogout(): Promise<boolean> {
  const flag = await AsyncStorage.getItem("@intentional_logout");
  if (flag === "true") {
    await AsyncStorage.removeItem("@intentional_logout");
    return true;
  }
  return false;
}