import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { loadFeed } from "@/api/community";
import { PostCard } from "@/components/post-card";
import { ScreenHeading } from "@/components/screen-heading";
import { useLightProgress } from "@/hooks/use-light-progress";
import { palette, spacing } from "@/theme";

export default function FeedScreen() {
  const progress = useLightProgress();
  const feed = useQuery({ queryKey: ["community-feed"], queryFn: () => loadFeed() });
  return (
    <FlatList
      data={feed.data || []}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: palette.paper }}
      contentContainerStyle={{
        padding: spacing.md,
        paddingTop: spacing.xl,
        paddingBottom: 120,
        gap: spacing.md,
      }}
      ListHeaderComponent={
        <View style={{ paddingBottom: spacing.lg }}>
          <ScreenHeading
            eyebrow="Truth, unscripted"
            title={"What is coming\nto light?"}
            streak={progress.currentStreak}
          />
        </View>
      }
      ListEmptyComponent={
        feed.isLoading ? (
          <ActivityIndicator color={palette.ink} />
        ) : (
          <View style={{ padding: spacing.xl, gap: spacing.sm, alignItems: "center" }}>
            <Text selectable style={{ color: palette.ink, fontWeight: "800" }}>
              {feed.error ? "The live feed could not be reached." : "The feed is quiet."}
            </Text>
            <Pressable onPress={() => feed.refetch()}>
              <Text style={{ color: palette.grey }}>Try again</Text>
            </Pressable>
          </View>
        )
      }
      refreshing={feed.isRefetching}
      onRefresh={feed.refetch}
      renderItem={({ item }) => <PostCard post={item} />}
    />
  );
}
