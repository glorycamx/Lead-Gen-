import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ExportRun } from '../types';
import { Colors } from '../constants/colors';

dayjs.extend(relativeTime);

interface Props {
  run: ExportRun;
}

const STATUS_COLORS: Record<string, string> = {
  completed: Colors.success,
  running: Colors.warning,
  failed: Colors.danger,
  pending: Colors.textSecondary,
};

export default function PipelineRunRow({ run }: Props) {
  const statusColor = STATUS_COLORS[run.status] ?? Colors.textSecondary;
  const duration = run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '—';
  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={styles.runType}>{run.runType}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{run.status}</Text>
      </View>
      <View style={styles.stats}>
        <Text style={styles.stat}>Processed: {run.totalLeadsProcessed}</Text>
        <Text style={styles.stat}>New: {run.newLeadsAdded}</Text>
        <Text style={styles.stat}>Exported: {run.leadsExported}</Text>
        <Text style={styles.stat}>Duration: {duration}</Text>
      </View>
      {run.errorMessage ? (
        <Text style={styles.error} numberOfLines={2}>{run.errorMessage}</Text>
      ) : null}
      <Text style={styles.date}>{dayjs(run.createdAt).fromNow()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  runType: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  stat: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  error: {
    fontSize: 12,
    color: Colors.danger,
    marginBottom: 4,
  },
  date: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
