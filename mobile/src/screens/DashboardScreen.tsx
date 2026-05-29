import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { statsApi, pipelineApi } from '../utils/api';
import { DashboardStats } from '../types';
import { Colors } from '../constants/colors';
import StatCard from '../components/StatCard';
import ScoreDistributionBar from '../components/ScoreDistributionBar';
import LoadingSpinner from '../components/LoadingSpinner';

dayjs.extend(relativeTime);

export default function DashboardScreen() {
  const {
    data: stats,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: statsApi.getDashboard,
  });

  const { data: pipelineStatus } = useQuery({
    queryKey: ['pipelineStatus'],
    queryFn: pipelineApi.getStatus,
  });

  if (isLoading) return <LoadingSpinner fullscreen />;

  const lastRun = pipelineStatus?.recentRuns?.[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        {lastRun && (
          <Text style={styles.subtitle}>Last run {dayjs(lastRun.createdAt).fromNow()}</Text>
        )}
      </View>

      {stats && (
        <>
          {/* Stats grid */}
          <View style={styles.grid}>
            <StatCard title="Total Leads" value={stats.totalLeads} accentColor={Colors.primary} />
            <StatCard
              title="Avg Score"
              value={stats.scores.average.toFixed(1)}
              accentColor={Colors.scoreMedium}
            />
            <StatCard
              title="Solar Candidates"
              value={stats.programFit.solarCandidates}
              accentColor={Colors.solar}
            />
            <StatCard
              title="Mass Save"
              value={stats.programFit.massSaveCandidates}
              accentColor={Colors.massSave}
            />
          </View>

          {/* Score distribution */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Score Distribution</Text>
            <ScoreDistributionBar
              distribution={stats.scores.distribution}
              total={stats.totalLeads}
            />
          </View>

          {/* Status breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Lead Status</Text>
            {Object.entries(stats.statusCounts).map(([status, count]) => (
              <View key={status} style={styles.statusRow}>
                <Text style={styles.statusLabel}>{status.replace(/_/g, ' ')}</Text>
                <Text style={styles.statusCount}>{count}</Text>
              </View>
            ))}
          </View>

          {/* Top cities */}
          {stats.topCities.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top Cities</Text>
              {stats.topCities.slice(0, 5).map((c) => (
                <View key={c.city} style={styles.statusRow}>
                  <Text style={styles.statusLabel}>{c.city}</Text>
                  <Text style={styles.statusCount}>{c.count}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Program fit */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Program Fit</Text>
            <View style={styles.programRow}>
              <View style={styles.programBox}>
                <Text style={[styles.programValue, { color: Colors.solar }]}>
                  {stats.programFit.solarCandidates}
                </Text>
                <Text style={styles.programLabel}>Solar Only</Text>
              </View>
              <View style={styles.programBox}>
                <Text style={[styles.programValue, { color: Colors.massSave }]}>
                  {stats.programFit.massSaveCandidates}
                </Text>
                <Text style={styles.programLabel}>Mass Save</Text>
              </View>
              <View style={styles.programBox}>
                <Text style={[styles.programValue, { color: Colors.primary }]}>
                  {stats.programFit.bothCandidates}
                </Text>
                <Text style={styles.programLabel}>Both</Text>
              </View>
            </View>
          </View>

          {/* Recent activity */}
          {stats.recentActivity.imports.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Imports</Text>
              {stats.recentActivity.imports.slice(0, 3).map((imp) => (
                <View key={imp.id} style={styles.activityRow}>
                  <Text style={styles.activityName} numberOfLines={1}>{imp.fileName}</Text>
                  <Text style={styles.activityDate}>{dayjs(imp.createdAt).fromNow()}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
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
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusLabel: { fontSize: 13, color: Colors.textSecondary, textTransform: 'capitalize' },
  statusCount: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  programRow: { flexDirection: 'row', justifyContent: 'space-around' },
  programBox: { alignItems: 'center' },
  programValue: { fontSize: 28, fontWeight: '700' },
  programLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  activityName: { fontSize: 13, color: Colors.textPrimary, flex: 1, marginRight: 8 },
  activityDate: { fontSize: 12, color: Colors.textMuted },
});
