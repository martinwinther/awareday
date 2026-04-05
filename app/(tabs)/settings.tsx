import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, TextInput, Pressable, ActivityIndicator, Alert, Platform, useWindowDimensions } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { FirebaseError } from "firebase/app";
import { Card } from "@/src/components/card";
import { SectionLabel } from "@/src/components/section-label";
import { useAuthUser, signOutCurrentUser } from "@/src/lib/firebase/auth";
import { normalizeLabelName, type ActivityLabel, type EventLabel } from "@/src/lib/domain";
import {
  createActivityLabelIfMissing,
  createEventLabelIfMissing,
  deleteActivityLabel,
  deleteEventLabel,
  listActivityLabels,
  listEventLabels,
  updateActivityLabel,
  updateEventLabel,
} from "@/src/lib/firestore/repositories";
import {
  colors,
  spacing,
  radius,
  fontSize,
  controlSize,
  layout,
  getScreenHorizontalPadding,
} from "@/src/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof FirebaseError) return error.message;
  return fallback;
}

function confirmDelete(name: string): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`Delete label "${name}"? You can add it again later.`));
  }
  return new Promise((resolve) => {
    Alert.alert("Delete label", `Delete "${name}"? You can add it again later.`, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Delete label", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuthUser();
  const [activityLabels, setActivityLabels] = useState<ActivityLabel[]>([]);
  const [eventLabels, setEventLabels] = useState<EventLabel[]>([]);
  const [isLoadingActivityLabels, setIsLoadingActivityLabels] = useState(true);
  const [isLoadingEventLabels, setIsLoadingEventLabels] = useState(true);
  const [activeMutationKey, setActiveMutationKey] = useState<string | null>(null);
  const [activityLabelInput, setActivityLabelInput] = useState("");
  const [eventLabelInput, setEventLabelInput] = useState("");
  const [editingActivityLabelId, setEditingActivityLabelId] = useState<string | null>(null);
  const [editingEventLabelId, setEditingEventLabelId] = useState<string | null>(null);
  const [editingActivityLabelInput, setEditingActivityLabelInput] = useState("");
  const [editingEventLabelInput, setEditingEventLabelInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadActivityLabelsFromFirestore = useCallback(async (userId: string) => {
    setIsLoadingActivityLabels(true);
    try {
      setActivityLabels(await listActivityLabels(userId));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not load activity labels."));
      setActivityLabels([]);
    } finally {
      setIsLoadingActivityLabels(false);
    }
  }, []);

  const loadEventLabelsFromFirestore = useCallback(async (userId: string) => {
    setIsLoadingEventLabels(true);
    try {
      setEventLabels(await listEventLabels(userId));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not load event labels."));
      setEventLabels([]);
    } finally {
      setIsLoadingEventLabels(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setActivityLabels([]);
      setEventLabels([]);
      setIsLoadingActivityLabels(false);
      setIsLoadingEventLabels(false);
      setActivityLabelInput("");
      setEventLabelInput("");
      setEditingActivityLabelId(null);
      setEditingEventLabelId(null);
      setEditingActivityLabelInput("");
      setEditingEventLabelInput("");
      setActiveMutationKey(null);
      setErrorMessage(null);
      return;
    }

    setErrorMessage(null);
    void loadActivityLabelsFromFirestore(user.uid);
    void loadEventLabelsFromFirestore(user.uid);
  }, [loadActivityLabelsFromFirestore, loadEventLabelsFromFirestore, user]);

  const isMutating = activeMutationKey !== null;
  const hasLoadedLabels = !isLoadingActivityLabels && !isLoadingEventLabels;
  const hasNoSavedLabels = hasLoadedLabels && activityLabels.length === 0 && eventLabels.length === 0;
  const contentHorizontalPadding = getScreenHorizontalPadding(width, Platform.OS === "web");

  // Activity label handlers

  const handleAddActivityLabel = async () => {
    if (!user) return;
    const cleaned = activityLabelInput.trim();
    if (cleaned.length === 0) { setErrorMessage("Enter an activity label to save it."); return; }

    setActiveMutationKey("activity:add");
    setErrorMessage(null);
    try {
      await createActivityLabelIfMissing({ userId: user.uid, name: cleaned });
      setActivityLabelInput("");
      await loadActivityLabelsFromFirestore(user.uid);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "We could not save that activity label. Please try again."));
    } finally {
      setActiveMutationKey(null);
    }
  };

  const handleSaveActivityLabel = async (labelId: string) => {
    if (!user) return;
    const cleaned = editingActivityLabelInput.trim();
    if (cleaned.length === 0) { setErrorMessage("Activity labels cannot be empty."); return; }

    const normalizedName = normalizeLabelName(cleaned);
    const isDuplicate = activityLabels.some((l) => l.id !== labelId && l.normalizedName === normalizedName);
    if (isDuplicate) { setErrorMessage("That activity label already exists."); return; }

    setActiveMutationKey(`activity:save:${labelId}`);
    setErrorMessage(null);
    try {
      await updateActivityLabel({ userId: user.uid, id: labelId, name: cleaned });
      setEditingActivityLabelId(null);
      setEditingActivityLabelInput("");
      await loadActivityLabelsFromFirestore(user.uid);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "We could not update that activity label. Please try again."));
    } finally {
      setActiveMutationKey(null);
    }
  };

  const handleDeleteActivityLabel = async (label: ActivityLabel) => {
    if (!user) return;
    const confirmed = await confirmDelete(label.name);
    if (!confirmed) return;

    setActiveMutationKey(`activity:delete:${label.id}`);
    setErrorMessage(null);
    try {
      await deleteActivityLabel({ userId: user.uid, id: label.id });
      if (editingActivityLabelId === label.id) {
        setEditingActivityLabelId(null);
        setEditingActivityLabelInput("");
      }
      await loadActivityLabelsFromFirestore(user.uid);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "We could not delete that activity label. Please try again."));
    } finally {
      setActiveMutationKey(null);
    }
  };

  // Event label handlers

  const handleAddEventLabel = async () => {
    if (!user) return;
    const cleaned = eventLabelInput.trim();
    if (cleaned.length === 0) { setErrorMessage("Enter an event label to save it."); return; }

    setActiveMutationKey("event:add");
    setErrorMessage(null);
    try {
      await createEventLabelIfMissing({ userId: user.uid, name: cleaned });
      setEventLabelInput("");
      await loadEventLabelsFromFirestore(user.uid);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "We could not save that event label. Please try again."));
    } finally {
      setActiveMutationKey(null);
    }
  };

  const handleSaveEventLabel = async (labelId: string) => {
    if (!user) return;
    const cleaned = editingEventLabelInput.trim();
    if (cleaned.length === 0) { setErrorMessage("Event labels cannot be empty."); return; }

    const normalizedName = normalizeLabelName(cleaned);
    const isDuplicate = eventLabels.some((l) => l.id !== labelId && l.normalizedName === normalizedName);
    if (isDuplicate) { setErrorMessage("That event label already exists."); return; }

    setActiveMutationKey(`event:save:${labelId}`);
    setErrorMessage(null);
    try {
      await updateEventLabel({ userId: user.uid, id: labelId, name: cleaned });
      setEditingEventLabelId(null);
      setEditingEventLabelInput("");
      await loadEventLabelsFromFirestore(user.uid);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "We could not update that event label. Please try again."));
    } finally {
      setActiveMutationKey(null);
    }
  };

  const handleDeleteEventLabel = async (label: EventLabel) => {
    if (!user) return;
    const confirmed = await confirmDelete(label.name);
    if (!confirmed) return;

    setActiveMutationKey(`event:delete:${label.id}`);
    setErrorMessage(null);
    try {
      await deleteEventLabel({ userId: user.uid, id: label.id });
      if (editingEventLabelId === label.id) {
        setEditingEventLabelId(null);
        setEditingEventLabelInput("");
      }
      await loadEventLabelsFromFirestore(user.uid);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "We could not delete that event label. Please try again."));
    } finally {
      setActiveMutationKey(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutCurrentUser();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "We could not sign you out. Please try again."));
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingHorizontal: contentHorizontalPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.slimTopCard}>
          <View style={styles.slimTopSection}>
            <SectionLabel>Settings</SectionLabel>
            <Text style={styles.heading}>Saved labels</Text>
            {hasNoSavedLabels ? (
              <View style={styles.emptyNotice}>
                <Text style={styles.emptyTitle}>No saved labels yet.</Text>
                <Text style={styles.emptyDescription}>Add activity and event labels below for faster logging on Today.</Text>
              </View>
            ) : null}
          </View>
        </Card>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>We could not save your changes.</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Activity labels */}
        <Card>
          <View style={styles.section}>
            <SectionLabel>Activity labels</SectionLabel>
            <View style={styles.addForm}>
              <TextInput
                style={styles.input}
                value={activityLabelInput}
                onChangeText={setActivityLabelInput}
                placeholder="Activity label name"
                placeholderTextColor={colors.stone400}
                editable={!isMutating}
              />
              <Pressable
                style={[styles.addButton, isMutating && styles.disabled]}
                onPress={() => void handleAddActivityLabel()}
                disabled={isMutating}
                accessibilityRole="button"
                accessibilityLabel="Add activity label"
                accessibilityHint="Saves the activity label you entered"
              >
                {activeMutationKey === "activity:add" ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <FontAwesome name="plus" size={14} color={colors.white} />
                )}
              </Pressable>
            </View>

            {isLoadingActivityLabels ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.amber600} />
                <Text style={styles.loadingText}>Loading activity labels</Text>
              </View>
            ) : activityLabels.length === 0 ? (
              <Text style={styles.emptyText}>No activity labels yet.</Text>
            ) : (
              <View style={styles.labelList}>
                {activityLabels.map((label) => {
                  const isEditing = editingActivityLabelId === label.id;
                  const isSaving = activeMutationKey === `activity:save:${label.id}`;

                  if (isEditing) {
                    return (
                      <View key={label.id} style={styles.labelRow}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          value={editingActivityLabelInput}
                          onChangeText={setEditingActivityLabelInput}
                          editable={!isMutating}
                          autoFocus
                        />
                        <View style={styles.labelActions}>
                          <Pressable
                            style={[styles.actionButton, styles.actionButtonPrimary, isMutating && styles.disabled]}
                            onPress={() => void handleSaveActivityLabel(label.id)}
                            disabled={isMutating}
                          >
                            <Text style={styles.actionButtonPrimaryText}>{isSaving ? "Saving..." : "Save"}</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.actionButton, isMutating && styles.disabled]}
                            onPress={() => { setEditingActivityLabelId(null); setEditingActivityLabelInput(""); }}
                            disabled={isMutating}
                          >
                            <Text style={styles.actionButtonText}>Cancel</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View key={label.id} style={styles.labelRow}>
                      <Text style={styles.labelName} numberOfLines={1}>{label.name}</Text>
                      <View style={styles.labelActions}>
                        <Pressable
                          style={[styles.actionButton, styles.actionButtonIconOnly, isMutating && styles.disabled]}
                          onPress={() => { setEditingActivityLabelId(label.id); setEditingActivityLabelInput(label.name); }}
                          disabled={isMutating}
                          accessibilityLabel={`Rename ${label.name}`}
                        >
                          <FontAwesome name="pencil" size={12} color={colors.stone700} />
                        </Pressable>
                        <Pressable
                          style={[styles.actionButton, styles.actionButtonWarning, styles.actionButtonIconOnly, isMutating && styles.disabled]}
                          onPress={() => void handleDeleteActivityLabel(label)}
                          disabled={isMutating}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${label.name}`}
                          accessibilityHint="Removes this activity label"
                        >
                          <FontAwesome name="trash" size={12} color={colors.white} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </Card>

        {/* Event labels */}
        <Card>
          <View style={styles.section}>
            <SectionLabel>Event labels</SectionLabel>
            <View style={styles.addForm}>
              <TextInput
                style={styles.input}
                value={eventLabelInput}
                onChangeText={setEventLabelInput}
                placeholder="Event label name"
                placeholderTextColor={colors.stone400}
                editable={!isMutating}
              />
              <Pressable
                style={[styles.addButton, isMutating && styles.disabled]}
                onPress={() => void handleAddEventLabel()}
                disabled={isMutating}
                accessibilityRole="button"
                accessibilityLabel="Add event label"
                accessibilityHint="Saves the event label you entered"
              >
                {activeMutationKey === "event:add" ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <FontAwesome name="plus" size={14} color={colors.white} />
                )}
              </Pressable>
            </View>

            {isLoadingEventLabels ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.amber600} />
                <Text style={styles.loadingText}>Loading event labels</Text>
              </View>
            ) : eventLabels.length === 0 ? (
              <Text style={styles.emptyText}>No event labels yet.</Text>
            ) : (
              <View style={styles.labelList}>
                {eventLabels.map((label) => {
                  const isEditing = editingEventLabelId === label.id;
                  const isSaving = activeMutationKey === `event:save:${label.id}`;

                  if (isEditing) {
                    return (
                      <View key={label.id} style={styles.labelRow}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          value={editingEventLabelInput}
                          onChangeText={setEditingEventLabelInput}
                          editable={!isMutating}
                          autoFocus
                        />
                        <View style={styles.labelActions}>
                          <Pressable
                            style={[styles.actionButton, styles.actionButtonPrimary, isMutating && styles.disabled]}
                            onPress={() => void handleSaveEventLabel(label.id)}
                            disabled={isMutating}
                          >
                            <Text style={styles.actionButtonPrimaryText}>{isSaving ? "Saving..." : "Save"}</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.actionButton, isMutating && styles.disabled]}
                            onPress={() => { setEditingEventLabelId(null); setEditingEventLabelInput(""); }}
                            disabled={isMutating}
                          >
                            <Text style={styles.actionButtonText}>Cancel</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View key={label.id} style={styles.labelRow}>
                      <Text style={styles.labelName} numberOfLines={1}>{label.name}</Text>
                      <View style={styles.labelActions}>
                        <Pressable
                          style={[styles.actionButton, styles.actionButtonIconOnly, isMutating && styles.disabled]}
                          onPress={() => { setEditingEventLabelId(label.id); setEditingEventLabelInput(label.name); }}
                          disabled={isMutating}
                          accessibilityLabel={`Rename ${label.name}`}
                        >
                          <FontAwesome name="pencil" size={12} color={colors.stone700} />
                        </Pressable>
                        <Pressable
                          style={[styles.actionButton, styles.actionButtonWarning, styles.actionButtonIconOnly, isMutating && styles.disabled]}
                          onPress={() => void handleDeleteEventLabel(label)}
                          disabled={isMutating}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${label.name}`}
                          accessibilityHint="Removes this event label"
                        >
                          <FontAwesome name="trash" size={12} color={colors.white} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </Card>

        {/* Sign out */}
        <Card>
          <View style={styles.section}>
            <SectionLabel>Account</SectionLabel>
            <Pressable
              style={styles.signOutButton}
              onPress={() => void handleSignOut()}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              accessibilityHint="Signs you out of your Awareday account"
            >
              <Text style={styles.signOutButtonText}>Sign out</Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
    gap: spacing["2xl"],
    paddingBottom: spacing["4xl"],
  },
  section: { gap: spacing.md },
  slimTopCard: {
    minHeight: 96,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  slimTopSection: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.xs,
  },
  heading: { fontSize: fontSize.lg, fontWeight: "700", color: colors.stone900 },
  description: { fontSize: fontSize.sm, color: colors.stone600, lineHeight: 20 },
  errorBox: { backgroundColor: colors.rose50, borderWidth: 1, borderColor: colors.rose200, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  errorTitle: { fontSize: fontSize.sm, fontWeight: "600", color: colors.rose700 },
  errorText: { fontSize: fontSize.xs, color: colors.rose700 },
  emptyNotice: {
    backgroundColor: colors.backgroundRaisedWarm,
    borderWidth: 1,
    borderColor: colors.borderAmberStrong,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  emptyTitle: { fontSize: fontSize.sm, fontWeight: "600", color: colors.stone700 },
  emptyDescription: { fontSize: fontSize.xs, color: colors.stone500, lineHeight: 18 },
  emptyText: { fontSize: fontSize.sm, color: colors.stone500, fontStyle: "italic" },
  loadingContainer: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  loadingText: { fontSize: fontSize.sm, color: colors.stone500 },
  addForm: { flexDirection: "row", gap: spacing.sm },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderAmberSoft,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md + 2,
    fontSize: fontSize.sm,
    color: colors.stone900,
  },
  addButton: {
    height: 44,
    width: 44,
    borderRadius: radius.full,
    backgroundColor: colors.amber900,
    justifyContent: "center",
    alignItems: "center",
  },
  disabled: { opacity: 0.45 },
  labelList: { gap: spacing.sm },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.amber100,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  labelName: { flex: 1, fontSize: fontSize.sm, fontWeight: "500", color: colors.stone800 },
  labelActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  actionButton: {
    borderWidth: 1,
    borderColor: colors.borderAmber,
    backgroundColor: colors.backgroundRaisedTint,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  actionButtonText: { fontSize: fontSize.xs, fontWeight: "500", color: colors.stone700 },
  actionButtonPrimary: { backgroundColor: colors.amber900, borderColor: colors.amber900 },
  actionButtonPrimaryText: { fontSize: fontSize.xs, fontWeight: "500", color: colors.white },
  actionButtonWarning: { backgroundColor: colors.orange700, borderColor: colors.orange700 },
  actionButtonIconOnly: {
    width: controlSize.md,
    height: controlSize.md,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: colors.rose200,
    backgroundColor: colors.rose50,
    borderRadius: radius.md,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutButtonText: { fontSize: fontSize.sm, fontWeight: "600", color: colors.rose700 },
});
