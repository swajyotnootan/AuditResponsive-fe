import { ChevronRight, Eye, UserCheck } from "lucide-react-native";
import React, { ReactNode, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AnimatedGlassCard } from "./AuditManagerCharts";
import { COLORS, styles } from "./AuditManagerStyles";

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  isDesktop: boolean;
}

export const KpiCard = ({ title, value, icon, isDesktop }: KpiCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onPressIn={() => setIsHovered(true)}
      onPressOut={() => setIsHovered(false)}
      style={({ pressed }) => [
        styles.kpiCard,
        isDesktop ? { flex: 1 } : { width: "100%" },
        {
          transform: [{ scale: pressed ? 0.98 : 1 }],
          backgroundColor: isHovered ? "#F8FAFC" : COLORS.surface,
        },
      ]}
    >
      <AnimatedGlassCard
        style={{
          padding: 0,
          borderWidth: 0,
          shadowOpacity: 0,
          backgroundColor: "transparent",
        }}
      >
        <View
          style={[
            styles.kpiIconContainer,
            {
              backgroundColor: isHovered ? COLORS.primaryLight : "#F1F5F9",
            },
          ]}
        >
          {React.cloneElement(icon as any, {
            color: isHovered ? COLORS.primary : COLORS.textMain,
          })}
        </View>
        <Text style={styles.kpiValue}>{value}</Text>
        <Text style={styles.kpiTitle}>{title}</Text>
      </AnimatedGlassCard>
    </Pressable>
  );
};

export const NcrCard = ({
  title,
  description,
  icon,
  onPress,
  badgeText,
  isDesktop,
}: any) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onPressIn={() => setIsHovered(true)}
      onPressOut={() => setIsHovered(false)}
      style={[
        isDesktop
          ? styles.ncrCard
          : [styles.ncrCard, { width: "100%", marginBottom: 16 }],
        {
          backgroundColor: isHovered ? "#F8FAFC" : COLORS.surface,
        },
      ]}
    >
      <View style={styles.ncrCardContent}>
        <View
          style={[
            styles.ncrCardIcon,
            {
              backgroundColor: isHovered ? COLORS.primaryLight : "#F1F5F9",
            },
          ]}
        >
          {React.cloneElement(icon as any, {
            color: isHovered ? COLORS.primary : COLORS.textMain,
            size: 20,
          })}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ncrCardTitle}>{title}</Text>
          <Text style={styles.ncrCardDesc}>{description}</Text>
        </View>
        <ChevronRight
          size={18}
          color={isHovered ? COLORS.primary : COLORS.textMuted}
        />
      </View>
      <View
        style={[
          styles.ncrCardBadge,
          {
            backgroundColor: isHovered ? COLORS.primaryLight : "#F8FAFC",
            borderColor: isHovered ? "#DBEAFE" : COLORS.border,
          },
        ]}
      >
        <Text
          style={[
            styles.ncrCardBadgeText,
            { color: isHovered ? COLORS.primary : COLORS.textSub },
          ]}
        >
          {badgeText}
        </Text>
      </View>
    </Pressable>
  );
};

export const RequestCard = ({
  request,
  onView,
}: {
  request: any;
  onView: (req: any) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const typeLabel = request.type === "RESCHEDULE" ? "Reschedule" : "Extension";
  const typeIcon = request.type === "RESCHEDULE" ? "📅" : "📋";

  return (
    <Pressable
      onPress={() => onView(request)}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onPressIn={() => setIsHovered(true)}
      onPressOut={() => setIsHovered(false)}
      style={[
        styles.requestCard,
        {
          backgroundColor: isHovered ? "#F8FAFC" : COLORS.surface,
        },
      ]}
    >
      <View style={styles.requestHeader}>
        <View style={styles.requestBadges}>
          <View style={[styles.badge, { backgroundColor: "#F1F5F9" }]}>
            <Text style={[styles.badgeText, { color: COLORS.textSub }]}>
              {typeIcon} {typeLabel}
            </Text>
          </View>
          <Text style={styles.requestDate}>
            {new Date(request.requestedAt).toLocaleDateString()}
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: COLORS.warningBg, borderColor: "#FDE68A" },
            ]}
          >
            <Text style={[styles.badgeText, { color: "#B45309" }]}>
              {request.status || "PENDING"}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.requestTitle}>
        {request.auditType} - {request.department}
      </Text>
      <View style={styles.requestSubtitle}>
        <UserCheck size={14} color={COLORS.textMuted} />
        <Text
          style={{
            fontSize: 13,
            color: COLORS.textSub,
            marginLeft: 6,
            fontWeight: "500",
          }}
        >
          {request.auditorName} → {request.auditeeName}
        </Text>
      </View>
      <View style={styles.requestFooter}>
        <Text style={styles.requestFooterText}>
          {request.type === "RESCHEDULE"
            ? `Current: ${request.currentDate} → Requested: ${request.requestedNewDate}`
            : `Current end: ${request.currentDate} → Requested end: ${request.requestedNewToDate}`}
        </Text>
      </View>
      <View
        style={[
          styles.requestViewBtn,
          {
            backgroundColor: isHovered ? COLORS.primaryLight : "#F8FAFC",
            borderColor: isHovered ? "#DBEAFE" : COLORS.borderLight,
          },
        ]}
      >
        <Eye size={16} color={isHovered ? COLORS.primary : COLORS.textMuted} />
      </View>
    </Pressable>
  );
};
