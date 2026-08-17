import {
  ArrowLeft01Icon,
  Comment01Icon,
  FavouriteIcon,
  SentIcon,
  Share08Icon,
} from "@hugeicons/core-free-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { addComment, loadPost } from "@/api/community";
import { Icon } from "@/components/icon";
import { palette, radius, spacing, type } from "@/theme";

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reply, setReply] = useState("");
  const queryClient = useQueryClient();
  const post = useQuery({
    queryKey: ["post", id],
    queryFn: () => loadPost(id),
    enabled: Boolean(id),
  });
  const send = useMutation({
    mutationFn: () => addComment(id, reply),
    onSuccess: async () => {
      setReply("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["post", id] }),
        queryClient.invalidateQueries({ queryKey: ["community-feed"] }),
      ]);
    },
    onError: (error) =>
      Alert.alert(
        "Could not respond",
        error instanceof Error ? error.message : "Please try again.",
      ),
  });
  if (post.isLoading || !post.data)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: palette.paper,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={palette.ink} />
      </View>
    );
  const item = post.data;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: palette.paper }}
      contentContainerStyle={{
        padding: spacing.md,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xxl,
        gap: spacing.lg,
      }}
    >
      <Pressable
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.full,
          backgroundColor: palette.white,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon icon={ArrowLeft01Icon} />
      </Pressable>
      <Text style={[type.caption, { color: palette.grey, fontWeight: "800", letterSpacing: 1.3 }]}>
        {item.topic.toUpperCase()}
      </Text>
      {item.quote && (
        <Text selectable style={[type.display, { color: palette.ink }]}>
          {item.quote}
        </Text>
      )}
      <Text
        selectable
        style={[type.body, { color: palette.charcoal, fontSize: 19, lineHeight: 30 }]}
      >
        {item.body}
      </Text>
      <View
        style={{
          backgroundColor: palette.ink,
          borderRadius: radius.lg,
          borderCurve: "continuous",
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <Text selectable style={{ color: palette.white, fontWeight: "800" }}>
          {item.author}
        </Text>
        <Text selectable style={[type.caption, { color: "#BDBAB2" }]}>
          SpeakUp community member
        </Text>
        <View style={{ flexDirection: "row", gap: spacing.lg }}>
          <Icon icon={FavouriteIcon} color={palette.white} />
          <Icon icon={Comment01Icon} color={palette.white} />
          <Icon icon={Share08Icon} color={palette.white} />
        </View>
      </View>
      <Text style={[type.title, { color: palette.ink }]}>The conversation</Text>
      {item.commentList.map((comment) => (
        <View
          key={comment.id}
          style={{
            backgroundColor: palette.white,
            borderRadius: radius.md,
            padding: spacing.md,
            gap: spacing.sm,
          }}
        >
          <Text selectable style={{ color: palette.ink, fontWeight: "800" }}>
            {comment.author}
          </Text>
          <Text selectable style={[type.body, { color: palette.charcoal }]}>
            {comment.body}
          </Text>
          <Text style={[type.caption, { color: palette.grey }]}>
            {new Date(comment.createdAt).toLocaleDateString()} · {comment.likes} likes
          </Text>
        </View>
      ))}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm }}>
        <TextInput
          value={reply}
          onChangeText={setReply}
          placeholder="Add to the conversation…"
          multiline
          style={{
            flex: 1,
            minHeight: 52,
            maxHeight: 140,
            backgroundColor: palette.white,
            borderRadius: radius.md,
            padding: spacing.md,
            color: palette.ink,
          }}
        />
        <Pressable
          disabled={!reply.trim() || send.isPending}
          onPress={() => send.mutate()}
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.full,
            backgroundColor: palette.ink,
            alignItems: "center",
            justifyContent: "center",
            opacity: !reply.trim() ? 0.35 : 1,
          }}
        >
          <Icon icon={SentIcon} color={palette.white} />
        </Pressable>
      </View>
    </ScrollView>
  );
}
