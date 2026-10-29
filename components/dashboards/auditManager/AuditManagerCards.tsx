import { ChevronRight, Eye, UserCheck } from "lucide-react-native";
import React, { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { AnimatedGlassCard } from "./AuditManagerCharts";
import { COLORS, styles } from "./AuditManagerStyles";

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  isDesktop: boolean;
  onPress?: () => void;
}

export const KpiCard = ({
  title,
  value,
  icon,
  isDesktop,
  onPress,
}: KpiCardProps) => {
  const card = (
    <AnimatedGlassCard
      style={
        isDesktop
          ? [styles.kpiCard, { flex: 1 }]
          : [styles.kpiCard, { width: "100%" }]
      }
    >
      <View style={styles.kpiIconContainer}>{icon}</View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiTitle}>{title}</Text>
    </AnimatedGlassCard>
  );

  if (!onPress) return card;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {card}
    </TouchableOpacity>
  );
};

export const NcrCard = ({
  title,
  description,
  icon,
  onPress,
  badgeText,
  isDesktop,
}: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={
      isDesktop
        ? styles.ncrCard
        : [styles.ncrCard, { width: "100%", marginBottom: 12 }]
    }
  >
    <View style={styles.ncrCardContent}>
      <View style={styles.ncrCardIcon}>
        {React.cloneElement(icon as any, { color: COLORS.white })}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.ncrCardTitle}>{title}</Text>
        <Text style={styles.ncrCardDesc}>{description}</Text>
      </View>
      <ChevronRight size={20} color={COLORS.primary} style={{ opacity: 0.5 }} />
    </View>
    <View style={styles.ncrCardBadge}>
      <Text style={styles.ncrCardBadgeText}>{badgeText}</Text>
    </View>
  </TouchableOpacity>
);

export const RequestCard = ({
  request,
  onView,
}: {
  request: any;
  onView: (req: any) => void;
}) => {
  const typeLabel = request.type === "RESCHEDULE" ? "Reschedule" : "Extension";
  const typeIcon = request.type === "RESCHEDULE" ? "📅" : "⏰";

  return (
    <TouchableOpacity
      onPress={() => onView(request)}
      style={styles.requestCard}
      activeOpacity={0.7}
    >
      <View style={styles.requestHeader}>
        <View style={styles.requestBadges}>
          <View
            style={[styles.badge, { backgroundColor: COLORS.primaryLight }]}
          >
            <Text style={[styles.badgeText, { color: COLORS.primaryDark }]}>
              <Text>{typeIcon}</Text> {typeLabel}
            </Text>
          </View>
          <Text style={styles.requestDate}>
            {new Date(request.requestedAt).toLocaleDateString()}
          </Text>
          <View style={[styles.badge, { backgroundColor: COLORS.bg }]}>
            <Text style={[styles.badgeText, { color: COLORS.textValue }]}>
              {request.status || "PENDING"}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.requestTitle}>
        {request.auditType} - {request.department}
      </Text>
      <View style={styles.requestSubtitle}>
        <UserCheck size={14} color={COLORS.primary} />
        <Text style={{ fontSize: 14, color: COLORS.textMuted, marginLeft: 6 }}>
          {request.auditorName} → {request.auditeeName}
        </Text>
      </View>
      <View style={styles.requestFooter}>
        <Text style={styles.requestFooterText}>
          {request.type === "RESCHEDULE" || request.rescheduleRequested
            ? `Current: ${request.currentDate || request.scheduledDate || "N/A"} → Requested: ${request.requestedNewDate || request.newDate || "N/A"}`
            : `Current end: ${request.currentDate || request.scheduledDate || "N/A"} → Requested end: ${request.requestedNewToDate || request.newToDate || "N/A"}`}
        </Text>
      </View>
      <View style={styles.requestViewBtn}>
        <Eye size={16} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );
};
