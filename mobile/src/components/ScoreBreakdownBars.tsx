import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScoreBreakdown } from '../types';
import { Colors } from '../constants/colors';

interface Props {
  breakdown: ScoreBreakdown;
}

const FACTOR_LABELS: Record<keyof Omit<ScoreBreakdown, 'total' | 'factors'>, string> = {
  propertyType: 'Property Type',
  sqft: 'Square Footage',
  age: 'Home Age',
  value: 'Assessed Value',
  ownerOccupied: 'Owner Occupied',
  dataCompleteness: 'Data Completeness',
};

const FACTOR_MAX: Record<keyof Omit<ScoreBreakdown, 'total' | 'factors'>, number> = {
  propertyType: 20,
  sqft: 15,
  age: 15,
  value: 15,
  ownerOccupied: 20,
  dataCompleteness: 10,
};

export default function ScoreBreakdownBars({ breakdown }: Props) {
  const keys = Object.keys(FACTOR_LABELS) as (keyof typeof FACTOR_LABELS)[];

  return (
    <View>
      {keys.map((key) => {
        const val = breakdown[key];
        const max = FACTOR_MAX[key];
        const pct = max > 0 ? Math.min((val / max) * 100, 100) : 0;
        return (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>{FACTOR_LABELS[key]}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%` as any }]} />
            </View>
            <Text style={styles.value}>
              {val}/{max}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  barTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 2,
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  value: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'right',
  },
});
