import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_LABELS, LeadStatus } from '../types';
import { STATUS_COLORS } from '../constants/colors';

interface Props {
  status: string;
}

export default function StatusBadge({ status }: Props) {
  const colors = STATUS_COLORS[status] ?? { bg: '#f3f4f6', text: '#6b7280' };
  const label = STATUS_LABELS[status as LeadStatus] ?? status;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
