import { Tabs } from "expo-router";
import { Home } from "lucide-react-native";
import { useThemeColor } from "heroui-native";

export default function AppLayout() {
  const [background, border, accent, muted] = useThemeColor([
    "background",
    "border",
    "accent",
    "muted",
  ]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: background,
          borderTopColor: border,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
