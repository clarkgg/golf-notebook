import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { chebyshev } from '../core/hole';
import { applyShot, startHole } from '../core/play';
import { formatToPar, scoreName, totals } from '../core/scoring';
import {
  canChooseDistance,
  DIRECTIONS,
  directionToward,
  lieLabel,
  resolveShot,
  swingDistance,
  terrainAt,
} from '../core/shot';
import type { Course, HoleState, Point } from '../core/types';
import { Button } from '../ui/Button';
import { Die } from '../ui/Die';
import { HoleView } from '../ui/HoleView';
import { colors, radius, terrainNames } from '../ui/theme';
import type { RoundSave } from '../storage';

const haptics = {
  tap: () => tryHaptic('impactLight'),
  hit: () => tryHaptic('impactMedium'),
  holed: () => tryHaptic('success'),
  penalty: () => tryHaptic('warning'),
};

function tryHaptic(kind: 'impactLight' | 'impactMedium' | 'success' | 'warning') {
  if (Platform.OS === 'web') return;
  try {
    // Required lazily so the web bundle never touches the native module.
    const Haptics = require('expo-haptics');
    if (kind === 'impactLight') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (kind === 'impactMedium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // Haptics are a nicety; never let them break a shot.
  }
}

interface Props {
  course: Course;
  round: RoundSave;
  onChange: (round: RoundSave) => void;
  onExit: () => void;
  onShowCard: () => void;
}

export function PlayScreen({ course, round, onChange, onExit, onShowCard }: Props) {
  const insets = useSafeAreaInsets();
  const holeIndex = Math.min(round.holeIndex, 17);
  const hole = course.holes[holeIndex];

  const [state, setState] = useState<HoleState>(() => round.state ?? startHole(hole));
  const [dirIndex, setDirIndex] = useState(() =>
    directionToward((round.state ?? startHole(hole)).ball, hole.cup),
  );
  const [roll, setRoll] = useState<number | null>(null);
  const [rollFace, setRollFace] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [pace, setPace] = useState<number | null>(null);
  const [message, setMessage] = useState('Line up your tee shot, then roll.');
  const [finished, setFinished] = useState(false);
  const [board, setBoard] = useState<{ width: number; height: number } | null>(null);
  const spin = useRef<ReturnType<typeof setInterval> | null>(null);

  // Starting a new hole resets everything about the shot in progress.
  useEffect(() => {
    const fresh = round.state ?? startHole(hole);
    setState(fresh);
    setDirIndex(directionToward(fresh.ball, hole.cup));
    setRoll(null);
    setPace(null);
    setFinished(false);
    setMessage(
      fresh.strokes === 0 ? 'Line up your tee shot, then roll.' : `Lying in ${lieLabel(terrainAt(hole, fresh.ball))}.`,
    );
    // Only when the hole itself changes — mid-hole updates are driven by play.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeIndex, course.seed]);

  useEffect(() => () => { if (spin.current) clearInterval(spin.current); }, []);

  const lie = terrainAt(hole, state.ball);
  const maxDistance = roll == null ? null : swingDistance(lie, roll);
  const puttable = canChooseDistance(lie);
  // A putt is played at the pace that would drop it, unless you say otherwise.
  const defaultDistance =
    maxDistance == null
      ? null
      : puttable
        ? Math.max(1, Math.min(maxDistance, chebyshev(state.ball, hole.cup)))
        : maxDistance;
  const distance =
    maxDistance == null || defaultDistance == null
      ? null
      : Math.min(pace ?? defaultDistance, maxDistance);

  const preview = useMemo(
    () => (distance == null || finished ? null : resolveShot(hole, state.ball, dirIndex, distance)),
    [hole, state.ball, dirIndex, distance, finished],
  );

  const cardTotals = totals(course, round.card);
  const throughText = cardTotals.played === 0 ? 'E' : formatToPar(cardTotals.toPar);

  const cellSize = board
    ? Math.floor(Math.min((board.width - 16) / hole.cols, (board.height - 16) / hole.rows))
    : 0;

  const rollDie = useCallback(() => {
    if (rolling || roll != null || finished) return;
    haptics.tap();
    setRolling(true);
    let ticks = 0;
    spin.current = setInterval(() => {
      ticks++;
      setRollFace(1 + Math.floor(Math.random() * 6));
      if (ticks >= 8) {
        if (spin.current) clearInterval(spin.current);
        const value = 1 + Math.floor(Math.random() * 6);
        setRollFace(value);
        setRoll(value);
        setPace(null);
        setRolling(false);
        haptics.tap();
      }
    }, 60);
  }, [rolling, roll, finished]);

  const hit = useCallback(() => {
    if (distance == null || preview == null || finished) return;
    const next = applyShot(state, preview, roll ?? 0, distance);
    setState(next);
    setRoll(null);
    setPace(null);
    setMessage(preview.message);

    if (preview.outcome === 'holed') {
      haptics.holed();
      setFinished(true);
    } else {
      if (preview.penalty > 0) haptics.penalty();
      else haptics.hit();
      setDirIndex(directionToward(next.ball, hole.cup));
      onChange({ ...round, state: next });
    }
  }, [distance, preview, state, roll, finished, hole.cup, onChange, round]);

  const nextHole = useCallback(() => {
    const card = [...round.card];
    card[holeIndex] = state.strokes;
    onChange({ card, holeIndex: Math.min(holeIndex + 1, 17), state: null });
    if (holeIndex === 17) onShowCard();
  }, [round.card, holeIndex, state.strokes, onChange, onShowCard]);

  const restartHole = useCallback(() => {
    const fresh = startHole(hole);
    setState(fresh);
    setRoll(null);
    setPace(null);
    setFinished(false);
    setDirIndex(directionToward(fresh.ball, hole.cup));
    setMessage('Playing the hole again from the tee.');
    onChange({ ...round, state: null });
  }, [hole, onChange, round]);

  const aimAt = useCallback(
    (point: Point) => {
      if (finished) return;
      if (point.r === state.ball.r && point.c === state.ball.c) return;
      haptics.tap();
      setDirIndex(directionToward(state.ball, point));
    },
    [state.ball, finished],
  );

  const rotate = (delta: number) => {
    haptics.tap();
    setDirIndex((d) => (d + delta + 8) % 8);
  };

  const adjustPace = (delta: number) => {
    if (maxDistance == null || defaultDistance == null) return;
    haptics.tap();
    setPace((p) => {
      const current = p ?? defaultDistance;
      return Math.min(maxDistance, Math.max(1, current + delta));
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 6 }]}>
      <View style={styles.header}>
        <Pressable onPress={onExit} hitSlop={12} testID="exit" accessibilityRole="button">
          <Text style={styles.headerLink}>‹ Courses</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          Hole {hole.number} · Par {hole.par}
        </Text>
        <Pressable onPress={onShowCard} hitSlop={12} testID="scorecard" accessibilityRole="button">
          <Text style={styles.headerLink}>{throughText} ›</Text>
        </Pressable>
      </View>
      <Text style={styles.subHeader}>
        {hole.yards} yds · {course.name}
      </Text>

      <View
        style={styles.board}
        onLayout={(e) =>
          setBoard({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
        }
      >
        {cellSize > 0 ? (
          <HoleView
            hole={hole}
            state={state}
            cellSize={cellSize}
            preview={preview}
            onAimAt={aimAt}
          />
        ) : null}
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusLeft}>
          <Text style={styles.statusLie}>{finished ? 'Holed out' : terrainNames[lie]}</Text>
          <Text style={styles.statusMessage} numberOfLines={2} testID="lie-message">
            {message}
          </Text>
        </View>
        <View style={styles.strokeBox}>
          <Text style={styles.strokeCount} testID="strokes">
            {state.strokes}
          </Text>
          <Text style={styles.strokeLabel}>{state.strokes === 1 ? 'stroke' : 'strokes'}</Text>
        </View>
      </View>

      {finished ? (
        <View style={styles.controls}>
          <Text style={styles.finishedTitle} testID="hole-result">
            {scoreName(state.strokes, hole.par)}
          </Text>
          <Button
            testID="next-hole"
            label={holeIndex === 17 ? 'Finish the round' : `Play hole ${hole.number + 1}`}
            onPress={nextHole}
          />
        </View>
      ) : (
        <View style={styles.controls}>
          <View style={styles.aimRow}>
            <Pressable
              testID="aim-left"
              onPress={() => rotate(-1)}
              style={styles.aimButton}
              accessibilityRole="button"
              accessibilityLabel="Aim left"
            >
              <Text style={styles.aimGlyph}>↺</Text>
            </Pressable>
            <View style={styles.aimReadout}>
              <Text style={styles.aimLabel}>AIM</Text>
              <Text style={styles.aimValue} testID="aim">
                {DIRECTIONS[dirIndex].name}
              </Text>
            </View>
            <Pressable
              testID="aim-right"
              onPress={() => rotate(1)}
              style={styles.aimButton}
              accessibilityRole="button"
              accessibilityLabel="Aim right"
            >
              <Text style={styles.aimGlyph}>↻</Text>
            </Pressable>
          </View>

          {roll == null ? (
            <Button
              testID="roll"
              label={rolling ? 'Rolling…' : 'Roll the die'}
              onPress={rollDie}
              disabled={rolling}
            />
          ) : (
            <View style={styles.swingRow}>
              <Die value={rollFace} size={52} />
              <View style={styles.carryBox}>
                <Text style={styles.carryLabel}>{puttable ? 'PUTT' : 'CARRY'}</Text>
                <View style={styles.carryValueRow}>
                  {puttable ? (
                    <Pressable
                      testID="pace-down"
                      onPress={() => adjustPace(-1)}
                      hitSlop={10}
                      style={styles.paceButton}
                    >
                      <Text style={styles.paceGlyph}>−</Text>
                    </Pressable>
                  ) : null}
                  <Text style={styles.carryValue} testID="carry">
                    {distance}
                  </Text>
                  {puttable ? (
                    <Pressable
                      testID="pace-up"
                      onPress={() => adjustPace(1)}
                      hitSlop={10}
                      style={styles.paceButton}
                    >
                      <Text style={styles.paceGlyph}>+</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <Button testID="hit" label="Hit" onPress={hit} style={styles.hitButton} />
            </View>
          )}

          <Pressable onPress={restartHole} hitSlop={8} testID="restart">
            <Text style={styles.restart}>Replay this hole</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLink: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  subHeader: { color: colors.inkSoft, fontSize: 12, textAlign: 'center', marginTop: 2 },
  board: { flex: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    gap: 12,
  },
  statusLeft: { flex: 1 },
  statusLie: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  statusMessage: { color: colors.inkSoft, fontSize: 13, marginTop: 2 },
  strokeBox: { alignItems: 'center', minWidth: 56 },
  strokeCount: { color: colors.ink, fontSize: 26, fontWeight: '800', lineHeight: 28 },
  strokeLabel: { color: colors.inkSoft, fontSize: 11 },
  controls: { paddingTop: 10, gap: 10 },
  aimRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  aimButton: {
    width: 56,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aimGlyph: { fontSize: 20, color: colors.ink },
  aimReadout: { flex: 1, alignItems: 'center' },
  aimLabel: { fontSize: 10, color: colors.inkSoft, letterSpacing: 1.5 },
  aimValue: { fontSize: 20, fontWeight: '800', color: colors.ink },
  swingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  carryBox: { flex: 1, alignItems: 'center' },
  carryLabel: { fontSize: 10, color: colors.inkSoft, letterSpacing: 1.5 },
  carryValueRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  carryValue: { fontSize: 24, fontWeight: '800', color: colors.ink, minWidth: 26, textAlign: 'center' },
  paceButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  paceGlyph: { fontSize: 22, color: colors.accent, fontWeight: '700' },
  hitButton: { paddingHorizontal: 30 },
  finishedTitle: { fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  restart: { color: colors.inkSoft, fontSize: 13, textAlign: 'center', paddingVertical: 4 },
});
