import { Search01Icon } from "@hugeicons/core-free-icons";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadFeed } from "@/api/community";
import { AdaptiveGlass } from "@/components/adaptive-glass";
import { Icon } from "@/components/icon";
import { ScreenHeading } from "@/components/screen-heading";
import { PostCard } from "@/components/post-card";
import { palette, radius, spacing, type } from "@/theme";

export default function ExploreScreen() {
  const [search, setSearch] = useState("");
  const results = useQuery({
    queryKey: ["community-search", search],
    queryFn: () => loadFeed(search),
    enabled: search.trim().length >= 2,
  });
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
      <ScreenHeading eyebrow="Explore" title="Dig deeper." />
      <AdaptiveGlass
        style={{
          borderRadius: radius.full,
          overflow: "hidden",
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
        }}
      >
        <Icon icon={Search01Icon} color={palette.grey} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search thoughts, scripture, topics"
          placeholderTextColor={palette.grey}
          style={{ flex: 1, minHeight: 52, color: palette.ink, fontSize: 16 }}
        />
      </AdaptiveGlass>
      {search.trim().length >= 2 &&
        results.data?.map((post) => <PostCard post={post} key={post.id} />)}
      <Text style={[type.caption, { color: palette.grey, fontWeight: "800", letterSpacing: 1.3 }]}>
        TRENDING IN THE LIGHT
      </Text>
      {["Beyond the walls", "Scripture", "Faith & culture", "Questions"].map((topic, index) => (
        <View
          key={topic}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            paddingVertical: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: "#D7D4CC",
          }}
        >
          <Text style={[type.title, { color: "#B9B5AC" }]}>0{index + 1}</Text>
          <View>
            <Text selectable style={{ color: palette.ink, fontSize: 18, fontWeight: "800" }}>
              {topic}
            </Text>
            <Text selectable style={[type.caption, { color: palette.grey }]}>
              Explore live conversations
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
