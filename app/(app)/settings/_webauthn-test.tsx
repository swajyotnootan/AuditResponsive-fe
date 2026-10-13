// app/(app)/settings/_webauthn-test.tsx
import {
    isWebAuthnAvailable,
    listWebAuthnCredentials,
    loginWithWebAuthn,
    registerWebAuthn,
} from "@/utils/webauthn";
import React, { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function WebAuthnTestScreen() {
  const [log, setLog] = useState<string[]>([]);

  const push = (msg: string) => {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const testAvailability = async () => {
    push("Testing availability...");
    const ok = await isWebAuthnAvailable();
    push(`available: ${ok}`);
  };

  const testList = async () => {
    push("Listing credentials for userId=1...");
    const list = await listWebAuthnCredentials(1);
    push(`credentials: ${JSON.stringify(list, null, 2)}`);
  };

  const testRegister = async () => {
    push("Starting registration (Windows Hello will pop up)...");
    const result = await registerWebAuthn("master");
    push(`register result: ${JSON.stringify(result, null, 2)}`);
  };

  const testLogin = async () => {
    push("Starting login...");
    const result = await loginWithWebAuthn("master");
    push(
      `login result: ${JSON.stringify({ ...result, user: undefined }, null, 2)}`,
    );
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: "#f8fafc" }}>
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12 }}>
        WebAuthn Debug
      </Text>

      <TouchableOpacity onPress={testAvailability} style={s.btn}>
        <Text style={s.btnText}>1. Check availability</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={testList} style={s.btn}>
        <Text style={s.btnText}>2. List credentials (userId=1)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={testRegister}
        style={[s.btn, { backgroundColor: "#3b82f6" }]}
      >
        <Text style={[s.btnText, { color: "white" }]}>
          3. Register (fingerprint prompt)
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={testLogin}
        style={[s.btn, { backgroundColor: "#10b981" }]}
      >
        <Text style={[s.btnText, { color: "white" }]}>
          4. Login with biometrics
        </Text>
      </TouchableOpacity>

      <View
        style={{
          marginTop: 20,
          padding: 12,
          backgroundColor: "#0f172a",
          borderRadius: 8,
        }}
      >
        <Text
          style={{ color: "#86efac", fontFamily: "monospace", fontSize: 11 }}
        >
          {log.join("\n")}
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  btn: {
    padding: 14,
    marginVertical: 6,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
  },
  btnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "center",
  },
});
