import React from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, radius } from './theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function Button({ label, onPress, variant = 'primary', disabled, style, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'quiet' && styles.quiet,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text
        style={[
          styles.label,
          variant === 'primary' ? styles.labelPrimary : styles.labelDark,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  primary: { backgroundColor: colors.ink, borderColor: colors.ink },
  secondary: { backgroundColor: colors.card, borderColor: colors.ink },
  quiet: { backgroundColor: 'transparent', borderColor: 'transparent', paddingVertical: 10 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.35 },
  label: { fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },
  labelPrimary: { color: colors.paper },
  labelDark: { color: colors.ink },
});
