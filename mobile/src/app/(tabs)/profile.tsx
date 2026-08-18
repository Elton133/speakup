import { Notification01Icon, Settings02Icon, ShieldUserIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import { loadProfile, updateDisplayName } from "@/api/community";
import { Icon } from "@/components/icon";
import { ScreenHeading } from "@/components/screen-heading";
import { registerForPushNotificationsAsync } from "@/services/notifications";
import { signInWithGoogle } from "@/services/auth";
import { useLightProgress } from "@/hooks/use-light-progress";
import { palette, radius, spacing, type } from "@/theme";

export default function ProfileScreen() {
  const [enabling, setEnabling] = useState(false);
  const progress = useLightProgress();
  const profile = useQuery({ queryKey: ["profile"], queryFn: loadProfile });
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const queryClient = useQueryClient();
  const saveName = useMutation({
    mutationFn: () => updateDisplayName(name),
    onSuccess: async () => {
      setEditingName(false);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
  async function enableNotifications() {
    setEnabling(true);
    try {
      await registerForPushNotificationsAsync();
      Alert.alert("Notices are on", "SpeakUp can now notify this device when conversations move.");
    } catch (error) {
      Alert.alert(
        "Notifications not ready",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setEnabling(false);
    }
  }
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
      <ScreenHeading
        eyebrow="Your light"
        title={`${profile.data?.displayName || "Guest seeker"}.`}
        streak={progress.currentStreak}
      />
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {[
          [String(profile.data?.thoughts || 0), "Thoughts"],
          [String(progress.points), "Light points"],
          [String(progress.currentStreak), "Day streak"],
        ].map(([value, label]) => (
          <View
            key={label}
            style={{
              flex: 1,
              backgroundColor: palette.white,
              borderRadius: radius.md,
              borderCurve: "continuous",
              padding: spacing.md,
              gap: spacing.xs,
            }}
          >
            <Text style={[type.title, { color: palette.ink, fontVariant: ["tabular-nums"] }]}>
              {value}
            </Text>
            <Text style={[type.caption, { color: palette.grey }]}>{label}</Text>
          </View>
        ))}
      </View>
      {editingName ? (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus
            placeholder="Display name"
            style={{
              flex: 1,
              backgroundColor: palette.white,
              borderRadius: radius.full,
              paddingHorizontal: spacing.md,
              minHeight: 48,
            }}
          />
          <Pressable
            onPress={() => saveName.mutate()}
            style={{
              backgroundColor: palette.ink,
              borderRadius: radius.full,
              justifyContent: "center",
              paddingHorizontal: spacing.md,
            }}
          >
            <Text style={{ color: palette.white, fontWeight: "800" }}>Save</Text>
          </Pressable>
        </View>
      ) : null}
      <ProfileAction
        icon={Notification01Icon}
        title={enabling ? "Setting up notices…" : "Enable notifications"}
        subtitle="Responses, likes, community calls"
        onPress={enableNotifications}
      />
      {profile.data?.user.is_anonymous && (
        <ProfileAction
          icon={ShieldUserIcon}
          title="Continue with Google"
          subtitle="Keep your thoughts and unlock a named identity"
          onPress={async () => {
            try {
              await signInWithGoogle();
              await queryClient.invalidateQueries();
            } catch (error) {
              Alert.alert(
                "Google sign-in",
                error instanceof Error ? error.message : "Could not sign in.",
              );
            }
          }}
        />
      )}
      <ProfileAction
        icon={ShieldUserIcon}
        title="Private identity"
        subtitle="Your anonymous account and display name"
        onPress={() => {
          setName(profile.data?.displayName || "");
          setEditingName(true);
        }}
      />
      <ProfileAction
        icon={Settings02Icon}
        title="Safety & privacy"
        subtitle="Guidelines, legal information and account deletion"
        onPress={() => router.push("/safety" as Href)}
      />
    </ScrollView>
  );
}
function ProfileAction({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: typeof Notification01Icon;
  title: string;
  subtitle: string;
  onPress?: () => void;
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
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon icon={icon} />
      <View>
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
