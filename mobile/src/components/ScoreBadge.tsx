import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface Props {
  score: number;
  size?: 'sm' | 'md';
}

function getScoreColor(score: number) {
  if (score >= 70) return { bg: Colors.successLight, text: Colors.scoreHigh };
  if (score >= 50) return { bg: '#fef9c3', text: Colors.scoreMedium };
  if (score >= 30) return { bg: '#ffedd5', text: Colors.scoreLow };
  return { bg: '#fee2e2', text: Colors.scoreVeryLow };
}

export default function ScoreBadge({ score, size = 'md' }: Props) {
  const { bg, text } = getScoreColor(score);
  const isSmall = size === 'sm';
  return (
    <View style={[styles.badge, { backgroundColor: bg }, isSmall && styles.small]}>
      <Text style={[styles.text, { color: text }, isSmall && styles.textSmall]}>
        {score}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 12,
  },
});
