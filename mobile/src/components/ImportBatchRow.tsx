import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ImportBatch } from '../types';
import { Colors } from '../constants/colors';

dayjs.extend(relativeTime);

interface Props {
  batch: ImportBatch;
}

const STATUS_COLORS: Record<string, string> = {
  completed: Colors.success,
  processing: Colors.warning,
  failed: Colors.danger,
  pending: Colors.textSecondary,
};

export default function ImportBatchRow({ batch }: Props) {
  const statusColor = STATUS_COLORS[batch.status] ?? Colors.textSecondary;
  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={styles.fileName} numberOfLines={1}>{batch.fileName}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{batch.status}</Text>
      </View>
      <View style={styles.stats}>
        <Text style={styles.stat}>Total: {batch.totalRows}</Text>
        <Text style={styles.stat}>Valid: {batch.validRows}</Text>
        <Text style={styles.stat}>Dupes: {batch.duplicateRows}</Text>
        {batch.errorRows > 0 && (
          <Text style={[styles.stat, { color: Colors.danger }]}>Errors: {batch.errorRows}</Text>
        )}
      </View>
      <Text style={styles.date}>{dayjs(batch.createdAt).fromNow()}</Text>
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
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  stat: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  date: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
