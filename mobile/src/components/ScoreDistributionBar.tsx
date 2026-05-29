import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface Distribution {
  high: number;
  medium: number;
  low: number;
  veryLow: number;
}

interface Props {
  distribution: Distribution;
  total: number;
}

export default function ScoreDistributionBar({ distribution, total }: Props) {
  const tiers = [
    { label: 'High (70+)', value: distribution.high, color: Colors.scoreHigh },
    { label: 'Medium (50+)', value: distribution.medium, color: Colors.scoreMedium },
    { label: 'Low (30+)', value: distribution.low, color: Colors.scoreLow },
    { label: 'Very Low', value: distribution.veryLow, color: Colors.scoreVeryLow },
  ];

  return (
    <View>
      <View style={styles.bar}>
        {tiers.map((tier) => {
          const pct = total > 0 ? (tier.value / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <View
              key={tier.label}
              style={[styles.segment, { flex: pct, backgroundColor: tier.color }]}
            />
          );
        })}
      </View>
      <View style={styles.legend}>
        {tiers.map((tier) => (
          <View key={tier.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: tier.color }]} />
            <Text style={styles.legendText}>
              {tier.label}: {tier.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: Colors.border,
    marginBottom: 10,
  },
  segment: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
