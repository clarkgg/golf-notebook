import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { generateNotebook } from './src/core/course';
import { randomNotebookCode } from './src/core/rng';
import { HomeScreen } from './src/screens/HomeScreen';
import { PlayScreen } from './src/screens/PlayScreen';
import { RulesScreen } from './src/screens/RulesScreen';
import { ScorecardScreen } from './src/screens/ScorecardScreen';
import { colors } from './src/ui/theme';
import { loadSave, newRound, newSave, persistSave, type RoundSave, type SaveData } from './src/storage';

type Screen =
  | { name: 'home' }
  | { name: 'play'; courseIndex: number }
  | { name: 'card'; courseIndex: number }
  | { name: 'rules' };

export default function App() {
  const [save, setSave] = useState<SaveData | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  useEffect(() => {
    let cancelled = false;
    loadSave().then((loaded) => {
      if (cancelled) return;
      setSave(loaded ?? newSave(randomNotebookCode()));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (save) void persistSave(save);
  }, [save]);

  const notebook = useMemo(() => (save ? generateNotebook(save.code) : null), [save?.code]);

  const updateRound = useCallback((courseIndex: number, round: RoundSave) => {
    setSave((prev) =>
      prev ? { ...prev, rounds: { ...prev.rounds, [String(courseIndex)]: round } } : prev,
    );
  }, []);

  const roundFor = useCallback(
    (courseIndex: number): RoundSave => save?.rounds[String(courseIndex)] ?? newRound(),
    [save],
  );

  const startPlaying = useCallback(
    (courseIndex: number) => {
      const existing = save?.rounds[String(courseIndex)];
      if (!existing) {
        updateRound(courseIndex, newRound());
      } else if (existing.card.every((score) => score != null)) {
        // The round is signed for; show the card rather than replaying the 18th.
        setScreen({ name: 'card', courseIndex });
        return;
      }
      setScreen({ name: 'play', courseIndex });
    },
    [save, updateRound],
  );

  if (!save || !notebook) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Golf Notebook</Text>
        </View>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  let content: React.ReactNode;
  if (screen.name === 'play') {
    const courseIndex = screen.courseIndex;
    content = (
      <PlayScreen
        course={notebook.courses[courseIndex]}
        round={roundFor(courseIndex)}
        onChange={(round) => updateRound(courseIndex, round)}
        onExit={() => setScreen({ name: 'home' })}
        onShowCard={() => setScreen({ name: 'card', courseIndex })}
      />
    );
  } else if (screen.name === 'card') {
    const courseIndex = screen.courseIndex;
    content = (
      <ScorecardScreen
        course={notebook.courses[courseIndex]}
        round={roundFor(courseIndex)}
        onBack={() => setScreen({ name: 'home' })}
        onContinue={() => setScreen({ name: 'play', courseIndex })}
        onReplay={() => {
          updateRound(courseIndex, newRound());
          setScreen({ name: 'play', courseIndex });
        }}
      />
    );
  } else if (screen.name === 'rules') {
    content = <RulesScreen onBack={() => setScreen({ name: 'home' })} />;
  } else {
    content = (
      <HomeScreen
        notebook={notebook}
        save={save}
        onPlay={startPlaying}
        onShowCard={(courseIndex) => setScreen({ name: 'card', courseIndex })}
        onNewNotebook={() => {
          setSave(newSave(randomNotebookCode()));
          setScreen({ name: 'home' });
        }}
        onShowRules={() => setScreen({ name: 'rules' })}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>{content}</View>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  loading: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.ink, fontSize: 24, fontWeight: '800' },
});
