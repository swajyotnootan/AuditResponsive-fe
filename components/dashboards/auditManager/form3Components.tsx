import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    FileText,
    MessageSquare,
    X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ════ STRICT MONOCHROMATIC MNC PALETTE ═════
export const COLORS = {
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
  primaryBorder: "#DBEAFE",
  primaryDark: "#1E3A8A",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textValue: "#334155",
  textMuted: "#64748B",
  stateSuccessBg: "#EFF6FF",
  stateErrorBg: "#F1F5F9",
  stateWarningBg: "#F8FAFC",
  stateErrorText: "#475569",
  stateWarningText: "#64748B",
};

// ═════ REUSABLE UI COMPONENTS ═════
export const Card = ({ children, className = "" }: any) => (
  <View
    className={`mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}
    style={{
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    }}
  >
    {children}
  </View>
);

export const AlertBanner = ({
  type,
  title,
  message,
  footer,
  icon: Icon,
}: any) => {
  const stylesMap: any = {
    error: {
      bg: COLORS.stateErrorBg,
      border: COLORS.border,
      color: COLORS.stateErrorText,
      iconColor: COLORS.stateErrorText,
      iconBg: "#E2E8F0",
    },
    warning: {
      bg: COLORS.stateWarningBg,
      border: COLORS.border,
      color: COLORS.stateWarningText,
      iconColor: COLORS.stateWarningText,
      iconBg: "#F1F5F9",
    },
    success: {
      bg: COLORS.stateSuccessBg,
      border: COLORS.primaryBorder,
      color: COLORS.primaryDark,
      iconColor: COLORS.primary,
      iconBg: "#FFFFFF",
    },
  };
  const s = stylesMap[type] || stylesMap.error;
  return (
    <View
      className="mb-6 flex-row gap-4 rounded-2xl border p-5"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{
          backgroundColor: s.iconBg,
          borderColor: s.border,
          borderWidth: 1,
        }}
      >
        <Icon size={20} color={s.iconColor} />
      </View>
      <View className="flex-1 justify-center">
        <Text className="text-sm font-bold" style={{ color: s.color }}>
          {title}
        </Text>
        <Text
          className="mt-1 text-sm leading-5 opacity-90"
          style={{ color: s.color }}
        >
          {message}
        </Text>
        {footer && (
          <Text
            className="mt-2 text-xs font-semibold uppercase tracking-wide opacity-70"
            style={{ color: s.color }}
          >
            {footer}
          </Text>
        )}
      </View>
    </View>
  );
};

export const PlanStatusBadge = ({ status }: { status: string }) => {
  const sMap: any = {
    APPROVED: {
      bg: COLORS.stateSuccessBg,
      color: COLORS.primaryDark,
      border: COLORS.primaryBorder,
      text: "Approved",
      icon: CheckCircle,
    },
    PENDING_APPROVAL: {
      bg: COLORS.primaryLight,
      color: COLORS.primary,
      border: COLORS.primaryBorder,
      text: "Pending Approval",
      icon: Clock,
    },
    REJECTED: {
      bg: COLORS.stateErrorBg,
      color: COLORS.stateErrorText,
      border: COLORS.border,
      text: "Rejected",
      icon: X,
    },
    CHANGE_REQUESTED: {
      bg: COLORS.stateWarningBg,
      color: COLORS.stateWarningText,
      border: COLORS.border,
      text: "Changes Requested",
      icon: MessageSquare,
    },
  };
  const s = sMap[status] || {
    bg: "#F1F5F9",
    color: "#475569",
    border: "#E2E8F0",
    text: "Draft",
    icon: FileText,
  };
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <s.icon size={14} color={s.color} />
      <Text
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: s.color }}
      >
        {s.text}
      </Text>
    </View>
  );
};

export const StatusBadge = ({
  status,
  count = 0,
}: {
  status: string;
  count?: number;
}) => {
  const isPlanned = status === "PLANNED";
  const isCompleted = status === "COMPLETED";

  // Exact match to PlanDetailsModal styles
  const badgeStyle = isCompleted
    ? {
        backgroundColor: "#BFDBFE", // COLORS.blue200
        borderColor: "#2563EB", // COLORS.primary
      }
    : isPlanned
      ? {
          backgroundColor: "#EFF6FF", // COLORS.primaryLight
          borderColor: "#DBEAFE", // COLORS.primaryBorder
        }
      : {
          backgroundColor: "#F8FAFC", // COLORS.bg
          borderColor: "#E2E8F0", // COLORS.border
        };

  const base = (
    <View
      style={[
        {
          width: 28,
          height: 28,
          borderRadius: 6,
          borderWidth: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        badgeStyle,
      ]}
    >
      {isCompleted ? (
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1E3A8A" }}>
          C
        </Text>
      ) : isPlanned ? (
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1E3A8A" }}>
          P
        </Text>
      ) : (
        <Text style={{ fontSize: 14, fontWeight: "500", color: "#94A3B8" }}>
          —
        </Text>
      )}
    </View>
  );

  if (count <= 0) return base;

  return (
    <View className="relative">
      {base}
      {/* Count Bubble */}
      <View
        style={{
          position: "absolute",
          top: -6,
          right: -6,
          minWidth: 16,
          height: 16,
          paddingHorizontal: 3,
          borderRadius: 8,
          backgroundColor: "#1E3A8A",
          borderWidth: 1.5,
          borderColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 9,
            fontWeight: "800",
            color: "#FFFFFF",
            lineHeight: 11,
          }}
        >
          {count > 99 ? "99+" : count}
        </Text>
      </View>
    </View>
  );
};

export const ActionModal = ({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  iconColor,
  iconBg,
  value,
  setValue,
  placeholder,
  onSubmit,
  submitLabel,
  submitBg,
  submitting,
}: any) => {
  if (!isOpen) return null;
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 items-center justify-center bg-slate-900/30 p-6"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="w-full max-w-md overflow-hidden rounded-3xl bg-white"
          style={{
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.05,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <View className="flex-row items-center gap-4 border-b border-slate-100 p-6">
            <View
              className="h-12 w-12 items-center justify-center rounded-2xl border border-slate-100"
              style={{ backgroundColor: iconBg }}
            >
              <Icon size={22} color={iconColor} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-900">{title}</Text>
              <Text className="mt-1 text-sm text-slate-500">{description}</Text>
            </View>
          </View>
          <View className="p-6">
            <TextInput
              className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"
              value={value}
              onChangeText={setValue}
              multiline
              numberOfLines={5}
              placeholder={placeholder}
              placeholderTextColor="#94A3B8"
              textAlignVertical="top"
            />
          </View>
          <View className="flex-row justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-6">
            <TouchableOpacity
              onPress={onClose}
              className="h-11 justify-center rounded-xl border border-slate-200 bg-white px-6"
              activeOpacity={0.7}
            >
              <Text className="text-sm font-semibold text-slate-600">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSubmit}
              disabled={!value.trim() || submitting}
              className="h-11 flex-row items-center justify-center gap-2 rounded-xl px-6"
              style={{
                backgroundColor:
                  !value.trim() || submitting ? "#CBD5E1" : submitBg,
                opacity: !value.trim() || submitting ? 0.7 : 1,
              }}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Icon size={16} color="#FFF" />
              )}
              <Text className="text-sm font-semibold text-white">
                {submitLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  confirmBg = COLORS.primary,
  icon: Icon = AlertCircle,
  submitting = false,
}: any) => {
  if (!isOpen) return null;
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 items-center justify-center bg-slate-900/30 p-6"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="w-full max-w-sm overflow-hidden rounded-3xl bg-white"
          style={{
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.05,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <View className="items-center p-6">
            <View
              className="mb-4 h-12 w-12 items-center justify-center rounded-2xl border border-slate-100"
              style={{ backgroundColor: COLORS.primaryLight }}
            >
              <Icon size={22} color={COLORS.primary} />
            </View>
            <Text className="text-center text-base font-bold text-slate-900">
              {title}
            </Text>
            <Text className="mt-2 text-center text-sm text-slate-500">
              {message}
            </Text>
          </View>
          <View className="flex-row justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-4">
            <TouchableOpacity
              onPress={onClose}
              className="h-10 flex-1 justify-center rounded-xl border border-slate-200 bg-white px-4"
              activeOpacity={0.7}
            >
              <Text className="text-center text-sm font-semibold text-slate-600">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              disabled={submitting}
              className="h-10 flex-1 flex-row items-center justify-center gap-2 rounded-xl px-4"
              style={{ backgroundColor: confirmBg }}
              activeOpacity={0.8}
            >
              {submitting && <ActivityIndicator size="small" color="#FFF" />}
              <Text className="text-center text-sm font-semibold text-white">
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export const StatusChip = ({ status }: { status: string }) => {
  const map: any = {
    DRAFT: { bg: "#F1F5F9", color: "#475569" },
    PENDING_LA_CONFIRMATION: { bg: "#FEF3C7", color: "#92400E" },
    PENDING_APPROVAL: { bg: "#FEF3C7", color: "#92400E" },
    CONFIRMED_BY_LA: { bg: "#DBEAFE", color: "#1E40AF" },
    APPROVED: { bg: "#DCFCE7", color: "#166534" },
    REJECTED: { bg: "#FEE2E2", color: "#991B1B" },
    FEASIBILITY_REJECTED: { bg: "#FEE2E2", color: "#991B1B" },
    CHANGE_REQUESTED: { bg: "#FEF3C7", color: "#92400E" },
  };
  const s = map[status] || { bg: "#F1F5F9", color: "#475569" };
  return (
    <View
      style={{
        backgroundColor: s.bg,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
      }}
    >
      <Text style={{ color: s.color, fontSize: 10, fontWeight: "700" }}>
        {status?.replace(/_/g, " ")}
      </Text>
    </View>
  );
};

export const ScheduleCard = ({ item }: { item: any }) => {
  const formatDate = (d: any) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(d);
    }
  };
  const teamNames = Array.isArray(item.coAuditorNames)
    ? item.coAuditorNames.filter((n: string) => n !== item.auditorName)
    : [];
  const auditeeNames = Array.isArray(item.auditeeNames)
    ? item.auditeeNames
    : item.auditeeName
      ? [item.auditeeName]
      : [];

  return (
    <View className="mb-3 rounded-xl border border-slate-200 bg-white p-4">
      <View className="mb-2 flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-900">
            {item.department || "—"}
          </Text>
          <Text className="mt-0.5 text-xs text-slate-500">
            {item.auditType || "General Audit"}
          </Text>
        </View>
        <StatusChip status={item.detailedApprovalStatus || item.status} />
      </View>
      <View className="mt-2 gap-1.5">
        <View className="flex-row items-center gap-2">
          <Calendar size={13} color="#64748B" />
          <Text className="text-xs text-slate-600">
            {formatDate(item.scheduledDate)}
            {item.week ? `  •  ${item.week}` : ""}
          </Text>
        </View>
        {(item.startTime || item.endTime) && (
          <View className="flex-row items-center gap-2">
            <Clock size={13} color="#64748B" />
            <Text className="text-xs text-slate-600">
              {item.startTime || "—"} – {item.endTime || "—"}
            </Text>
          </View>
        )}
        <View className="flex-row items-center gap-2">
          <Text className="text-[11px] font-semibold text-slate-500">
            AUDITOR:
          </Text>
          <Text className="flex-1 text-xs text-slate-700">
            {item.auditorName || "—"}
          </Text>
        </View>
        {teamNames.length > 0 && (
          <View className="flex-row items-center gap-2">
            <Text className="text-[11px] font-semibold text-slate-500">
              TEAM:
            </Text>
            <Text className="flex-1 text-xs text-slate-700">
              {teamNames.join(", ")}
            </Text>
          </View>
        )}
        {auditeeNames.length > 0 && (
          <View className="flex-row items-center gap-2">
            <Text className="text-[11px] font-semibold text-slate-500">
              AUDITEE:
            </Text>
            <Text className="flex-1 text-xs text-slate-700">
              {auditeeNames.join(", ")}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export const ScheduleDetailsModal = ({
  visible,
  onClose,
  auditElement,
  month,
  year,
  loading,
  error,
  schedules,
}: any) => {
  if (!visible) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 items-center justify-center bg-slate-900/40 p-4"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white"
          style={{
            maxHeight: "85%",
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 12,
          }}
        >
          <View className="flex-row items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">
                {auditElement}
              </Text>
              <Text className="mt-0.5 text-xs text-slate-500">
                {month} {year} · {schedules.length} schedule
                {schedules.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-lg bg-white"
              activeOpacity={0.7}
            >
              <X size={18} color="#475569" />
            </TouchableOpacity>
          </View>
          <ScrollView
            className="px-5 py-4"
            style={{ maxHeight: 520 }}
            showsVerticalScrollIndicator={true}
          >
            {loading && (
              <View className="items-center py-10">
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text className="mt-3 text-sm text-slate-500">
                  Loading schedules...
                </Text>
              </View>
            )}
            {!loading && error && (
              <View className="items-center py-10">
                <AlertCircle size={32} color="#94A3B8" />
                <Text className="mt-3 text-sm text-slate-500">{error}</Text>
              </View>
            )}
            {!loading && !error && schedules.length === 0 && (
              <View className="items-center py-10">
                <FileText size={32} color="#CBD5E1" />
                <Text className="mt-3 text-sm font-medium text-slate-500">
                  No schedules yet
                </Text>
                <Text className="mt-1 px-6 text-center text-xs text-slate-400">
                  No detailed schedules for this audit element in {month}.
                  Create them from Form 5 (Daily Schedule).
                </Text>
              </View>
            )}
            {!loading &&
              !error &&
              schedules.map((s: any) => <ScheduleCard key={s.id} item={s} />)}
          </ScrollView>
          <View className="border-t border-slate-200 bg-slate-50 px-5 py-3">
            <TouchableOpacity
              onPress={onClose}
              className="h-10 items-center justify-center rounded-lg bg-slate-900"
              activeOpacity={0.8}
            >
              <Text className="text-sm font-semibold text-white">Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export const OutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
}: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const isH = isHovered && !disabled;
  const webHoverProps =
    Platform.OS === "web"
      ? {
          onMouseEnter: () => !disabled && setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        }
      : {};
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => !disabled && setIsHovered(true)}
      onPressOut={() => !disabled && setIsHovered(false)}
      {...webHoverProps}
      disabled={disabled || loading}
      className="flex-row items-center gap-2 rounded-lg border px-2 py-2.5"
      style={{
        borderColor: isH ? "#2563EB" : "#D1D5DB",
        backgroundColor: isH ? "rgba(37, 99, 235, 0.1)" : "transparent",
        borderWidth: 1,
        opacity: disabled ? 0.5 : 1,
      }}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#2563EB" />
      ) : Icon ? (
        <Icon size={16} color={isH ? "#2563EB" : "#6B7280"} />
      ) : null}
      <Text
        className="text-sm font-semibold"
        style={{ color: isH ? "#2563EB" : "#111827" }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export const MarqueeText = ({ text, style }: { text: string; style?: any }) => {
  const [offset, setOffset] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (
      textWidth === 0 ||
      containerWidth === 0 ||
      textWidth <= containerWidth
    ) {
      setOffset(0);
      return;
    }
    const cycle = textWidth + 60;
    const interval = setInterval(
      () => setOffset((prev) => (prev - 0.6 <= -cycle ? 0 : prev - 0.6)),
      16,
    );
    return () => clearInterval(interval);
  }, [textWidth, containerWidth]);
  return (
    <View
      style={[
        {
          width: "100%",
          height: 30,
          overflow: "hidden",
          justifyContent: "center",
        },
        style,
      ]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - containerWidth) > 1) setContainerWidth(w);
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          transform: [{ translateX: offset }],
        }}
      >
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: "#0F172A",
            marginRight: 60,
            flexShrink: 0,
          }}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0 && Math.abs(w - textWidth) > 1) setTextWidth(w);
          }}
        >
          {text}
        </Text>
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: "#0F172A",
            marginRight: 60,
            flexShrink: 0,
          }}
        >
          {text}
        </Text>
      </View>
    </View>
  );
};

// ═════ STATE-AWARE TOOLTIP (locked mode only) ═════
export const MonthCellTooltip = ({
  visible,
  month,
  year,
  status,
  auditElement,
  count,
  anchor,
}: any) => {
  if (!visible || !anchor || Platform.OS !== "web") return null;

  const W = 240;
  const [tooltipHeight, setTooltipHeight] = useState(0);
  const TAIL = 12;
  const GAP = 12;
  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : 1024;

  const left = Math.max(8, Math.min(anchor.x - W / 2, viewportWidth - W - 8));
  const tailX = Math.max(20, Math.min(W - 20, anchor.x - left));

  const statusColor =
    status === "COMPLETED" ? COLORS.primaryDark : COLORS.primary;
  const statusBg =
    status === "COMPLETED" ? COLORS.stateSuccessBg : COLORS.primaryLight;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "fixed" as any,
        left,
        top: Math.max(8, anchor.y - tooltipHeight - GAP - TAIL),
        width: W,
        zIndex: 999999,
        elevation: 20,
      }}
    >
      {/* Pointer border */}
      <View
        style={{
          position: "absolute",
          bottom: -TAIL,
          left: tailX - TAIL,
          width: 0,
          height: 0,
          borderLeftWidth: TAIL,
          borderRightWidth: TAIL,
          borderTopWidth: TAIL,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: COLORS.border,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -TAIL + 1,
          left: tailX - TAIL + 1,
          width: 0,
          height: 0,
          borderLeftWidth: TAIL - 1,
          borderRightWidth: TAIL - 1,
          borderTopWidth: TAIL - 1,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: "#FFFFFF",
        }}
      />

      {/* Tooltip card */}
      <View
        onLayout={(event) => {
          setTooltipHeight(event.nativeEvent.layout.height);
        }}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 12,
          shadowColor: "#000000",
          shadowOpacity: 0.12,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
        }}
      >
        <View className="mb-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Calendar size={13} color={COLORS.primary} />
            <Text className="text-[13px] font-bold text-slate-900">
              {month} {year}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: statusBg,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 5,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: "700",
                color: statusColor,
              }}
            >
              {status === "COMPLETED"
                ? "Completed"
                : status === "PLANNED"
                  ? "Planned"
                  : "Not Planned"}
            </Text>
          </View>
        </View>

        <Text
          className="text-[11px] font-semibold text-slate-500"
          numberOfLines={2}
        >
          {auditElement}
        </Text>

        {count > 0 ? (
          <View className="mt-2 flex-row items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1.5">
            <Clock size={13} color={COLORS.primary} />
            <Text className="text-[11px] font-bold text-blue-800">
              {count} audit schedule{count !== 1 ? "s" : ""}
            </Text>
          </View>
        ) : (
          <View className="mt-2 flex-row items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
            <FileText size={13} color={COLORS.textMuted} />
            <Text className="text-[11px] font-semibold text-slate-600">
              No schedules yet
            </Text>
          </View>
        )}

        <Text className="mt-2 text-[10px] font-semibold text-slate-500">
          {count > 0 ? "Click to view schedules" : "No schedules to view"}
        </Text>
      </View>
    </View>
  );
};
