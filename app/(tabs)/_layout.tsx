import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, controlSize, fontSize, radius, spacing } from "@/src/theme";

const TAB_ICON_BY_ROUTE: Record<string, React.ComponentProps<typeof FontAwesome>["name"]> = {
  index: "sun-o",
  history: "calendar",
  review: "line-chart",
  settings: "cog",
};

function TabIcon({ name, color, focused }: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      <FontAwesome name={name} size={focused ? 20 : 19} color={color} />
    </View>
  );
}

function getTabLabel(routeName: string, tabBarLabel?: string | ((props: { focused: boolean; color: string; position: "below-icon" | "beside-icon"; children: string }) => React.ReactNode), title?: string): string {
  if (typeof tabBarLabel === "string") {
    return tabBarLabel;
  }

  if (typeof title === "string") {
    return title;
  }

  return routeName;
}

function FloatingTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const bottomOffset = insets.bottom > 0 ? insets.bottom + spacing.xs : spacing.lg;

  return (
    <View pointerEvents="box-none" style={[styles.tabBarOuter, { bottom: bottomOffset }]}> 
      <View style={styles.tabBarShell}>
        <BlurView intensity={44} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.tabBarGlassTint} />

        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const descriptor = descriptors[route.key];
            const focused = state.index === index;
            const label = getTabLabel(route.name, descriptor.options.tabBarLabel, descriptor.options.title);
            const iconName = TAB_ICON_BY_ROUTE[route.name] ?? "circle-o";
            const color = focused ? colors.tabActive : colors.tabInactive;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
                testID={descriptor.options.tabBarButtonTestID}
                style={({ pressed }) => [
                  styles.tabButton,
                  focused ? styles.tabButtonActive : null,
                  pressed ? styles.tabButtonPressed : null,
                ]}
              >
                <TabIcon name={iconName} color={color} focused={focused} />
                <Text numberOfLines={1} style={[styles.tabLabel, focused ? styles.tabLabelActive : null]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: "Review",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
  },
  tabBarShell: {
    backgroundColor: colors.transparent,
    borderColor: colors.tabBarBorder,
    borderWidth: 1,
    borderRadius: radius.full,
    height: 72,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowTabBar,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabBarGlassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.tabBarGlassTint,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "stretch",
    flex: 1,
  },
  tabButton: {
    flex: 1,
    borderRadius: radius.full,
    minHeight: controlSize.md + spacing.sm,
    marginHorizontal: spacing.xs / 2,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xs / 2,
    paddingBottom: spacing.xs / 2,
  },
  tabButtonActive: {
    backgroundColor: colors.tabActivePill,
  },
  tabButtonPressed: {
    opacity: 0.8,
  },
  tabLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    letterSpacing: 0.2,
    lineHeight: 15,
    marginTop: 2,
    color: colors.tabInactive,
  },
  tabLabelActive: {
    color: colors.tabActive,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 20,
  },
});
