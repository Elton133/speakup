import { Image } from "expo-image";
import { Text, View } from "react-native";
import { palette, radius, spacing, type } from "@/theme";
export function StreakLantern({ days = 0 }: { days?: number }) {
  const active = days > 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: radius.full,
          backgroundColor: active ? palette.emberSoft : "#D7D4CC",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: active ? "0 0 20px rgba(240,164,58,.55)" : "none",
        }}
      >
        <Image
          source={require("@/assets/brand/hand-lantern-mark.png")}
          style={{ width: 38, height: 38, opacity: active ? 1 : 0.32 }}
          contentFit="contain"
        />
      </View>
      <View>
        <Text
          selectable
          style={[type.caption, { color: palette.grey, fontWeight: "700", letterSpacing: 1 }]}
        >
          LIGHT STREAK
        </Text>
        <Text
          selectable
          style={{ color: palette.ink, fontWeight: "800", fontVariant: ["tabular-nums"] }}
        >
          {days} {days === 1 ? "day" : "days"}
        </Text>
      </View>
    </View>
  );
}
