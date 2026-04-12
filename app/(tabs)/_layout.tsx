import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, controlSize, fontSize, radius, spacing } from "@/src/theme";

function TabIcon({ name, color, focused }: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.iconContainer, focused ? styles.iconContainerActive : null]}>
        <FontAwesome name={name} size={focused ? 20 : 19} color={color} />
      </View>
      {focused ? <View style={styles.activeMarker} /> : null}
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const floatingBottomMargin = insets.bottom > 0 ? spacing.md : spacing.lg;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarActiveBackgroundColor: colors.backgroundSoft,
        tabBarStyle: [styles.tabBar, { marginBottom: floatingBottomMargin }],
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarIconStyle: styles.iconSlot,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="sun-o" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="calendar" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: "Review",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="line-chart" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="cog" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.tabBarBackground,
    borderTopWidth: 0,
    borderColor: colors.tabBarBorder,
    borderWidth: 1,
    borderRadius: radius.full,
    minHeight: 74,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: Platform.OS === "ios" ? spacing.sm : spacing.xs,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowTabBar,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    letterSpacing: 0.2,
    lineHeight: spacing.lg,
    marginTop: spacing.xs / 2,
  },
  tabItem: {
    borderRadius: radius.full,
    minHeight: controlSize.md,
    marginVertical: spacing.xs / 2,
    marginHorizontal: 1,
    paddingTop: spacing.xs / 2,
    paddingBottom: spacing.xs / 2,
  },
  iconSlot: {
    marginTop: spacing.xs / 2,
    marginBottom: 0,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs / 2,
  },
  iconContainer: {
    width: spacing.lg + spacing.sm + spacing.xs,
    height: spacing.lg + spacing.sm,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerActive: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.borderAmberSoft,
    borderWidth: 1,
  },
  activeMarker: {
    width: spacing.md,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.amber600,
  },
});
