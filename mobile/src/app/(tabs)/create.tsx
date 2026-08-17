import { AudioWaveformIcon, SentIcon, Video01Icon } from "@hugeicons/core-free-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Icon } from "@/components/icon";
import { ScreenHeading } from "@/components/screen-heading";
import { createPost, uploadPostMedia } from "@/api/community";
import { palette, radius, spacing, type } from "@/theme";

export default function CreateScreen() {
  const [thought, setThought] = useState("");
  const [context, setContext] = useState("");
  const [topic, setTopic] = useState("Reflection");
  const [anonymous, setAnonymous] = useState(false);
  const [media, setMedia] = useState<{
    uri: string;
    fileName?: string | null;
    mimeType?: string | null;
    fileSize?: number;
  } | null>(null);
  const queryClient = useQueryClient();
  const publish = useMutation({
    mutationFn: async () => {
      const featured = thought.trim();
      const supporting = context.trim();
      const postId = await createPost({
        topic,
        quote: featured && supporting ? featured : undefined,
        body: supporting || featured,
        anonymous,
      });
      if (media) await uploadPostMedia(postId, media);
      return postId;
    },
    onSuccess: async () => {
      setThought("");
      setContext("");
      setMedia(null);
      setAnonymous(false);
      await queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Published", "Your thought is now live in the SpeakUp community.");
    },
    onError: (error) =>
      Alert.alert(
        "Could not publish",
        error instanceof Error ? error.message : "Please try again.",
      ),
  });
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: "document" });
  const recorderState = useAudioRecorderState(recorder);
  async function toggleRecording() {
    if (recorderState.isRecording) {
      await recorder.stop();
      if (recorder.uri)
        setMedia({
          uri: recorder.uri,
          fileName: `speakup-recording-${Date.now()}.m4a`,
          mimeType: "audio/mp4",
        });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted)
      return Alert.alert(
        "Microphone needed",
        "Enable microphone access to record an audio reflection.",
      );
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    Haptics.selectionAsync();
  }
  async function pickVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMedia({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
      });
    }
  }
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: palette.paper }}
      contentContainerStyle={{
        padding: spacing.md,
        paddingTop: spacing.xl,
        paddingBottom: 120,
        gap: spacing.lg,
      }}
    >
      <ScreenHeading eyebrow="New thought" title="Bring it to light." />
      <View
        style={{
          backgroundColor: palette.white,
          borderRadius: radius.lg,
          borderCurve: "continuous",
          overflow: "hidden",
        }}
      >
        <TextInput
          value={thought}
          onChangeText={setThought}
          placeholder="What truth are you bringing to light?"
          placeholderTextColor="#A8A49B"
          multiline
          maxLength={800}
          style={[
            type.title,
            { minHeight: 170, padding: spacing.lg, color: palette.ink, textAlignVertical: "top" },
          ]}
        />
        <View style={{ height: 1, backgroundColor: "#E2DFD7" }} />
        <TextInput
          value={context}
          onChangeText={setContext}
          placeholder="Add context, a question, or scripture…"
          placeholderTextColor="#A8A49B"
          multiline
          maxLength={1200}
          style={[
            type.body,
            {
              minHeight: 130,
              padding: spacing.lg,
              color: palette.charcoal,
              textAlignVertical: "top",
            },
          ]}
        />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <MediaButton
          label={media?.mimeType?.startsWith("video/") ? "Video ready" : "Video"}
          icon={Video01Icon}
          active={media?.mimeType?.startsWith("video/")}
          onPress={pickVideo}
        />
        <MediaButton
          label={recorderState.isRecording ? "Stop" : recorder.uri ? "Recorded" : "Record"}
          icon={AudioWaveformIcon}
          active={recorderState.isRecording || Boolean(recorder.uri)}
          onPress={toggleRecording}
        />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {["Reflection", "Scripture", "Question", "Culture", "Beyond the walls"].map((item) => (
          <Pressable
            key={item}
            onPress={() => setTopic(item)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.full,
              backgroundColor: topic === item ? palette.ink : palette.white,
            }}
          >
            <Text
              style={{
                color: topic === item ? palette.white : palette.charcoal,
                fontWeight: "700",
              }}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => setAnonymous(!anonymous)}>
        <Text style={{ color: palette.charcoal, fontWeight: "700" }}>
          {anonymous ? "✓ Posting anonymously" : "Post anonymously"}
        </Text>
      </Pressable>
      <Pressable
        disabled={publish.isPending || (!thought.trim() && !context.trim())}
        onPress={() => publish.mutate()}
        style={({ pressed }) => ({
          minHeight: 56,
          borderRadius: radius.full,
          backgroundColor: palette.ink,
          opacity:
            (!thought.trim() && !context.trim()) || publish.isPending ? 0.3 : pressed ? 0.75 : 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
        })}
      >
        <Text style={{ color: palette.white, fontWeight: "800" }}>
          {publish.isPending ? "Publishing…" : "Publish thought"}
        </Text>
        <Icon icon={SentIcon} color={palette.white} />
      </Pressable>
    </ScrollView>
  );
}

function MediaButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: typeof Video01Icon;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? palette.ember : "#C7C3BA",
        backgroundColor: active ? "#FFF3DA" : "transparent",
        paddingHorizontal: spacing.md,
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Icon icon={icon} color={active ? palette.ember : palette.charcoal} />
      <Text style={{ color: palette.charcoal, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
