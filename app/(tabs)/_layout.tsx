import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";

import { colors, spacing } from "@/src/theme";

function TabIcon({ name, color, focused }: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={styles.iconContainer}>
      <View
        style={[
          styles.indicator,
          { backgroundColor: focused ? colors.tabIndicatorActive : colors.tabIndicatorInactive },
        ]}
      />
      <FontAwesome name={name} size={20} color={color} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
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
    backgroundColor: colors.tabBarBackground,
    borderTopColor: colors.tabBarBorder,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: "rgba(94, 66, 48, 0.2)",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  tabItem: {
    paddingTop: 2,
  },
  iconContainer: {
    alignItems: "center",
    gap: 3,
  },
  indicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
