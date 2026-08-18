import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { useFonts } from "expo-font";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    Flexing: require("@/assets/fonts/flexing-regular.ttf"),
    "Flexing-Bold": require("@/assets/fonts/flexing-bold.ttf"),
  });
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const postId = response.notification.request.content.data?.postId;
      if (typeof postId === "string")
        router.push({ pathname: "/post/[id]", params: { id: postId } });
      else router.push("/notices");
    });
    return () => subscription.remove();
  }, []);
  if (!loaded) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="post/[id]" options={{ presentation: "card" }} />
          <Stack.Screen name="safety" options={{ presentation: "card" }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
