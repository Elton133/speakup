import {
  ArrowLeft01Icon,
  Delete02Icon,
  LegalDocument01Icon,
  ShieldUserIcon,
} from "@hugeicons/core-free-icons";
import { router } from "expo-router";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAccount } from "@/api/community";
import { Icon } from "@/components/icon";
import { palette, radius, spacing, type } from "@/theme";

const web = process.env.EXPO_PUBLIC_WEB_URL || "https://speakup.forum";

export default function SafetyScreen() {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.clear();
      router.replace("/");
    },
    onError: (error) =>
      Alert.alert(
        "Could not delete account",
        error instanceof Error ? error.message : "Please try again.",
      ),
  });
  function confirmDeletion() {
    Alert.alert(
      "Delete your SpeakUp account?",
      "Your posts, comments, saves, media records and profile will be permanently removed. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete account", style: "destructive", onPress: () => remove.mutate() },
      ],
    );
  }
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
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
      <Text selectable style={[type.display, { color: palette.ink }]}>
        Safety & privacy.
      </Text>
      <Text selectable style={[type.body, { color: palette.charcoal }]}>
        Control your account and understand how SpeakUp protects community conversations.
      </Text>
      <SafetyLink
        title="Privacy policy"
        subtitle="Data, anonymity, storage and your choices"
        onPress={() => Linking.openURL(`${web}/privacy`)}
      />
      <SafetyLink
        title="Terms of use"
        subtitle="Account, content and service terms"
        onPress={() => Linking.openURL(`${web}/terms`)}
      />
      <SafetyLink
        title="Community guidelines"
        subtitle="What belongs here and how moderation works"
        onPress={() => Linking.openURL(`${web}/community-guidelines`)}
      />
      <View style={{ height: 1, backgroundColor: "#CBC8C0" }} />
      <Pressable
        disabled={remove.isPending}
        onPress={confirmDeletion}
        style={({ pressed }) => ({
          minHeight: 54,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: palette.danger,
          paddingHorizontal: spacing.md,
          flexDirection: "row",
          gap: spacing.sm,
          alignItems: "center",
          opacity: pressed || remove.isPending ? 0.55 : 1,
        })}
      >
        <Icon icon={Delete02Icon} color={palette.danger} />
        <Text style={{ color: palette.danger, fontWeight: "800" }}>
          {remove.isPending ? "Deleting account…" : "Delete account"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function SafetyLink({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: palette.white,
        borderRadius: radius.md,
        borderCurve: "continuous",
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Icon icon={title.includes("guidelines") ? ShieldUserIcon : LegalDocument01Icon} />
      <View style={{ flex: 1 }}>
        <Text selectable style={{ color: palette.ink, fontWeight: "800" }}>
          {title}
        </Text>
        <Text selectable style={[type.caption, { color: palette.grey }]}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
