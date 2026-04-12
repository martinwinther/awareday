import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BlurView } from "expo-blur";
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
      <FontAwesome name={name} size={focused ? 21 : 19} color={color} />
      <View style={[styles.activeMarker, focused ? null : styles.activeMarkerHidden]} />
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
        tabBarActiveBackgroundColor: colors.tabActiveBackground,
        tabBarStyle: [styles.tabBar, { marginBottom: floatingBottomMargin }],
        tabBarBackground: () => (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <BlurView intensity={52} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.tabBarGlassTint} />
          </View>
        ),
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
    backgroundColor: colors.transparent,
    borderTopWidth: 0,
    borderColor: colors.tabBarBorder,
    borderWidth: 1,
    borderRadius: radius.full,
    minHeight: 80,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? spacing.sm : spacing.xs,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowTabBar,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tabBarGlassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.tabBarGlassTint,
  },
  tabLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    letterSpacing: 0.25,
    lineHeight: spacing.lg,
    marginTop: spacing.xs,
  },
  tabItem: {
    borderRadius: radius.full,
    minHeight: controlSize.lg + spacing.xs,
    marginVertical: spacing.xs / 2,
    marginHorizontal: spacing.xs / 2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  iconSlot: {
    marginTop: 0,
    marginBottom: spacing.xs / 2,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  activeMarker: {
    width: spacing.xl,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.tabActiveMarker,
  },
  activeMarkerHidden: {
    opacity: 0,
  },
});
