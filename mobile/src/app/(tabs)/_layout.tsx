import { NativeTabs } from "expo-router/unstable-native-tabs";
import { DynamicColorIOS, Platform } from "react-native";

const tint =
  Platform.OS === "ios" ? DynamicColorIOS({ light: "#0B0B0B", dark: "#FFFFFF" }) : "#0B0B0B";

export default function TabsLayout() {
  return (
    <NativeTabs tintColor={tint} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Icon sf={{ default: "safari", selected: "safari.fill" }} md="explore" />
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create">
        <NativeTabs.Trigger.Icon
          sf={{ default: "plus.circle", selected: "plus.circle.fill" }}
          md="add_circle"
        />
        <NativeTabs.Trigger.Label>Speak</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notices">
        <NativeTabs.Trigger.Icon
          sf={{ default: "bell", selected: "bell.fill" }}
          md="notifications"
        />
        <NativeTabs.Trigger.Label>Notices</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} md="person" />
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
