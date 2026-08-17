import { Comment01Icon, FavouriteIcon, Notification01Icon } from "@hugeicons/core-free-icons";
import { ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { loadNotices } from "@/api/community";
import { Icon } from "@/components/icon";
import { ScreenHeading } from "@/components/screen-heading";
import { palette, radius, spacing, type } from "@/theme";

export default function NoticesScreen() {
  const notices = useQuery({ queryKey: ["notices"], queryFn: loadNotices });
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: palette.paper }}
      contentContainerStyle={{
        padding: spacing.md,
        paddingTop: spacing.xl,
        paddingBottom: 120,
        gap: spacing.lg,
      }}
    >
      <ScreenHeading eyebrow="Notices" title="Stay in the conversation." />
      {(notices.data || []).map((notice, index) => (
        <View
          key={notice.id}
          style={{
            backgroundColor: index === 0 ? "#FFF4DC" : palette.white,
            borderRadius: radius.lg,
            borderCurve: "continuous",
            padding: spacing.lg,
            flexDirection: "row",
            gap: spacing.md,
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: radius.full,
              backgroundColor: palette.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              icon={
                notice.kind === "comment"
                  ? Comment01Icon
                  : notice.kind === "like"
                    ? FavouriteIcon
                    : Notification01Icon
              }
              color={palette.white}
            />
          </View>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text selectable style={{ color: palette.ink, fontWeight: "800" }}>
                {notice.kind === "comment"
                  ? "New response"
                  : notice.kind === "like"
                    ? "Your thought is travelling"
                    : "SpeakUp"}
              </Text>
              <Text style={[type.caption, { color: palette.grey }]}>
                {new Date(notice.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Text selectable style={[type.body, { color: palette.charcoal }]}>
              {notice.message}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
