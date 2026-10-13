import { Text, TextStyle } from "react-native";

interface FlagProps {
  countryCode: string;
  style?: TextStyle;
}

export default function Flag({ countryCode, style }: FlagProps) {
  // Converts country code "US" to flag emoji 🇺🇸
  const flagEmoji = String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map(
      (c) => 0x1f1e6 + c.charCodeAt(0) - 65,
    ),
  );

  return <Text style={[{ fontSize: 20 }, style]}>{flagEmoji}</Text>;
}
