// src/Components/forum/ChatWindow.tsx
import { API_BASE_URL, WS_URL } from "@/config/apiConfig";
import { Send, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Message {
  id: string;
  content: string;
  sender?: { username: string };
  attachmentUrl?: string;
  timestamp: string;
}

interface ChatWindowProps {
  group: { id: string; name?: string };
  currentUsername: string;
}

const ChatWindow = ({ group, currentUsername }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");

  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // 1. FETCH MESSAGES
  const fetchMessages = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/forum/groups/${group.id}/messages`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [group.id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  }, [messages]);

  // 2. WEBSOCKET CONNECTION
  useEffect(() => {
    // Safety: refuse to open ws:// from an https:// page
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      WS_URL.startsWith("ws://")
    ) {
      console.warn(
        "🚫 Refusing to open insecure ws:// from an https:// page. " +
          "Check EXPO_PUBLIC_WS_URL.",
      );
      return;
    }

    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      const connectFrame =
        "CONNECT\naccept-version:1.1,1.2\nheart-beat:10000,10000\n\n\0";
      socket.send(connectFrame);
    };

    socket.onmessage = (event) => {
      const rawData = typeof event.data === "string" ? event.data : "";
      if (rawData === "\n") return;

      const frames = rawData.split("\0").filter((f) => f.trim());
      for (const frame of frames) {
        const [headerSection, ...bodyParts] = frame.split("\n\n");
        const body = bodyParts.join("\n\n");
        const command = headerSection.split("\n")[0];

        if (command === "CONNECTED") {
          console.log("✅ STOMP Connected");
          const subFrame = `SUBSCRIBE\nid:sub-0\ndestination:/topic/group.${group.id}\n\n\0`;
          socket.send(subFrame);
        } else if (command === "MESSAGE" && body) {
          try {
            const newMessage = JSON.parse(body);
            setMessages((prev) => [...prev, newMessage]);
          } catch (e) {
            console.error("Failed to parse WS message", e);
          }
        }
      }
    };

    socket.onerror = (err) => console.error("WebSocket Error:", err);
    socket.onclose = () => console.log("WebSocket Closed");

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [group.id]);

  // 3. SEND MESSAGE
  const handleSend = () => {
    if (
      !inputText.trim() ||
      !socketRef.current ||
      socketRef.current.readyState !== WebSocket.OPEN
    )
      return;

    const payload = {
      content: inputText.trim(),
      sender: { username: currentUsername },
      timestamp: new Date().toISOString(),
    };

    const sendFrame = `SEND\ndestination:/app/group.${group.id}\ncontent-type:application/json\n\n${JSON.stringify(payload)}\0`;
    socketRef.current.send(sendFrame);

    setInputText("");
  };

  // 4. DELETE MESSAGE
  const handleDeleteMessage = (msgId: string) => {
    Alert.alert("Delete Message", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await fetch(`${API_BASE_URL}/forum/messages/${msgId}`, {
              method: "DELETE",
            });
            setMessages((prev) => prev.filter((m) => m.id !== msgId));
          } catch (err) {
            console.error("Delete failed:", err);
            Alert.alert("Error", "Failed to delete message.");
          }
        },
      },
    ]);
  };

  // RENDER MESSAGE BUBBLE
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isSender = item.sender?.username === currentUsername;

      return (
        <View
          style={[
            styles.messageRow,
            isSender ? styles.rowEnd : styles.rowStart,
          ]}
        >
          <View
            style={[
              styles.bubble,
              isSender ? styles.senderBubble : styles.receiverBubble,
            ]}
          >
            {isSender && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteMessage(item.id)}
              >
                <Trash2 size={14} color="#ef4444" />
              </TouchableOpacity>
            )}

            <Text style={styles.messageText}>{item.content}</Text>

            {item.attachmentUrl && (
              <TouchableOpacity
                onPress={() => Linking.openURL(item.attachmentUrl!)}
                style={styles.attachmentLink}
              >
                <Text style={styles.attachmentText}>📎 View Attachment</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
      );
    },
    [currentUsername],
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00529B" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No messages yet. Start the conversation!
            </Text>
          </View>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="#9ca3af"
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Send size={18} color="white" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
};

// ========== STYLES (unchanged) ==========
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 8, color: "#6b7280", fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 8 },

  messageRow: { marginBottom: 12, maxWidth: "80%" },
  rowEnd: { alignSelf: "flex-end" },
  rowStart: { alignSelf: "flex-start" },
  bubble: { padding: 12, borderRadius: 12, position: "relative" },
  senderBubble: { backgroundColor: "#dbeafe", borderBottomRightRadius: 4 },
  receiverBubble: {
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  deleteBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  messageText: { fontSize: 14, color: "#1f2937", lineHeight: 20 },
  attachmentLink: { marginTop: 8, paddingVertical: 4 },
  attachmentText: {
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  timestamp: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 6,
    alignSelf: "flex-end",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: { color: "#9ca3af", fontSize: 14 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "white",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: "#00529B",
    borderRadius: 20,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#9ca3af",
  },
});

export default ChatWindow;
