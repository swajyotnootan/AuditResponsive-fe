// components/Navbar.tsx
import { useSidebar } from "@/components/context/SidebarContext";
import { API_BASE_URL } from "@/config/apiConfig";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import {
  Bell,
  Building2,
  Calendar,
  ChevronRight,
  LogOut,
  Mail,
  Menu,
  MoreVertical, // ✅ FIXED: Added MoreVertical import
  Shield,
  User,
  X
} from "lucide-react-native";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  DeviceEventEmitter,
  Image,
  ImageErrorEventData,
  ImageSourcePropType,
  Keyboard,
  Modal,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { useAuth } from "../components/context/AuthContext";
import { getDashboardPath, getRoleDisplayName } from "../utils/roleUtils";
import { useNotifications } from "./context/NotificationContext";
import NotificationBell from "./NotificationBell";

// Type Definitions
interface User {
  id?: string | number;
  name?: string;
  email?: string;
  username?: string;
  role?: string;
  department?: string;
  profilePhoto?: string;
}

interface NavbarProps {
  title?: string;
  onLogout?: () => void;
  onMenuPress?: () => void;
  children?: ReactNode;
  rightLogo?: ImageSourcePropType;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  breadcrumbs?: Array<{ label: string; onPress?: () => void }>;
}

// Import assets
const QSUTRA_LOGO = require("../assets/QsutraQMSWhiteLogo.png");
const STRATUM_LOGO = require("../assets/Stratum.png");

// Professional Corporate Color Palette
const PRIMARY_COLOR = "#00529B";

// Custom HoverView Component
interface HoverViewProps {
  children: (isHovered: boolean) => ReactNode;
  style?: ViewStyle;
  className?: string;
}

const HoverView: React.FC<HoverViewProps> = ({
  children,
  style,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <View
      // @ts-ignore
      onHoverIn={() => setIsHovered(true)}
      // @ts-ignore
      onHoverOut={() => setIsHovered(false)}
      style={style}
      className={className}
    >
      {children(isHovered)}
    </View>
  );
};

