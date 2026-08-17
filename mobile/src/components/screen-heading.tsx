import { Text, View } from "react-native";
import { StreakLantern } from "@/components/streak-lantern";
import { palette, spacing, type } from "@/theme";
export function ScreenHeading({
  eyebrow,
  title,
  streak,
}: {
  eyebrow: string;
  title: string;
  streak?: number;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text
          selectable
          style={[type.caption, { color: palette.grey, fontWeight: "800", letterSpacing: 1.5 }]}
        >
          {eyebrow.toUpperCase()}
        </Text>
        {streak !== undefined && <StreakLantern days={streak} />}
      </View>
      <Text selectable style={[type.display, { color: palette.ink }]}>
        {title}
      </Text>
    </View>
  );
}
