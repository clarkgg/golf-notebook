import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Terrain } from '../core/types';
import { colors, radius, terrainColors, terrainNames } from '../ui/theme';

const LEGEND: { terrain: Terrain; note: string }[] = [
  { terrain: 'fairway', note: 'Roll + 1 — the fairway gives you a boost.' },
  { terrain: 'green', note: 'Putting. Play any distance up to your roll.' },
  { terrain: 'rough', note: 'Roll − 1.' },
  { terrain: 'sand', note: 'Roll − 2.' },
  { terrain: 'trees', note: 'Stops a shot dead. From the trees you can only punch out 2.' },
  { terrain: 'water', note: 'Fly over it freely, but landing costs a penalty stroke.' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function RulesScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 },
      ]}
    >
      <Pressable onPress={onBack} hitSlop={12} testID="rules-back">
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title}>How to play</Text>

      <Section title="A hole">
        <Text style={styles.body}>
          Every hole is a grid. Your ball starts on the tee at the bottom and the flag is somewhere
          up the page. Get there in as few strokes as you can.
        </Text>
      </Section>

      <Section title="A stroke">
        <Text style={styles.body}>
          Aim in one of the eight directions — tap a square to point that way, or nudge with the
          arrows. Roll the die: that number, adjusted for the lie you are playing from, is how many
          squares the ball travels in a straight line. The dotted line shows exactly where it will
          finish before you commit.
        </Text>
      </Section>

      <Section title="The lie">
        <View style={styles.legend}>
          {LEGEND.map(({ terrain, note }) => (
            <View key={terrain} style={styles.legendRow}>
              <View style={[styles.swatch, { backgroundColor: terrainColors[terrain] }]} />
              <View style={styles.legendText}>
                <Text style={styles.legendName}>{terrainNames[terrain]}</Text>
                <Text style={styles.legendNote}>{note}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.body}>A shot always travels at least one square, however bad the lie.</Text>
      </Section>

      <Section title="Trouble">
        <Text style={styles.body}>
          Water is a penalty stroke and a drop at the last dry square the ball flew over. Leaving the
          hole altogether is stroke and distance — a penalty, and you play again from the same spot.
          Trees simply stop the ball where it hits them.
        </Text>
      </Section>

      <Section title="Holing out">
        <Text style={styles.body}>
          The ball has to come to rest in the cup, so flying over the flag does nothing. Once you are
          on the green you control the pace: play any distance from one square up to your roll, which
          is how you drop the last putt.
        </Text>
      </Section>

      <Section title="The notebook">
        <Text style={styles.body}>
          A notebook code generates three courses of eighteen holes, par 72 each. The same code
          always produces the same courses, so you can replay a round or hand the code to someone
          else and play the same golf.
        </Text>
      </Section>

      <Text style={styles.credit}>
        A digital take on the pocket roll-and-write golf notebook by Gladden Design. The exact
        numbers here are this app's own reading of the game.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 20, gap: 6 },
  back: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  title: { color: colors.ink, fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  section: { marginTop: 16 },
  sectionTitle: {
    color: colors.inkSoft,
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  legend: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    gap: 10,
    marginBottom: 10,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 26, height: 26, borderRadius: 6, borderWidth: 1, borderColor: colors.line },
  legendText: { flex: 1 },
  legendName: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  legendNote: { color: colors.inkSoft, fontSize: 13, marginTop: 1 },
  credit: { color: colors.inkFaint, fontSize: 12, lineHeight: 18, marginTop: 24 },
});