const Navbar: React.FC<NavbarProps> = ({
  onLogout,
  onMenuPress,
  children,
  rightLogo,
  showSearch = false,
  onSearch,
  breadcrumbs = [],
}) => {
  const router = useRouter();
const pathname = usePathname();
const params = useLocalSearchParams();
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const { unreadCount, setIsOpen: setNotificationOpen } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const searchInputRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const menuFadeAnim = useRef(new Animated.Value(0)).current;
  const menuScaleAnim = useRef(new Animated.Value(0.9)).current;

  const { toggleSidebar } = useSidebar();
  const { user, logout } = useAuth() as {
    user: User | null;
    logout: () => Promise<void>;
  };

  const userRole = user?.role?.toUpperCase() || "";
  const isHrAdmin = userRole === "HR_ADMIN";
  const isHrAdminOrMaster = isHrAdmin || userRole === "MASTER";

  const currentBlobUrlRef = useRef<string | null>(null);

  // ✅ Dynamic logo from backend
  const [dynamicLogo, setDynamicLogo] = useState<string | null>(null);
  const [logoKey, setLogoKey] = useState(0);
  const [isMenuToggling, setIsMenuToggling] = useState(false);

  const loadDynamicLogo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logo?t=${Date.now()}`);
      if (response.ok) {
        const blob = await response.blob();

        if (Platform.OS === "web") {
          if (currentBlobUrlRef.current) {
            URL.revokeObjectURL(currentBlobUrlRef.current);
          }
          const newUrl = URL.createObjectURL(blob);
          currentBlobUrlRef.current = newUrl;
          setDynamicLogo(newUrl);
          setLogoKey((prev) => prev + 1);
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            setDynamicLogo(reader.result as string);
            setLogoKey((prev) => prev + 1);
          };
          reader.readAsDataURL(blob);
        }
        console.log("✅ Navbar: Dynamic logo loaded");
      } else {
        setDynamicLogo(null);
        setLogoKey((prev) => prev + 1);
      }
    } catch (err) {
      console.log("Dynamic logo not available");
      setDynamicLogo(null);
      setLogoKey((prev) => prev + 1);
    }
  };

  useEffect(() => {
    loadDynamicLogo();

    let webListener: (() => void) | null = null;
    let nativeSubscription: any = null;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      webListener = () => {
        console.log("🔄 Navbar: logo-updated received (web)!");
        loadDynamicLogo();
      };
      window.addEventListener("logo-updated", webListener as any);
    } else {
      nativeSubscription = DeviceEventEmitter.addListener(
        "logo-updated",
        () => {
          console.log("🔄 Navbar: logo-updated received (native)!");
          loadDynamicLogo();
        },
      );
    }

    return () => {
      if (webListener && typeof window !== "undefined") {
        window.removeEventListener("logo-updated", webListener as any);
      }
      if (nativeSubscription) {
        nativeSubscription.remove();
      }
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
      }
    };
  }, []);

  const dashboardPath = getDashboardPath(user);
const currentPath = pathname || "";
  const currentPathLower = currentPath.toLowerCase();

  const isOnDashboard =
    currentPath === "index" ||
    currentPath === "(tabs)" ||
    currentPath === "/(app)/(tabs)" ||
    currentPath === "/(app)/(tabs)/" ||
    currentPathLower === "master" ||
    currentPathLower === "auditor" ||
    currentPathLower === "auditee" ||
    currentPathLower === "hod" ||
    currentPathLower === "lead-auditor" ||
    currentPathLower === "audit-manager" ||
    currentPathLower === "initiator" ||
    currentPathLower === "top-management" ||
    currentPathLower === "hr-admin";

  const showToggleButton = !isHrAdmin;
  const showBackButton = !isOnDashboard;

  const isSmallMobile = windowWidth < 360;
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  // Animation for profile modal
  useEffect(() => {
    if (profileOpen) {
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [profileOpen]);

  // Animation for mobile menu
  useEffect(() => {
    if (mobileMenuOpen) {
      Animated.parallel([
        Animated.timing(menuFadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(menuScaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(menuFadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(menuScaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [mobileMenuOpen]);

  const shouldHideCalendar = (): boolean => {
    const role = user?.role?.toUpperCase?.() || "";
    const isInitiator = role === "INITIATOR";
    const isHOD = role === "HOD";
    if (isInitiator || isHOD) return true;
    const isInitiatorDashboard = currentPath.includes("InitiatorDashboard");
    const isHODDashboard = currentPath.includes("HODDashboard");
    if (isInitiatorDashboard || isHODDashboard) return true;
    return false;
  };

  const handleProfilePhotoError = (
    e: NativeSyntheticEvent<ImageErrorEventData>,
  ) => {
    console.log("Profile photo failed to load");
  };

  const handleLogout = async () => {
    console.log("🟢 LOGOUT BUTTON PRESSED!");
    setProfileOpen(false);
    setMobileMenuOpen(false);

    try {
      await logout();
      console.log("🟢 Logout successful!");
      router.replace("/auth/login" as any);
    } catch (error) {
      console.error("🔴 Logout error:", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const handleSidebarToggle = () => {
    console.log('🔄 Hamburger clicked! Platform:', Platform.OS);
    try {
      if (typeof toggleSidebar === 'function') {
        toggleSidebar();
      } else {
        console.warn('⚠️ toggleSidebar is not a function!');
      }
    } catch (error) {
      console.error('❌ Error in handleSidebarToggle:', error);
    }
  };

  const getUserInitials = (): string => {
    if (!user?.name) return "?";
    const nameParts = user.name.trim().split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return (
      nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
    ).toUpperCase();
  };

  const getDisplayName = (): string => {
    if (!user?.name) return "User";
    return (
      user.name
        .replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss|Shri|Smt)\s+/i, "")
        .trim() || "User"
    );
  };

  const handleSearchSubmit = () => {
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
      Keyboard.dismiss();
      setIsMobileSearchOpen(false);
    }
  };

  const toggleMobileSearch = () => {
    setIsMobileSearchOpen(!isMobileSearchOpen);
    if (!isMobileSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      Keyboard.dismiss();
      setSearchQuery("");
    }
  };

  const getProfilePhotoUrl = () => {
    if (user?.profilePhoto) {
      return user.profilePhoto;
    }
    if (user?.id) {
      return `${API_BASE_URL}/api/users/${user.id}/profile-photo`;
    }
    return null;
  };

  const handleMenuItemClick = (action: () => void) => {
    setMobileMenuOpen(false);
    setTimeout(action, 150);
  };

  return (
    <View>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PRIMARY_COLOR}
        translucent={Platform.OS === "android"}
      />

      {/* Navbar Container */}
      <View
        style={{
          backgroundColor: PRIMARY_COLOR,
          paddingTop:
            Platform.OS === "android" ? StatusBar.currentHeight || 24 : 0,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.1)",
        }}
      >
        {/* Main Navbar */}
        <View
          style={{
            height: isSmallMobile ? 56 : isMobile ? 56 : isTablet ? 64 : 64,
            paddingHorizontal: isSmallMobile
              ? 12
              : isMobile
                ? 16
                : isTablet
                  ? 24
                  : 32,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: isDesktop ? 1600 : "100%",
            alignSelf: "center",
            width: "100%",
          }}
        >
          <View
            className="flex-row items-center justify-between w-full h-full mx-auto"
            style={{ maxWidth: isDesktop ? 1600 : "100%" }}
          >
            {/* LEFT SECTION */}
            <View className="flex-row items-center flex-shrink">
              {showToggleButton ? (
                <TouchableOpacity
                  onPress={() => {
                    if (isMenuToggling) return; 
                    
                    console.log('🔄 Menu button pressed!');
                    setIsMenuToggling(true);
                    
                    try {
                      if (onMenuPress) {
                        console.log('📌 Using onMenuPress from props');
                        onMenuPress();
                      } else {
                        console.log('📌 Opening mobile menu and toggling sidebar');
                        setMobileMenuOpen(true);
                        toggleSidebar();
                      }
                    } catch (error) {
                      console.error('❌ Error in menu press:', error);
                    } finally {
                      setTimeout(() => setIsMenuToggling(false), 300);
                    }
                  }}
                  className={`rounded-lg mr-3 ${isMobile ? "p-2" : "p-2.5"}`}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.25)",
                  }}
                  activeOpacity={0.7}
                >
                  <Menu
                    size={isSmallMobile ? 18 : isMobile ? 20 : 22}
                    color="#FFFFFF"
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>
              ) : null}

              {/* Qsutra Logo - Always visible */}
              <TouchableOpacity
                onPress={() => {
                  try {
                    router.push("/(app)/(tabs)" as any);
                  } catch (error) {
                    console.error('❌ Navigation error:', error);
                  }
                }}
                className="flex-row items-center"
                activeOpacity={0.8}
              >
                <Image
                  source={QSUTRA_LOGO}
                  resizeMode="contain"
                  style={
                    isSmallMobile
                      ? { width: 60, height: 24 }
                      : isMobile
                        ? { width: 80, height: 32 }
                        : isTablet
                          ? { width: 100, height: 40 }
                          : { width: 140, height: 56 }
                  }
                />
              </TouchableOpacity>
            </View>

            {/* RIGHT SECTION */}
            <View className="flex-row items-center">
              {/* MOBILE VIEW */}
              {isMobile && (
                <View className="flex-row items-center">
                  {/* ✅ Dynamic/Stratum Logo on Mobile */}
                  <View className="items-center justify-center mr-2">
                    <Image
                      key={`mobile-logo-${logoKey}`}
                      source={
                        dynamicLogo
                          ? { uri: dynamicLogo }
                          : rightLogo || STRATUM_LOGO
                      }
                      resizeMode="contain"
                      style={{ height: 30, width: 50, borderRadius: 10 }}
                    />
                  </View>
 
                  {/* ✅ MoreVertical Menu Button */}
                  <TouchableOpacity
                    onPress={() => setMobileMenuOpen(true)}
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.15)",
                    }}
                    activeOpacity={0.7}
                  >
                    <MoreVertical size={20} color="#FFFFFF" strokeWidth={2} />
                  </TouchableOpacity>
 
                  <TouchableOpacity
                    onPress={handleLogout}
                    className="p-2 ml-1 rounded-lg"
                    style={{ backgroundColor: "#DC2626" }}
                    activeOpacity={0.8}
                  >
                    <LogOut size={18} color="#FFFFFF" strokeWidth={1.5} />
                  </TouchableOpacity>
                </View>
              )}
 
              {/* DESKTOP/TABLET VIEW */}
              {!isMobile && (
                <>
                  {/* ✅ Dynamic/Stratum Logo on Desktop */}
                  {!isSmallMobile && (
                    <View className="items-center justify-center">
                      <Image
                        key={`desktop-logo-${logoKey}`}
                        source={
                          dynamicLogo
                            ? { uri: dynamicLogo }
                            : rightLogo || STRATUM_LOGO
                        }
                        resizeMode="contain"
                        style={{
                          height: isTablet ? 32 : 40,
                          width: isTablet ? 80 : 100,
                          borderRadius: 7,
                        }}
                      />
                    </View>
                  )}
 
                  {/* ✅ Notification Bell - Hidden for HR_ADMIN and MASTER */}
                  {!isHrAdminOrMaster && user && (
                    <View className="mx-1">
                      <NotificationBell />
                    </View>
                  )}
 
                  {/* ✅ Calendar Icon - Hidden for HR_ADMIN and MASTER */}
                  {!isHrAdminOrMaster && !shouldHideCalendar() && (
                    <HoverView className="mx-1">
                      {(isHovered) => (
                        <TouchableOpacity
                          onPress={() =>
                            router.push("/(app)/(tabs)/calendar" as any)
                          }
                          className="items-center justify-center w-12 h-12 rounded-lg"
                          style={{
                            backgroundColor: isHovered
                              ? "rgba(255,255,255,0.12)"
                              : "rgba(255,255,255,0.05)",
                            borderWidth: 1,
                            borderColor: isHovered
                              ? "rgba(255,255,255,0.35)"
                              : "rgba(255,255,255,0.15)",
                          }}
                          activeOpacity={0.7}
                        >
                          <Calendar
                            size={24}
                            color="#FFFFFF"
                            strokeWidth={2.25}
                          />
                        </TouchableOpacity>
                      )}
                    </HoverView>
                  )}
 
                  {/* Profile Avatar */}
                  <HoverView className="ml-1">
                    {(isHovered) => (
                      <TouchableOpacity
                        onPress={() => setProfileOpen(!profileOpen)}
                        className="items-center justify-center overflow-hidden rounded-full"
                        style={{
                          width: 45,
                          height: 45,
                          backgroundColor: isHovered
                            ? "rgba(255,255,255,0.15)"
                            : "rgba(255,255,255,0.08)",
                          borderWidth: 2.5,
                          borderColor: isHovered
                            ? "rgba(255,255,255,0.7)"
                            : "rgba(255,255,255,0.35)",
                        }}
                        activeOpacity={0.7}
                      >
                        {getProfilePhotoUrl() ? (
                          <Image
                            source={{ uri: getProfilePhotoUrl()! }}
                            style={{ width: "100%", height: "100%" }}
                            onError={handleProfilePhotoError}
                          />
                        ) : (
                          <Text
                            className="font-bold text-white"
                            style={{ fontSize: 20, letterSpacing: 0.5 }}
                          >
                            {getUserInitials()}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </HoverView>
 
                  {/* User Info */}
                  <HoverView className="justify-center ml-1">
                    {(isHovered) => (
                      <TouchableOpacity
                        onPress={() => setProfileOpen(true)}
                        activeOpacity={0.7}
                        className="px-2 py-1.5 rounded-lg"
                        style={{
                          backgroundColor: isHovered
                            ? "rgba(255,255,255,0.08)"
                            : "transparent",
                        }}
                      >
                        <Text
                          className="text-sm font-semibold text-white"
                          numberOfLines={1}
                          style={{ letterSpacing: 0.3 }}
                        >
                          {getDisplayName()}
                        </Text>
                        <Text
                          className="text-xs font-medium text-white/70"
                          numberOfLines={1}
                          style={{ letterSpacing: 0.2 }}
                        >
                          {user?.role === "SITE_SUPERVISOR"
                            ? "Site-1 Supervisor"
                            : getRoleDisplayName(user?.role)}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </HoverView>
 
                  {/* Logout Button */}
                  <HoverView className="mx-1">
                    {(isHovered) => (
                      <TouchableOpacity
                        onPress={handleLogout}
                        className="flex-row items-center px-2 py-1 rounded-md"
                        style={{
                          backgroundColor: isHovered ? "#B91C1C" : "#DC2626",
                          borderWidth: 1,
                          borderColor: isHovered ? "#991B1B" : "#DC2626",
                          elevation: isHovered ? 4 : 2,
                          shadowColor: "#DC2626",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: isHovered ? 0.4 : 0.2,
                          shadowRadius: 4,
                        }}
                        activeOpacity={0.8}
                      >
                        <LogOut
                          size={18}
                          color={isHovered ? "#FCA5A5" : "#FFFFFF"}
                          strokeWidth={1.5}
                        />
                        <Text
                          className={`ml-2 font-medium ${isHovered ? "text-red-300" : "text-white"}`}
                          style={{ fontSize: 13, letterSpacing: 0.3 }}
                        >
                          Logout
                        </Text>
                      </TouchableOpacity>
                    )}
                  </HoverView>
                </>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* MOBILE MENU DROPDOWN */}
      {isMobile && (
        <Modal
          visible={mobileMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMobileMenuOpen(false)}
        >
          <TouchableWithoutFeedback onPress={() => setMobileMenuOpen(false)}>
            <View className="flex-1 bg-black/40">
              <TouchableWithoutFeedback>
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 60,
                    right: 12,
                    width: 280,
                    opacity: menuFadeAnim,
                    transform: [{ scale: menuScaleAnim }],
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      elevation: 12,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.25,
                      shadowRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    <TouchableOpacity
                      onPress={() =>
                        handleMenuItemClick(() => setProfileOpen(true))
                      }
                      activeOpacity={0.7}
                      style={{
                        backgroundColor: PRIMARY_COLOR,
                        padding: 16,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: "rgba(255,255,255,0.2)",
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 2,
                          borderColor: "rgba(255,255,255,0.5)",
                          overflow: "hidden",
                        }}
                      >
                        {getProfilePhotoUrl() ? (
                          <Image
                            source={{ uri: getProfilePhotoUrl()! }}
                            style={{ width: "100%", height: "100%" }}
                            onError={handleProfilePhotoError}
                          />
                        ) : (
                          <Text
                            style={{
                              fontSize: 18,
                              fontWeight: "bold",
                              color: "#FFFFFF",
                            }}
                          >
                            {getUserInitials()}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 15,
                            fontWeight: "600",
                            letterSpacing: 0.3,
                          }}
                          numberOfLines={1}
                        >
                          {getDisplayName()}
                        </Text>
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.7)",
                            fontSize: 12,
                            marginTop: 2,
                            letterSpacing: 0.2,
                          }}
                          numberOfLines={1}
                        >
                          {user?.email || "—"}
                        </Text>
                      </View>
                      <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>

                    <View style={{ paddingVertical: 8 }}>
                      {/* ✅ Notifications - Hidden for HR_ADMIN and MASTER */}
                      {!isHrAdminOrMaster && (
                        <TouchableOpacity
                          onPress={() => {
                            setMobileMenuOpen(false);
                            setTimeout(() => {
                              setNotificationOpen(true);
                            }, 300);
                          }}
                          activeOpacity={0.7}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                          }}
                        >
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              backgroundColor: "#EFF6FF",
                              alignItems: "center",
                              justifyContent: "center",
                              position: "relative",
                            }}
                          >
                            <Bell
                              size={18}
                              color={PRIMARY_COLOR}
                              strokeWidth={1.5}
                            />
                            {unreadCount > 0 && (
                              <View
                                style={{
                                  position: "absolute",
                                  top: -2,
                                  right: -2,
                                  minWidth: 18,
                                  height: 18,
                                  backgroundColor: "#ef4444",
                                  borderRadius: 9,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  paddingHorizontal: 4,
                                  borderWidth: 2,
                                  borderColor: "#FFFFFF",
                                }}
                              >
                                <Text
                                  style={{
                                    color: "white",
                                    fontSize: 10,
                                    fontWeight: "bold",
                                  }}
                                >
                                  {unreadCount > 99 ? "99+" : unreadCount}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text
                            style={{
                              flex: 1,
                              marginLeft: 12,
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#1F2937",
                            }}
                          >
                            Notifications
                          </Text>
                          {unreadCount > 0 && (
                            <View
                              style={{
                                backgroundColor: "#ef4444",
                                borderRadius: 12,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                minWidth: 24,
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  color: "white",
                                  fontSize: 12,
                                  fontWeight: "bold",
                                }}
                              >
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )}

                      {/* ✅ Calendar - Hidden for HR_ADMIN and MASTER */}
                      {!isHrAdminOrMaster && !shouldHideCalendar() && (
                        <TouchableOpacity
                          onPress={() =>
                            handleMenuItemClick(() =>
                              router.push("/(app)/(tabs)/calendar" as any),
                            )
                          }
                          activeOpacity={0.7}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                          }}
                        >
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              backgroundColor: "#F0FDF4",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Calendar
                              size={18}
                              color="#10B981"
                              strokeWidth={1.5}
                            />
                          </View>
                          <Text
                            style={{
                              flex: 1,
                              marginLeft: 12,
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#1F2937",
                            }}
                          >
                            Calendar
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        onPress={() =>
                          handleMenuItemClick(() => setProfileOpen(true))
                        }
                        activeOpacity={0.7}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: "#F5F3FF",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <User size={18} color="#8B5CF6" strokeWidth={1.5} />
                        </View>
                        <Text
                          style={{
                            flex: 1,
                            marginLeft: 12,
                            fontSize: 14,
                            fontWeight: "500",
                            color: "#1F2937",
                          }}
                        >
                          My Profile
                        </Text>
                      </TouchableOpacity>

                      <View
                        style={{
                          height: 1,
                          backgroundColor: "#F3F4F6",
                          marginVertical: 4,
                          marginHorizontal: 16,
                        }}
                      />

                      <TouchableOpacity
                        onPress={() => handleMenuItemClick(handleLogout)}
                        activeOpacity={0.7}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: "#FEF2F2",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <LogOut size={18} color="#DC2626" strokeWidth={1.5} />
                        </View>
                        <Text
                          style={{
                            flex: 1,
                            marginLeft: 12,
                            fontSize: 14,
                            fontWeight: "500",
                            color: "#DC2626",
                          }}
                        >
                          Logout
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Profile Modal */}
      <Modal
        visible={profileOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setProfileOpen(false)}>
          <View className="items-center justify-center flex-1 bg-black/60">
            <TouchableWithoutFeedback>
              <Animated.View
                className="overflow-hidden bg-white rounded-2xl"
                style={{
                  opacity: fadeAnim,
                  transform: [
                    {
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1],
                      }),
                    },
                  ],
                  elevation: 24,
                  width: isMobile ? "92%" : isTablet ? 440 : 500,
                  maxWidth: 540,
                  maxHeight: "85%",
                }}
              >
                <View
                  className="px-3 py-2"
                  style={{
                    backgroundColor: PRIMARY_COLOR,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(255,255,255,0.1)",
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 mr-2">
                      <Text
                        className="text-xs font-medium text-white/70"
                        style={{ letterSpacing: 0.5 }}
                      >
                        Signed in as
                      </Text>
                      <Text
                        className="mt-1 text-base font-semibold text-white"
                        numberOfLines={1}
                      >
                        {user?.email || "—"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setProfileOpen(false)}
                      className="p-2 rounded-full bg-white/10"
                      style={{
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.2)",
                      }}
                    >
                      <X size={20} color="#FFFFFF" strokeWidth={1.5} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView
                  style={{ maxHeight: windowHeight }}
                  showsVerticalScrollIndicator={false}
                >
                  <View className="items-center px-2 pt-4 pb-2 bg-gray-50">
                    <View
                      className="items-center justify-center overflow-hidden border-4 rounded-full"
                      style={{
                        width: isMobile ? 88 : 104,
                        height: isMobile ? 88 : 104,
                        borderColor: PRIMARY_COLOR + "25",
                        backgroundColor: PRIMARY_COLOR + "10",
                        borderWidth: 3,
                      }}
                    >
                      {getProfilePhotoUrl() ? (
                        <Image
                          source={{ uri: getProfilePhotoUrl()! }}
                          style={{ width: "100%", height: "100%" }}
                          onError={handleProfilePhotoError}
                        />
                      ) : (
                        <Text
                          className="font-bold"
                          style={{
                            fontSize: isMobile ? 34 : 40,
                            color: PRIMARY_COLOR,
                            letterSpacing: 1,
                          }}
                        >
                          {getUserInitials()}
                        </Text>
                      )}
                    </View>
                    <Text
                      className="mt-4 text-xl font-semibold text-gray-900"
                      style={{ letterSpacing: 0.3 }}
                    >
                      {getDisplayName()}
                    </Text>
                    <Text
                      className="mt-1 text-sm font-medium text-gray-500"
                      style={{ letterSpacing: 0.2 }}
                    >
                      {user?.role === "SITE_SUPERVISOR"
                        ? "Site-1 Supervisor"
                        : getRoleDisplayName(user?.role)}
                    </Text>
                  </View>

                  <View className="px-6 bg-white">
                    {[
                      { icon: Mail, label: "Email", value: user?.email || "—" },
                      {
                        icon: User,
                        label: "Username",
                        value: user?.username || "—",
                      },
                      {
                        icon: Shield,
                        label: "Role",
                        value: getRoleDisplayName(user?.role) || "—",
                      },
                      {
                        icon: Building2,
                        label: "Department",
                        value: user?.department || "—",
                      },
                    ].map((item, index, arr) => (
                      <View
                        key={index}
                        className={`flex-row items-center py-2 ${index < arr.length - 1 ? "border-b border-gray-100" : ""}`}
                      >
                        <View
                          className="items-center justify-center w-10 h-10 rounded-lg"
                          style={{ backgroundColor: PRIMARY_COLOR + "12" }}
                        >
                          <item.icon
                            size={18}
                            color={PRIMARY_COLOR}
                            strokeWidth={1.5}
                          />
                        </View>
                        <Text
                          className="ml-4 text-sm font-medium text-gray-500"
                          style={{ letterSpacing: 0.2 }}
                        >
                          {item.label}:
                        </Text>
                        <Text
                          className="flex-1 ml-3 text-sm font-semibold text-gray-900"
                          numberOfLines={1}
                        >
                          {item.value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View className="flex-row px-6 py-2 border-t border-gray-100 bg-gray-50">
                    <TouchableOpacity
                      onPress={() => setProfileOpen(false)}
                      className="flex-1 py-3.5 mr-3 bg-white rounded-lg"
                      style={{ borderWidth: 1, borderColor: "#D1D5DB" }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-sm font-semibold text-center text-gray-700">
                        Close
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleLogout}
                      className="flex-row items-center justify-center flex-1 py-3.5 ml-3 rounded-lg"
                      style={{ backgroundColor: "#DC2626" }}
                      activeOpacity={0.8}
                    >
                      <LogOut size={18} color="#FFFFFF" strokeWidth={1.5} />
                      <Text className="ml-2 text-sm font-semibold text-white">
                        Logout
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default Navbar;