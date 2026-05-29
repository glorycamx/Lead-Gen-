import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Picker } from '@react-native-picker/picker';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { leadsApi } from '../utils/api';
import { Lead, LeadStatus, STATUS_LABELS } from '../types';
import { Colors, STATUS_COLORS } from '../constants/colors';
import ScoreBadge from '../components/ScoreBadge';
import StatusBadge from '../components/StatusBadge';
import ScoreBreakdownBars from '../components/ScoreBreakdownBars';
import LoadingSpinner from '../components/LoadingSpinner';
import { LeadsStackParamList } from '../navigation';

dayjs.extend(relativeTime);

type Props = NativeStackScreenProps<LeadsStackParamList, 'LeadDetail'>;

function InfoRow({ label, value }: { label: string; value?: string | number | boolean }) {
  if (value === undefined || value === null || value === '') return null;
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{display}</Text>
    </View>
  );
}

function DraftCard({ title, content }: { title: string; content?: string }) {
  if (!content) return null;

  async function copy() {
    await Clipboard.setStringAsync(content!);
    Alert.alert('Copied', `${title} copied to clipboard.`);
  }

  return (
    <View style={styles.draftCard}>
      <View style={styles.draftHeader}>
        <Text style={styles.draftTitle}>{title}</Text>
        <TouchableOpacity style={styles.copyBtn} onPress={copy}>
          <Text style={styles.copyBtnText}>Copy</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.draftContent}>{content}</Text>
    </View>
  );
}

