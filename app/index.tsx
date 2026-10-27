// app/index.tsx
import { useAuth } from "@/components/context/AuthContext";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ✅ Redirect to a concrete route inside the (app) group, not the group itself
  return user ? <Redirect href="/(tabs)" /> : <Redirect href="/auth/login" />;
}
