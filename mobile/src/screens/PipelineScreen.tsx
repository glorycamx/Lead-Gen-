import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { pipelineApi } from '../utils/api';
import { ExportRun } from '../types';
import { Colors } from '../constants/colors';
import StepCard from '../components/StepCard';
import PipelineRunRow from '../components/PipelineRunRow';
import { PIPELINE_REFETCH_INTERVAL } from '../constants/api';

dayjs.extend(relativeTime);

export default function PipelineScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['pipelineStatus'],
    queryFn: pipelineApi.getStatus,
    refetchInterval: PIPELINE_REFETCH_INTERVAL,
  });

  const { mutate: runFull, isPending: isRunningFull } = useMutation({
    mutationFn: pipelineApi.run,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipelineStatus'] }),
  });

  const { mutate: runIngest, isPending: isIngesting } = useMutation({
    mutationFn: pipelineApi.ingest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipelineStatus'] }),
  });

  const { mutate: runScore, isPending: isScoring } = useMutation({
    mutationFn: pipelineApi.score,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipelineStatus'] }),
  });

  const { mutate: runNotes, isPending: isGeneratingNotes } = useMutation({
    mutationFn: pipelineApi.generateNotes,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipelineStatus'] }),
  });

  const isAnyRunning = isRunningFull || isIngesting || isScoring || isGeneratingNotes;
  const recentRuns: ExportRun[] = data?.recentRuns ?? [];
  const scheduler = data?.scheduler;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <Text style={styles.title}>Pipeline</Text>

      {/* Full run banner */}
      <View style={styles.fullRunCard}>
        <View style={styles.fullRunInfo}>
          <Text style={styles.fullRunTitle}>Run Full Pipeline</Text>
          <Text style={styles.fullRunSubtitle}>Ingest → Score → Generate Notes → Export</Text>
        </View>
        <TouchableOpacity
          style={[styles.fullRunBtn, isAnyRunning && styles.fullRunBtnDisabled]}
          onPress={() => runFull()}
          disabled={isAnyRunning}
        >
          {isRunningFull ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.fullRunBtnText}>▶ Run</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Individual steps */}
      <Text style={styles.sectionTitle}>Individual Steps</Text>
      <StepCard
        step={1}
        title="Ingest CSVs"
        description="Parse uploaded CSV files and add new leads to the database"
        onRun={() => runIngest()}
        isLoading={isIngesting}
        isDisabled={isAnyRunning && !isIngesting}
      />
      <StepCard
        step={2}
        title="Score Leads"
        description="Calculate fit scores for all unscored leads"
        onRun={() => runScore()}
        isLoading={isScoring}
        isDisabled={isAnyRunning && !isScoring}
      />
      <StepCard
        step={3}
        title="Generate Notes"
        description="Create AI-drafted outreach messages for scored leads"
        onRun={() => runNotes()}
        isLoading={isGeneratingNotes}
        isDisabled={isAnyRunning && !isGeneratingNotes}
      />

      {/* Scheduler status */}
      {scheduler && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scheduler</Text>
          <View style={styles.schedulerRow}>
            <View style={[styles.dot, { backgroundColor: scheduler.running ? Colors.success : Colors.textMuted }]} />
            <Text style={styles.schedulerStatus}>{scheduler.running ? 'Active' : 'Inactive'}</Text>
            {scheduler.cron && <Text style={styles.schedulerCron}>{scheduler.cron}</Text>}
          </View>
          {scheduler.nextRun && (
            <Text style={styles.schedulerNext}>Next run: {dayjs(scheduler.nextRun).fromNow()}</Text>
          )}
        </View>
      )}

      {/* Run history */}
      <Text style={styles.sectionTitle}>Run History</Text>
      {isLoading ? null : recentRuns.length === 0 ? (
        <Text style={styles.empty}>No runs yet</Text>
      ) : (
        recentRuns.map((run) => <PipelineRunRow key={run.id} run={run} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  fullRunCard: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fullRunInfo: { flex: 1 },
  fullRunTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  fullRunSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  fullRunBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  fullRunBtnDisabled: { opacity: 0.5 },
  fullRunBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginBottom: 10, marginTop: 4 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  schedulerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  schedulerStatus: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  schedulerCron: { fontSize: 12, color: Colors.textSecondary, fontFamily: 'monospace' },
  schedulerNext: { fontSize: 13, color: Colors.textSecondary },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 8, fontSize: 14 },
});
