import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { getContentContainerStyle, getHorizontalPadding, isTablet } from '../../utils/responsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
  fullWidth?: boolean;
}

/**
 * A responsive container that centers content on tablets and provides
 * appropriate padding for different screen sizes.
 */
export default function ResponsiveContainer({ 
  children, 
  style, 
  noPadding = false,
  fullWidth = false 
}: ResponsiveContainerProps) {
  const tablet = isTablet();
  const horizontalPadding = noPadding ? 0 : getHorizontalPadding();

  return (
    <View
      style={[
        styles.container,
        !fullWidth && getContentContainerStyle(),
        { paddingHorizontal: horizontalPadding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
