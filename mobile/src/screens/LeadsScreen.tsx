import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Picker } from '@react-native-picker/picker';
import { leadsApi } from '../utils/api';
import { Lead, LeadStatus, STATUS_LABELS } from '../types';
import { Colors } from '../constants/colors';
import LeadRow from '../components/LeadRow';
import LoadingSpinner from '../components/LoadingSpinner';
import { LeadsStackParamList } from '../navigation';

type Props = NativeStackScreenProps<LeadsStackParamList, 'LeadsList'>;

const SCORE_TIERS = [
  { label: 'All Scores', value: '' },
  { label: '70+ (High)', value: '70' },
  { label: '50+ (Medium)', value: '50' },
  { label: '30+ (Low)', value: '30' },
];

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ label: l, value: v })),
];

export default function LeadsScreen({ navigation }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [scoreTier, setScoreTier] = useState('');
  const [filterModal, setFilterModal] = useState<null | 'status' | 'score'>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leads', page, search, status, scoreTier],
    queryFn: () =>
      leadsApi.getAll({
        page,
        limit: 25,
        search: search || undefined,
        status: status || undefined,
        scoreTier: scoreTier || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const leads: Lead[] = data?.leads ?? [];
  const totalPages: number = data?.pagination?.totalPages ?? 1;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search address, city, owner..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={(t) => { setSearch(t); setPage(1); }}
          returnKeyType="search"
        />
      </View>

      {/* Filter pills */}
      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterPill, status ? styles.filterPillActive : undefined]}
          onPress={() => setFilterModal('status')}
        >
          <Text style={[styles.filterText, status ? styles.filterTextActive : undefined]}>
            {status ? STATUS_LABELS[status as LeadStatus] : 'Status'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterPill, scoreTier ? styles.filterPillActive : undefined]}
          onPress={() => setFilterModal('score')}
        >
          <Text style={[styles.filterText, scoreTier ? styles.filterTextActive : undefined]}>
            {scoreTier ? `${scoreTier}+ Score` : 'Score'}
          </Text>
        </TouchableOpacity>
        {(status || scoreTier) && (
          <TouchableOpacity
            style={styles.clearPill}
            onPress={() => { setStatus(''); setScoreTier(''); setPage(1); }}
          >
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <LoadingSpinner fullscreen />
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LeadRow
              lead={item}
              onPress={() => navigation.push('LeadDetail', { id: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <Text style={styles.empty}>No leads found</Text>
          }
        />
      )}

      {/* Pagination */}
      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
          onPress={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          <Text style={styles.pageBtnText}>← Prev</Text>
        </TouchableOpacity>
        <Text style={styles.pageInfo}>
          {page} / {totalPages}
        </Text>
        <TouchableOpacity
          style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
          onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          <Text style={styles.pageBtnText}>Next →</Text>
        </TouchableOpacity>
      </View>

      {/* Filter modals */}
      <Modal visible={filterModal !== null} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setFilterModal(null)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>
            {filterModal === 'status' ? 'Filter by Status' : 'Filter by Score'}
          </Text>
          <Picker
            selectedValue={filterModal === 'status' ? status : scoreTier}
            onValueChange={(val) => {
              if (filterModal === 'status') { setStatus(val); setPage(1); }
              else { setScoreTier(val); setPage(1); }
              setFilterModal(null);
            }}
          >
            {(filterModal === 'status' ? STATUS_OPTIONS : SCORE_TIERS).map((opt) => (
              <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </Picker>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchRow: { padding: 12, paddingBottom: 4 },
  searchInput: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  filterPillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  filterText: { fontSize: 13, color: Colors.textSecondary },
  filterTextActive: { color: Colors.primary, fontWeight: '600' },
  clearPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  clearText: { fontSize: 13, color: Colors.danger },
  list: { paddingHorizontal: 12, paddingBottom: 8 },
  empty: { textAlign: 'center', marginTop: 40, color: Colors.textSecondary, fontSize: 15 },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  pageBtnDisabled: { backgroundColor: Colors.border },
  pageBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  pageInfo: { fontSize: 13, color: Colors.textSecondary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
});
