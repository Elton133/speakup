import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { ensureCommunityUser } from "@/api/community";

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice)
    throw new Error("Use a physical device to register for push notifications.");
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("community", {
      name: "Community activity",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 80, 180],
      lightColor: "#F0A43A",
    });
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("Notification permission was not granted.");
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId)
    throw new Error("Connect this app to an EAS project before registering push notifications.");
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (isSupabaseConfigured) {
    const user = await ensureCommunityUser();
    await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: token,
        subscription: { endpoint: token, transport: "expo", platform: Platform.OS },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" },
    );
  }
  return token;
}
