import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatToPar, totals } from '../core/scoring';
import type { Course } from '../core/types';
import { Button } from '../ui/Button';
import { colors, radius } from '../ui/theme';
import type { RoundSave } from '../storage';

interface Props {
  course: Course;
  round: RoundSave;
  onBack: () => void;
  onContinue: () => void;
  onReplay: () => void;
}

function Nine({ course, round, from }: { course: Course; round: RoundSave; from: number }) {
  const holes = course.holes.slice(from, from + 9);
  const t = totals(course, round.card, from, from + 9);
  return (
    <View style={styles.nine}>
      <Text style={styles.nineTitle}>{from === 0 ? 'OUT' : 'IN'}</Text>
      <View style={styles.table}>
        <View style={[styles.row, styles.headRow]}>
          <Text style={[styles.cell, styles.labelCell, styles.headText]}>HOLE</Text>
          {holes.map((h) => (
            <Text key={h.number} style={[styles.cell, styles.headText]}>
              {h.number}
            </Text>
          ))}
          <Text style={[styles.cell, styles.totalCell, styles.headText]}>TOT</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.cell, styles.labelCell, styles.parText]}>PAR</Text>
          {holes.map((h) => (
            <Text key={h.number} style={[styles.cell, styles.parText]}>
              {h.par}
            </Text>
          ))}
          <Text style={[styles.cell, styles.totalCell, styles.parText]}>{t.parPlayed || '—'}</Text>
        </View>
        <View style={[styles.row, styles.scoreRow]}>
          <Text style={[styles.cell, styles.labelCell, styles.scoreLabel]}>YOU</Text>
          {holes.map((h, i) => {
            const score = round.card[from + i];
            const diff = score == null ? 0 : score - h.par;
            return (
              <View key={h.number} style={styles.cell}>
                <Text
                  style={[
                    styles.scoreText,
                    diff < 0 && styles.under,
                    diff > 0 && styles.over,
                  ]}
                >
                  {score ?? '·'}
                </Text>
              </View>
            );
          })}
          <Text style={[styles.cell, styles.totalCell, styles.scoreText]}>{t.strokes || '—'}</Text>
        </View>
      </View>
    </View>
  );
}

export function ScorecardScreen({ course, round, onBack, onContinue, onReplay }: Props) {
  const insets = useSafeAreaInsets();
  const t = totals(course, round.card);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <Pressable onPress={onBack} hitSlop={12} testID="card-back">
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>

      <Text style={styles.title}>{course.name}</Text>
      <Text style={styles.subtitle}>Par {course.par} · 18 holes</Text>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue} testID="total-strokes">
            {t.strokes || '—'}
          </Text>
          <Text style={styles.summaryLabel}>STROKES</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue} testID="total-to-par">
            {t.played ? formatToPar(t.toPar) : '—'}
          </Text>
          <Text style={styles.summaryLabel}>TO PAR</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{t.played}</Text>
          <Text style={styles.summaryLabel}>PLAYED</Text>
        </View>
      </View>

      <Nine course={course} round={round} from={0} />
      <Nine course={course} round={round} from={9} />

      {t.complete ? (
        <>
          <Text style={styles.complete}>
            Round complete. Signed for {t.strokes} ({formatToPar(t.toPar)}).
          </Text>
          <Button
            label="Play this course again"
            variant="secondary"
            onPress={onReplay}
            testID="replay-course"
          />
        </>
      ) : (
        <Button
          label={`Continue at hole ${Math.min(round.holeIndex + 1, 18)}`}
          onPress={onContinue}
          testID="continue"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 16, gap: 10 },
  back: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: colors.inkSoft, fontSize: 13, marginTop: -6 },
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 14,
    marginVertical: 4,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { color: colors.ink, fontSize: 24, fontWeight: '800' },
  summaryLabel: { color: colors.inkSoft, fontSize: 10, letterSpacing: 1.4, marginTop: 2 },
  nine: { marginTop: 6 },
  nineTitle: { color: colors.inkSoft, fontSize: 11, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  table: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  headRow: { backgroundColor: colors.paperDeep },
  scoreRow: { borderTopWidth: 1, borderTopColor: colors.line },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  labelCell: { flex: 1.3, alignItems: 'flex-start', paddingLeft: 8 },
  totalCell: { flex: 1.3 },
  headText: { fontSize: 10, color: colors.inkSoft, fontWeight: '700', letterSpacing: 0.6 },
  parText: { fontSize: 13, color: colors.inkSoft },
  scoreLabel: { fontSize: 10, color: colors.ink, fontWeight: '800', letterSpacing: 0.6 },
  scoreText: { fontSize: 15, color: colors.ink, fontWeight: '700' },
  under: { color: colors.flag },
  over: { color: colors.inkSoft },
  complete: { color: colors.ink, fontSize: 14, textAlign: 'center', marginTop: 10, fontWeight: '600' },
});
