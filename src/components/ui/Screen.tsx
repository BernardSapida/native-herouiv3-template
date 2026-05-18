import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ViewStyle } from "react-native";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
};

// SafeAreaView from react-native-safe-area-context is not patched by Uniwind,
// so className (including flex-1) is silently ignored on it. Use a regular View
// with manual inset padding instead.
export function Screen({ children, className, style }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`flex-1 bg-background ${className ?? ""}`}
      style={[
        { paddingTop: insets.top, paddingBottom: insets.bottom },
        style,
      ]}
    >
      {children}
    </View>
  );
}
