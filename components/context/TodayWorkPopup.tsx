// components/TodayWorkPopup.tsx
import { X } from "lucide-react-native";
import React from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { TodayWorkContent } from "../../components/TodayWorkContent";
import { useTodayWorkPopup } from "./TodayWorkPopupContext";

export const TodayWorkPopup: React.FC = () => {
  const { isOpen, close } = useTodayWorkPopup();
  const { width, height } = useWindowDimensions();

  // ✅ Same breakpoint pattern as login page
  const isWeb = width >= 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  // ✅ Responsive popup dimensions
  const popupWidth = isDesktop
    ? Math.min(900, width * 0.6)
    : isTablet
      ? width * 0.75
      : width * 0.94; // Mobile — leaves 3% margin on each side

  const popupHeight = isDesktop
    ? Math.min(750, height * 0.85)
    : isTablet
      ? height * 0.88
      : height * 0.94; // Mobile — nearly full height with margin

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop tap to close */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={close}
        />

        <View
          style={[styles.popup, { width: popupWidth, height: popupHeight }]}
        >
          {/* Header bar */}
          <View style={styles.popupHeader}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={close}
              style={styles.closeBtn}
              hitSlop={10}
            >
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.popupBody}>
            <TodayWorkContent onClose={close} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  popup: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
      web: {
        // @ts-ignore
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      },
    }),
  },
  popupHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  popupBody: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
});
