import { useWindowDimensions } from "react-native";

export const useResponsive = () => {
    const { width, height } = useWindowDimensions();

    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;

    return {
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
        sidebarWidth: isDesktop ? 320 : isTablet ? 260 : width,
        toolbarHeight: isMobile ? 60 : 72,
        padding: isMobile ? 12 : 20,
        cardPadding: isMobile ? 12 : 16,
        fontLarge: isMobile ? 18 : 24,
        fontMedium: isMobile ? 15 : 17,
        fontSmall: isMobile ? 12 : 14
    };
};