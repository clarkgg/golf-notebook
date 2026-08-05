import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatToPar, totals } from '../core/scoring';
import type { Notebook } from '../core/types';
import { Button } from '../ui/Button';
import { colors, radius } from '../ui/theme';
import type { SaveData } from '../storage';

interface Props {
  notebook: Notebook;
  save: SaveData;
  onPlay: (courseIndex: number) => void;
  onShowCard: (courseIndex: number) => void;
  onNewNotebook: () => void;
  onShowRules: () => void;
}

export function HomeScreen({ notebook, save, onPlay, onShowCard, onNewNotebook, onShowRules }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 },
      ]}
    >
      <Text style={styles.kicker}>POCKET ROLL &amp; WRITE</Text>
      <Text style={styles.title}>Golf Notebook</Text>
      <Text style={styles.code} testID="notebook-code">
        {save.code}
      </Text>
      <Text style={styles.blurb}>
        Three courses, eighteen holes each, generated fresh for this notebook. One die, a line drawn
        across the grass, and whatever the terrain gives you.
      </Text>

      <View style={styles.list}>
        {notebook.courses.map((course, index) => {
          const round = save.rounds[String(index)];
          const t = round ? totals(course, round.card) : null;
          const done = t?.complete ?? false;
          const started = (t?.played ?? 0) > 0 || (round?.state?.strokes ?? 0) > 0;
          return (
            <Pressable
              key={course.seed}
              testID={`course-${index}`}
              onPress={() => onPlay(index)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              accessibilityRole="button"
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardIndex}>COURSE {index + 1}</Text>
                <Text style={styles.cardPar}>PAR {course.par}</Text>
              </View>
              <Text style={styles.cardName}>{course.name}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.cardStatus}>
                  {done
                    ? `Round complete · ${formatToPar(t!.toPar)}`
                    : started
                      ? `Through ${t!.played} · ${formatToPar(t!.toPar)}`
                      : 'Not started'}
                </Text>
                {started ? (
                  <Pressable onPress={() => onShowCard(index)} hitSlop={10}>
                    <Text style={styles.cardLink}>Scorecard ›</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.cardLink}>Play ›</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Button label="How to play" variant="secondary" onPress={onShowRules} testID="rules" />
      <Pressable onPress={onNewNotebook} hitSlop={8} testID="new-notebook">
        <Text style={styles.newLink}>Start a new notebook</Text>
      </Pressable>
      <Text style={styles.footnote}>
        A new notebook replaces these courses and clears every scorecard.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 22, gap: 12 },
  kicker: { color: colors.inkSoft, fontSize: 11, letterSpacing: 2.4, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 38, fontWeight: '800', letterSpacing: -0.8, marginTop: -2 },
  code: { color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  blurb: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  list: { gap: 12, marginTop: 6 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    padding: 16,
  },
  cardPressed: { opacity: 0.75 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardIndex: { color: colors.inkSoft, fontSize: 10, letterSpacing: 1.6, fontWeight: '700' },
  cardPar: { color: colors.inkSoft, fontSize: 10, letterSpacing: 1.6, fontWeight: '700' },
  cardName: { color: colors.ink, fontSize: 24, fontWeight: '800', marginVertical: 6 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardStatus: { color: colors.inkSoft, fontSize: 13 },
  cardLink: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  newLink: { color: colors.inkSoft, fontSize: 14, textAlign: 'center', paddingVertical: 6 },
  footnote: { color: colors.inkFaint, fontSize: 11, textAlign: 'center' },
});
