import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { exportsApi } from '../utils/api';
import { ExportRun } from '../types';
import { Colors } from '../constants/colors';
import LoadingSpinner from '../components/LoadingSpinner';

dayjs.extend(relativeTime);

export default function ExportsScreen() {
  const queryClient = useQueryClient();
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['exportRuns'],
    queryFn: () => exportsApi.getRuns({ limit: 20 }),
  });

  const { mutate: quickExport, isPending: isExporting } = useMutation({
    mutationFn: exportsApi.quickExport,
    onSuccess: (result) => {
      setExportMsg(result?.message ?? 'Export created successfully');
      queryClient.invalidateQueries({ queryKey: ['exportRuns'] });
    },
    onError: () => setExportMsg('Export failed. Check the pipeline status.'),
  });

  const runs: ExportRun[] = data?.runs ?? [];

  function openFile(run: ExportRun) {
    if (!run.csvFilePath) return;
    const filename = run.csvFilePath.split('/').pop();
    if (!filename) return;
    const url = exportsApi.getDownloadUrl(filename);
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open the file'));
  }

  const STATUS_COLOR: Record<string, string> = {
    completed: Colors.success,
    running: Colors.warning,
    failed: Colors.danger,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Exports</Text>

      {/* Quick export */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Export</Text>
        <Text style={styles.cardSubtitle}>
          Export all scored leads as a CSV file on the server
        </Text>
        <TouchableOpacity
          style={[styles.exportBtn, isExporting && styles.exportBtnDisabled]}
          onPress={() => { setExportMsg(null); quickExport(); }}
          disabled={isExporting}
        >
          {isExporting ? (
            <LoadingSpinner size="small" color="#fff" />
          ) : (
            <Text style={styles.exportBtnText}>⬇  Export Now</Text>
          )}
        </TouchableOpacity>
        {exportMsg && (
          <View style={[styles.resultBanner, exportMsg.includes('failed') ? styles.resultError : styles.resultSuccess]}>
            <Text style={[styles.resultText, exportMsg.includes('failed') ? styles.resultTextError : styles.resultTextSuccess]}>
              {exportMsg}
            </Text>
          </View>
        )}
      </View>

      {/* Info note */}
      <View style={[styles.card, styles.infoCard]}>
        <Text style={styles.infoText}>
          ℹ  CSV files are saved on the server. Tap "Open" on any completed export to view the
          file in your browser (ensure the server is reachable).
        </Text>
      </View>

      {/* Export history */}
      <Text style={styles.sectionTitle}>Export History</Text>
      {isLoading ? (
        <LoadingSpinner />
      ) : runs.length === 0 ? (
        <Text style={styles.empty}>No exports yet — run the pipeline to generate your first export</Text>
      ) : (
        runs.map((run) => {
          const statusColor = STATUS_COLOR[run.status] ?? Colors.textSecondary;
          const duration = run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '—';
          return (
            <View key={run.id} style={styles.runCard}>
              <View style={styles.runHeader}>
                <Text style={styles.runType}>{run.runType}</Text>
                <Text style={[styles.runStatus, { color: statusColor }]}>{run.status}</Text>
              </View>
              <View style={styles.runStats}>
                <Text style={styles.stat}>Exported: {run.leadsExported}</Text>
                <Text style={styles.stat}>Duration: {duration}</Text>
              </View>
              {run.errorMessage && (
                <Text style={styles.error} numberOfLines={2}>{run.errorMessage}</Text>
              )}
              <View style={styles.runFooter}>
                <Text style={styles.runDate}>{dayjs(run.createdAt).fromNow()}</Text>
                {run.csvFilePath && run.status === 'completed' && (
                  <TouchableOpacity style={styles.openBtn} onPress={() => openFile(run)}>
                    <Text style={styles.openBtnText}>Open ↗</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14 },
  exportBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  resultBanner: { marginTop: 10, padding: 12, borderRadius: 8 },
  resultSuccess: { backgroundColor: Colors.successLight },
  resultError: { backgroundColor: Colors.dangerLight },
  resultText: { fontSize: 13 },
  resultTextSuccess: { color: Colors.success },
  resultTextError: { color: Colors.danger },
  infoCard: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  infoText: { fontSize: 13, color: '#1e40af', lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginBottom: 10 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 8, fontSize: 14, lineHeight: 20 },
  runCard: {
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
  runHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  runType: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, textTransform: 'capitalize' },
  runStatus: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  runStats: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  stat: { fontSize: 12, color: Colors.textSecondary },
  error: { fontSize: 12, color: Colors.danger, marginBottom: 4 },
  runFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  runDate: { fontSize: 11, color: Colors.textMuted },
  openBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
  },
  openBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
});