export default function LeadDetailScreen({ route }: Props) {
  const { id } = route.params;
  const queryClient = useQueryClient();
  const [statusModal, setStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');

  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ['lead', id],
    queryFn: () => leadsApi.getById(id),
  });

  const { data: history } = useQuery({
    queryKey: ['leadHistory', id],
    queryFn: () => leadsApi.getHistory(id),
  });

  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) =>
      leadsApi.updateStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['leadHistory', id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setStatusModal(false);
    },
  });

  if (isLoading || !lead) return <LoadingSpinner fullscreen />;

  const breakdown = lead.scoreBreakdownParsed ?? (lead.scoreBreakdown ? JSON.parse(lead.scoreBreakdown) : null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.address}>{lead.address}</Text>
        <Text style={styles.cityLine}>{lead.city}, {lead.state} {lead.zipCode}</Text>
        <View style={styles.headerBadges}>
          <ScoreBadge score={lead.fitScore} />
          <StatusBadge status={lead.status} />
          {lead.solarCandidate && (
            <View style={[styles.tag, { backgroundColor: Colors.solarLight }]}>
              <Text style={[styles.tagText, { color: Colors.solar }]}>☀ Solar</Text>
            </View>
          )}
          {lead.massSaveCandidate && (
            <View style={[styles.tag, { backgroundColor: Colors.massSaveLight }]}>
              <Text style={[styles.tagText, { color: Colors.massSave }]}>⚡ MassSave</Text>
            </View>
          )}
        </View>
        {lead.suggestedAction && (
          <Text style={styles.suggestedAction}>Suggested: {lead.suggestedAction}</Text>
        )}
      </View>

      {/* Property details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Property</Text>
        <InfoRow label="Type" value={lead.propertyType?.replace(/_/g, ' ')} />
        <InfoRow label="Year Built" value={lead.yearBuilt} />
        <InfoRow label="Square Feet" value={lead.sqft?.toLocaleString()} />
        <InfoRow label="Lot Size" value={lead.lotSizeAcres ? `${lead.lotSizeAcres} acres` : undefined} />
        <InfoRow label="Bedrooms" value={lead.bedrooms} />
        <InfoRow label="Bathrooms" value={lead.bathrooms} />
        <InfoRow label="County" value={lead.county} />
        <InfoRow label="Parcel ID" value={lead.parcelId} />
      </View>

      {/* Owner info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Owner</Text>
        <InfoRow label="Name" value={lead.ownerName} />
        <InfoRow label="Mailing Address" value={lead.ownerMailingAddr} />
        <InfoRow label="Owner Occupied" value={lead.isOwnerOccupied} />
      </View>

      {/* Assessment */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Assessment</Text>
        <InfoRow
          label="Assessed Value"
          value={lead.assessedValue ? `$${lead.assessedValue.toLocaleString()}` : undefined}
        />
        <InfoRow
          label="Last Sale Price"
          value={lead.lastSalePrice ? `$${lead.lastSalePrice.toLocaleString()}` : undefined}
        />
        <InfoRow
          label="Last Sale Date"
          value={lead.lastSaleDate ? dayjs(lead.lastSaleDate).format('MMM D, YYYY') : undefined}
        />
      </View>

      {/* Score breakdown */}
      {breakdown && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Score Breakdown — {breakdown.total}/100</Text>
          <ScoreBreakdownBars breakdown={breakdown} />
          {lead.scoreExplainer && (
            <Text style={styles.explainer}>{lead.scoreExplainer}</Text>
          )}
        </View>
      )}

      {/* Status */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Status</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => { setPendingStatus(lead.status); setStatusModal(true); }}
          >
            <Text style={styles.editBtnText}>Change</Text>
          </TouchableOpacity>
        </View>
        <StatusBadge status={lead.status} />
        {lead.statusNotes && (
          <Text style={styles.statusNotes}>{lead.statusNotes}</Text>
        )}
        {lead.statusUpdatedAt && (
          <Text style={styles.statusDate}>
            Updated {dayjs(lead.statusUpdatedAt).fromNow()}
          </Text>
        )}
      </View>

      {/* Outreach drafts */}
      {(lead.doorKnockNote || lead.smsDraft || lead.emailDraft) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Outreach Drafts</Text>
          <DraftCard title="Door Knock Note" content={lead.doorKnockNote} />
          <DraftCard title="SMS Draft" content={lead.smsDraft} />
          <DraftCard title="Email Draft" content={lead.emailDraft} />
        </View>
      )}

      {/* Status history */}
      {history?.history?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status History</Text>
          {history.history.slice(0, 5).map((h: any, i: number) => (
            <View key={h.id ?? i} style={styles.historyRow}>
              <Text style={styles.historyStatus}>{STATUS_LABELS[h.newStatus as LeadStatus] ?? h.newStatus}</Text>
              <Text style={styles.historyDate}>{dayjs(h.changedAt).fromNow()}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Status change modal */}
      <Modal visible={statusModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setStatusModal(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Change Status</Text>
          <Picker
            selectedValue={pendingStatus}
            onValueChange={(val) => setPendingStatus(val)}
          >
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <Picker.Item key={val} label={label} value={val} />
            ))}
          </Picker>
          <TouchableOpacity
            style={[styles.saveBtn, isUpdating && styles.saveBtnDisabled]}
            onPress={() => updateStatus({ status: pendingStatus })}
            disabled={isUpdating}
          >
            <Text style={styles.saveBtnText}>{isUpdating ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  headerCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  address: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  cityLine: { fontSize: 14, color: Colors.textSecondary, marginBottom: 10 },
  headerBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: '500' },
  suggestedAction: { fontSize: 13, color: Colors.primary, fontWeight: '500', marginTop: 4 },
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
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 10 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: 13, color: Colors.textSecondary },
  infoValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },
  explainer: { fontSize: 12, color: Colors.textSecondary, marginTop: 10, fontStyle: 'italic' },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  editBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  statusNotes: { fontSize: 13, color: Colors.textSecondary, marginTop: 8 },
  statusDate: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  draftCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  draftHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  draftTitle: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  copyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
  },
  copyBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  draftContent: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyStatus: { fontSize: 13, color: Colors.textPrimary },
  historyDate: { fontSize: 12, color: Colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  saveBtn: {
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
