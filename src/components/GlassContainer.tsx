import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GlassContainer: React.FC<GlassContainerProps> = ({ children, style }) => {
  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={20} tint="light" style={styles.blurView}>
        {children}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  blurView: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
