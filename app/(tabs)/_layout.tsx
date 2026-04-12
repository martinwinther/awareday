import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing } from "@/src/theme";

function TabIcon({ name, color, focused }: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconContainer, focused ? styles.iconContainerActive : null]}>
      <FontAwesome name={name} size={20} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const floatingBottomMargin = insets.bottom > 0 ? spacing.sm : spacing.lg;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarActiveBackgroundColor: colors.backgroundRaisedWarm,
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
    minHeight: 68,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowTabBar,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 1,
  },
  tabItem: {
    borderRadius: radius.full,
    marginVertical: spacing.xs,
    paddingTop: 2,
    paddingBottom: 1,
  },
  iconSlot: {
    marginTop: 2,
    marginBottom: 1,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerActive: {
    backgroundColor: colors.backgroundAmberSoft,
    borderColor: colors.borderAmberSoft,
    borderWidth: 1,
  },
});
