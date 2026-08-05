import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from './theme';

/** Pip layout for each face, as a 3x3 grid of booleans. */
const FACES: Record<number, boolean[]> = {
  1: [false, false, false, false, true, false, false, false, false],
  2: [true, false, false, false, false, false, false, false, true],
  3: [true, false, false, false, true, false, false, false, true],
  4: [true, false, true, false, false, false, true, false, true],
  5: [true, false, true, false, true, false, true, false, true],
  6: [true, false, true, true, false, true, true, false, true],
};

export function Die({ value, size = 44 }: { value: number; size?: number }) {
  const pips = FACES[value] ?? FACES[1];
  const pip = size * 0.15;
  return (
    <View
      testID="die"
      style={[
        styles.die,
        { width: size, height: size, borderRadius: size * 0.22, padding: size * 0.12 },
      ]}
    >
      <View style={styles.grid}>
        {pips.map((on, i) => (
          <View key={i} style={styles.slot}>
            {on ? (
              <View
                style={{ width: pip, height: pip, borderRadius: pip / 2, backgroundColor: colors.ink }}
              />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  die: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  slot: { width: '33.333%', height: '33.333%', alignItems: 'center', justifyContent: 'center' },
});
