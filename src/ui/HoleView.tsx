import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Hole, HoleState, Point, ShotResult } from '../core/types';
import { colors, terrainColors } from './theme';

interface Props {
  hole: Hole;
  state: HoleState;
  cellSize: number;
  /** The shot currently being lined up, if any. */
  preview?: ShotResult | null;
  onAimAt?: (point: Point) => void;
}

const key = (p: Point) => `${p.r},${p.c}`;

export function HoleView({ hole, state, cellSize, preview, onAimAt }: Props) {
  const width = hole.cols * cellSize;
  const height = hole.rows * cellSize;

  // Cells the ball has already been flown over this hole — the pencil trace.
  const trace = useMemo(() => {
    const seen = new Set<string>();
    for (const shot of state.shots) {
      for (const p of shot.result.path) seen.add(key(p));
    }
    return seen;
  }, [state.shots]);

  const previewCells = preview?.path ?? [];
  const landing = preview?.landing;

  const dot = Math.max(3, Math.round(cellSize * 0.16));
  const ballSize = Math.round(cellSize * 0.5);

  return (
    <View style={[styles.frame, { width: width + 8, height: height + 8 }]}>
      <View style={{ width, height }}>
        {hole.grid.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((terrain, c) => (
              <Pressable
                key={c}
                testID={`cell-${r}-${c}`}
                onPress={onAimAt ? () => onAimAt({ r, c }) : undefined}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: terrainColors[terrain],
                  },
                ]}
              >
                {terrain === 'trees' ? (
                  <View
                    style={{
                      width: cellSize * 0.5,
                      height: cellSize * 0.5,
                      borderRadius: cellSize * 0.25,
                      backgroundColor: '#2C4C29',
                    }}
                  />
                ) : null}
                {terrain === 'sand' ? (
                  <View
                    style={{
                      width: cellSize * 0.34,
                      height: cellSize * 0.14,
                      borderRadius: cellSize * 0.07,
                      backgroundColor: '#D8BE7C',
                    }}
                  />
                ) : null}
              </Pressable>
            ))}
          </View>
        ))}

        {/* Everything below is drawn over the grid and ignores touches. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Where the ball has already been. */}
          {[...trace].map((k) => {
            const [r, c] = k.split(',').map(Number);
            return (
              <View
                key={`t${k}`}
                style={[
                  styles.centred,
                  { left: c * cellSize, top: r * cellSize, width: cellSize, height: cellSize },
                ]}
              >
                <View
                  style={{
                    width: dot * 0.7,
                    height: dot * 0.7,
                    borderRadius: dot,
                    backgroundColor: colors.ink,
                    opacity: 0.22,
                  }}
                />
              </View>
            );
          })}

          {/* The shot being lined up. */}
          {previewCells.map((p, i) => (
            <View
              key={`p${i}`}
              style={[
                styles.centred,
                { left: p.c * cellSize, top: p.r * cellSize, width: cellSize, height: cellSize },
              ]}
            >
              <View
                style={{
                  width: dot,
                  height: dot,
                  borderRadius: dot,
                  backgroundColor: colors.ink,
                  opacity: 0.75,
                }}
              />
            </View>
          ))}

          {landing ? (
            <View
              style={[
                styles.centred,
                {
                  left: landing.c * cellSize,
                  top: landing.r * cellSize,
                  width: cellSize,
                  height: cellSize,
                },
              ]}
            >
              <View
                style={{
                  width: cellSize * 0.78,
                  height: cellSize * 0.78,
                  borderRadius: cellSize * 0.39,
                  borderWidth: 2,
                  borderColor: preview?.penalty ? colors.flag : colors.ink,
                }}
              />
            </View>
          ) : null}

          {/* Tee marker. */}
          <View
            style={[
              styles.centred,
              {
                left: hole.tee.c * cellSize,
                top: hole.tee.r * cellSize,
                width: cellSize,
                height: cellSize,
              },
            ]}
          >
            <View
              style={{
                width: cellSize * 0.42,
                height: cellSize * 0.42,
                borderWidth: 1.5,
                borderColor: colors.ink,
                opacity: 0.5,
              }}
            />
          </View>

          {/* Cup and flag. */}
          <View
            style={[
              styles.centred,
              {
                left: hole.cup.c * cellSize,
                top: hole.cup.r * cellSize,
                width: cellSize,
                height: cellSize,
              },
            ]}
          >
            <View
              style={{
                position: 'absolute',
                width: cellSize * 0.34,
                height: cellSize * 0.34,
                borderRadius: cellSize * 0.17,
                backgroundColor: colors.ink,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: cellSize * 0.5,
                width: 2,
                height: cellSize * 1.1,
                backgroundColor: colors.ink,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: cellSize * 1.2,
                left: cellSize * 0.5,
                width: cellSize * 0.5,
                height: cellSize * 0.36,
                backgroundColor: colors.flag,
              }}
            />
          </View>

          {/* The ball. */}
          <View
            style={[
              styles.centred,
              {
                left: state.ball.c * cellSize,
                top: state.ball.r * cellSize,
                width: cellSize,
                height: cellSize,
              },
            ]}
          >
            <View
              testID="ball"
              style={{
                width: ballSize,
                height: ballSize,
                borderRadius: ballSize / 2,
                backgroundColor: colors.ball,
                borderWidth: 1.5,
                borderColor: colors.ink,
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    padding: 4,
    backgroundColor: colors.paperDeep,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: { flexDirection: 'row' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  centred: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
