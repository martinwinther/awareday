import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenHeader } from "@/src/components/screen-header";
import { Card } from "@/src/components/card";
import { SectionLabel } from "@/src/components/section-label";
import { colors, spacing, fontSize, radius } from "@/src/theme";

const sampleActivityLabels = ["Focus", "Walk", "Read", "Cook"];
const sampleEventLabels = ["Coffee", "Water", "Stretch"];

function LabelRow({ name }: { name: string }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.labelName} numberOfLines={1}>{name}</Text>
      <View style={styles.labelActions}>
        <View style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Rename</Text>
        </View>
        <View style={[styles.actionButton, styles.actionButtonWarning]}>
          <Text style={styles.actionButtonWarningText}>Delete</Text>
        </View>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Settings"
        subtitle="Manage your reusable quick labels."
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={styles.section}>
            <SectionLabel>Settings</SectionLabel>
            <Text style={styles.heading}>Saved labels</Text>
            <Text style={styles.description}>
              Manage quick labels used on Today for activities and events.
            </Text>
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Activity labels</SectionLabel>
            <View style={styles.addForm}>
              <View style={styles.input}>
                <Text style={styles.inputPlaceholder}>Add activity label</Text>
              </View>
              <View style={styles.addButton}>
                <Text style={styles.addButtonText}>Add</Text>
              </View>
            </View>
            <View style={styles.labelList}>
              {sampleActivityLabels.map((name) => (
                <LabelRow key={name} name={name} />
              ))}
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Event labels</SectionLabel>
            <View style={styles.addForm}>
              <View style={styles.input}>
                <Text style={styles.inputPlaceholder}>Add event label</Text>
              </View>
              <View style={styles.addButton}>
                <Text style={styles.addButtonText}>Add</Text>
              </View>
            </View>
            <View style={styles.labelList}>
              {sampleEventLabels.map((name) => (
                <LabelRow key={name} name={name} />
              ))}
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing["3xl"],
  },
  section: {
    gap: spacing.md,
  },
  heading: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.stone900,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.stone600,
    lineHeight: 20,
  },
  addForm: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "rgba(232, 207, 169, 0.7)",
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md + 2,
    justifyContent: "center",
  },
  inputPlaceholder: {
    fontSize: fontSize.sm,
    color: colors.stone400,
  },
  addButton: {
    height: 44,
    borderRadius: radius.xl,
    backgroundColor: colors.amber900,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.white,
  },
  labelList: {
    gap: spacing.sm,
  },
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
  labelName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.stone800,
  },
  labelActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: colors.borderAmber,
    backgroundColor: "#fffbf7",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  actionButtonText: {
    fontSize: fontSize.xs,
    fontWeight: "500",
    color: colors.stone700,
  },
  actionButtonWarning: {
    backgroundColor: colors.orange700,
    borderColor: colors.orange700,
  },
  actionButtonWarningText: {
    fontSize: fontSize.xs,
    fontWeight: "500",
    color: colors.white,
  },
});
