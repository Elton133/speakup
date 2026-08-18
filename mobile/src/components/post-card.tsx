import {
  Bookmark02Icon,
  Comment01Icon,
  FavouriteIcon,
  MoreHorizontalIcon,
  Share08Icon,
} from "@hugeicons/core-free-icons";
import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import { Link } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useState } from "react";
import { Alert, Pressable, Share, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/icon";
import type { CommunityMedia, CommunityPost } from "@/api/community";
import { blockMember, reportPost, toggleLike, toggleSaved } from "@/api/community";
import { palette, radius, spacing, type } from "@/theme";

export function PostCard({ post }: { post: CommunityPost }) {
  const [liked, setLiked] = useState(post.liked);
  const [saved, setSaved] = useState(Boolean(post.saved));
  const [hidden, setHidden] = useState(false);
  const queryClient = useQueryClient();
  const action = (callback: () => void) => {
    Haptics.selectionAsync();
    callback();
  };
  if (hidden) return null;
  const sendReport = (reason: "spam" | "harassment" | "misinformation" | "other") =>
    reportPost(post.id, reason)
      .then(() => Alert.alert("Report received", "Our moderation team will review this post."))
      .catch((error) =>
        Alert.alert(
          "Could not report",
          error instanceof Error ? error.message : "Please try again.",
        ),
      );
  function openOptions() {
    if (post.ownedByMe) {
      Alert.alert("Post options", undefined, [
        { text: "Hide from this view", onPress: () => setHidden(true) },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }
    Alert.alert("Post options", undefined, [
      {
        text: "Report post",
        onPress: () =>
          Alert.alert("Why are you reporting this?", undefined, [
            { text: "Spam", onPress: () => sendReport("spam") },
            { text: "Harassment", onPress: () => sendReport("harassment") },
            { text: "Misinformation", onPress: () => sendReport("misinformation") },
            { text: "Other", onPress: () => sendReport("other") },
            { text: "Cancel", style: "cancel" },
          ]),
      },
      {
        text: "Block this member",
        style: "destructive",
        onPress: () =>
          blockMember(post.authorId)
            .then(() => {
              setHidden(true);
              queryClient.invalidateQueries({ queryKey: ["community-feed"] });
              Alert.alert("Member blocked", "Their posts will no longer appear in your feed.");
            })
            .catch((error) =>
              Alert.alert(
                "Could not block",
                error instanceof Error ? error.message : "Please try again.",
              ),
            ),
      },
      { text: "Hide this post", onPress: () => setHidden(true) },
      { text: "Cancel", style: "cancel" },
    ]);
  }
  return (
    <Link href={{ pathname: "/post/[id]", params: { id: post.id } }} asChild>
      <Link.Trigger>
        <Pressable
          style={({ pressed }) => ({
            backgroundColor: palette.white,
            borderRadius: radius.lg,
            borderCurve: "continuous",
            padding: spacing.lg,
            gap: spacing.md,
            opacity: pressed ? 0.88 : 1,
            boxShadow: "0 8px 26px rgba(11,11,11,.07)",
          })}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: radius.full,
                  backgroundColor: palette.ink,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: palette.white, fontWeight: "800" }}>{post.author[0]}</Text>
              </View>
              <View>
                <Text selectable style={{ fontWeight: "800", color: palette.ink }}>
                  {post.author}
                </Text>
                <Text selectable style={[type.caption, { color: palette.grey }]}>
                  {post.topic}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <View
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderWidth: 1,
                  borderColor: "#D6D3CB",
                  borderRadius: radius.full,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "800",
                    color: palette.charcoal,
                    textTransform: "uppercase",
                  }}
                >
                  {post.topic}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Post options"
                onPress={(event) => {
                  event.stopPropagation();
                  openOptions();
                }}
                style={{ padding: spacing.xs }}
              >
                <Icon icon={MoreHorizontalIcon} color={palette.grey} />
              </Pressable>
            </View>
          </View>
          {post.quote && (
            <Text selectable style={[type.title, { color: palette.ink }]}>
              {post.quote}
            </Text>
          )}
          <Text selectable style={[type.body, { color: palette.charcoal }]}>
            {post.body}
          </Text>
          {post.media.map((media) => (
            <MediaAttachment media={media} key={media.id} />
          ))}
          <View style={{ height: 1, backgroundColor: "#E2DFD7" }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
            <Pressable
              accessibilityLabel={liked ? "Unlike" : "Like"}
              onPress={(event) => {
                event.stopPropagation();
                const next = !liked;
                action(() => setLiked(next));
                toggleLike(post.id, next).catch(() => setLiked(!next));
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}
            >
              <Icon icon={FavouriteIcon} color={liked ? palette.ember : palette.grey} />
              <Text style={{ color: palette.grey, fontVariant: ["tabular-nums"] }}>
                {post.likes + (liked ? 1 : 0)}
              </Text>
            </Pressable>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <Icon icon={Comment01Icon} color={palette.grey} />
              <Text style={{ color: palette.grey }}>{post.comments}</Text>
            </View>
            <Pressable
              accessibilityLabel="Share post"
              onPress={(event) => {
                event.stopPropagation();
                Share.share({
                  message: `${post.quote || post.body}\n\nhttps://speakup.forum/community/post/${post.id}`,
                });
              }}
            >
              <Icon icon={Share08Icon} color={palette.grey} />
            </Pressable>
            <Pressable
              accessibilityLabel={saved ? "Remove saved post" : "Save post"}
              onPress={(event) => {
                event.stopPropagation();
                const next = !saved;
                action(() => setSaved(next));
                toggleSaved(post.id, next).catch(() => setSaved(!next));
              }}
              style={{ marginLeft: "auto" }}
            >
              <Icon icon={Bookmark02Icon} color={saved ? palette.ink : palette.grey} />
            </Pressable>
          </View>
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
    </Link>
  );
}

function MediaAttachment({ media }: { media: CommunityMedia }) {
  if (media.kind === "video") return <VideoAttachment url={media.url} />;
  return <AudioAttachment url={media.url} />;
}

function VideoAttachment({ url }: { url: string }) {
  const player = useVideoPlayer(url);
  return (
    <VideoView
      player={player}
      nativeControls
      allowsPictureInPicture
      contentFit="contain"
      style={{ width: "100%", height: 260, borderRadius: radius.md, backgroundColor: palette.ink }}
    />
  );
}

function AudioAttachment({ url }: { url: string }) {
  const player = useAudioPlayer(url);
  const [playing, setPlaying] = useState(false);
  return (
    <Pressable
      accessibilityLabel={playing ? "Pause audio" : "Play audio"}
      onPress={() => {
        if (playing) player.pause();
        else player.play();
        setPlaying(!playing);
      }}
      style={{ padding: spacing.md, borderRadius: radius.full, backgroundColor: palette.paper }}
    >
      <Text style={{ color: palette.ink, fontWeight: "800" }}>
        {playing ? "Pause audio reflection" : "Play audio reflection"}
      </Text>
    </Pressable>
  );
}
