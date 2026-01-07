import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 14 Pro dimensions as baseline)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Device type detection
export const isTablet = (): boolean => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  // Tablets typically have aspect ratio closer to 1 (e.g., 4:3 = 1.33)
  // Phones typically have aspect ratio around 2 (e.g., 19.5:9 = 2.17)
  return Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) >= 600 || aspectRatio < 1.6;
};

export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH < 375;
};

export const isLargeDevice = (): boolean => {
  return SCREEN_WIDTH >= 428;
};

// Get screen dimensions
export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;

// Responsive scaling functions
export const horizontalScale = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  // Limit scaling for tablets to prevent overly large elements
  const maxScale = isTablet() ? 1.5 : 1.3;
  return Math.round(PixelRatio.roundToNearestPixel(size * Math.min(scale, maxScale)));
};

export const verticalScale = (size: number): number => {
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  const maxScale = isTablet() ? 1.4 : 1.2;
  return Math.round(PixelRatio.roundToNearestPixel(size * Math.min(scale, maxScale)));
};

// Moderate scale - for elements that should scale less aggressively (like fonts)
export const moderateScale = (size: number, factor: number = 0.5): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size + (scale - 1) * size * factor;
  // For tablets, cap the scaling to prevent fonts from being too large
  const maxSize = isTablet() ? size * 1.35 : size * 1.2;
  return Math.round(PixelRatio.roundToNearestPixel(Math.min(newSize, maxSize)));
};

// Responsive font sizes
export const fontSize = {
  xs: moderateScale(10),
  sm: moderateScale(12),
  base: moderateScale(14),
  md: moderateScale(16),
  lg: moderateScale(18),
  xl: moderateScale(20),
  '2xl': moderateScale(24),
  '3xl': moderateScale(30),
  '4xl': moderateScale(36),
  '5xl': moderateScale(48),
};

// Responsive spacing
export const spacing = {
  xs: horizontalScale(4),
  sm: horizontalScale(8),
  md: horizontalScale(12),
  base: horizontalScale(16),
  lg: horizontalScale(20),
  xl: horizontalScale(24),
  '2xl': horizontalScale(32),
  '3xl': horizontalScale(40),
  '4xl': horizontalScale(48),
  '5xl': horizontalScale(64),
};

// Responsive border radius
export const borderRadius = {
  sm: horizontalScale(4),
  md: horizontalScale(8),
  lg: horizontalScale(12),
  xl: horizontalScale(16),
  '2xl': horizontalScale(24),
  '3xl': horizontalScale(32),
  full: 9999,
};

// Responsive icon sizes
export const iconSize = {
  xs: moderateScale(14),
  sm: moderateScale(18),
  md: moderateScale(22),
  lg: moderateScale(26),
  xl: moderateScale(32),
  '2xl': moderateScale(40),
  '3xl': moderateScale(48),
};

// Container max width for tablets (to prevent content from stretching too wide)
export const getContainerMaxWidth = (): number | undefined => {
  if (isTablet()) {
    // On tablets, limit content width for better readability
    return Math.min(SCREEN_WIDTH * 0.85, 700);
  }
  return undefined;
};

// Get responsive horizontal padding
export const getHorizontalPadding = (): number => {
  if (isTablet()) {
    return Math.max((SCREEN_WIDTH - (getContainerMaxWidth() || SCREEN_WIDTH)) / 2, spacing.lg);
  }
  return spacing.base;
};

// Get number of columns for grid layouts
export const getGridColumns = (minColumnWidth: number = 160): number => {
  const availableWidth = SCREEN_WIDTH - (2 * getHorizontalPadding());
  const columns = Math.floor(availableWidth / minColumnWidth);
  return Math.max(1, Math.min(columns, 4)); // Between 1 and 4 columns
};

// Responsive map height
export const getMapHeight = (): number => {
  if (isTablet()) {
    return Math.min(SCREEN_HEIGHT * 0.45, 500);
  }
  return SCREEN_HEIGHT * 0.35;
};

// Responsive card width for horizontal scrolling lists
export const getCardWidth = (cardsPerView: number = 1.2): number => {
  const padding = getHorizontalPadding() * 2;
  const availableWidth = SCREEN_WIDTH - padding;
  
  if (isTablet()) {
    // Show more cards on tablets
    return availableWidth / (cardsPerView + 1);
  }
  return availableWidth / cardsPerView;
};

// Responsive bottom nav height
export const getBottomNavHeight = (bottomInset: number = 0): number => {
  const baseHeight = isTablet() ? 80 : 70;
  return baseHeight + bottomInset;
};

// Responsive button height
export const getButtonHeight = (): number => {
  if (isTablet()) {
    return verticalScale(56);
  }
  return verticalScale(48);
};

// Responsive input height
export const getInputHeight = (): number => {
  if (isTablet()) {
    return verticalScale(56);
  }
  return verticalScale(48);
};

// Content container style for centering on tablets
export const getContentContainerStyle = () => {
  if (isTablet()) {
    return {
      maxWidth: getContainerMaxWidth(),
      alignSelf: 'center' as const,
      width: '100%' as const,
    };
  }
  return {};
};

// Modal container style for tablets
export const getModalContainerStyle = () => {
  if (isTablet()) {
    return {
      maxWidth: 500,
      width: '80%' as const,
    };
  }
  return {
    width: '100%' as const,
  };
};

// Hook-like utility to get all responsive values at once
export const getResponsiveValues = () => ({
  isTablet: isTablet(),
  isSmallDevice: isSmallDevice(),
  isLargeDevice: isLargeDevice(),
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  horizontalPadding: getHorizontalPadding(),
  containerMaxWidth: getContainerMaxWidth(),
  gridColumns: getGridColumns(),
  mapHeight: getMapHeight(),
  buttonHeight: getButtonHeight(),
  inputHeight: getInputHeight(),
  fontSize,
  spacing,
  borderRadius,
  iconSize,
});

export default {
  horizontalScale,
  verticalScale,
  moderateScale,
  isTablet,
  isSmallDevice,
  isLargeDevice,
  screenWidth,
  screenHeight,
  fontSize,
  spacing,
  borderRadius,
  iconSize,
  getContainerMaxWidth,
  getHorizontalPadding,
  getGridColumns,
  getMapHeight,
  getCardWidth,
  getBottomNavHeight,
  getButtonHeight,
  getInputHeight,
  getContentContainerStyle,
  getModalContainerStyle,
  getResponsiveValues,
};
