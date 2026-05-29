import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { importsApi } from '../utils/api';
import { ImportBatch } from '../types';
import { Colors } from '../constants/colors';
import ImportBatchRow from '../components/ImportBatchRow';
import LoadingSpinner from '../components/LoadingSpinner';

const EXPECTED_COLUMNS = [
  'street_number', 'street_name', 'unit', 'city', 'state', 'zip_code',
  'property_type', 'year_built', 'sqft', 'assessed_value', 'owner_name',
  'is_owner_occupied',
];

export default function ImportsScreen() {
  const queryClient = useQueryClient();
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['importBatches'],
    queryFn: () => importsApi.getBatches({ limit: 20 }),
  });

  const { mutate: upload, isPending: isUploading } = useMutation({
    mutationFn: ({ uri, name }: { uri: string; name: string }) =>
      importsApi.upload(uri, name),
    onSuccess: (result) => {
      setUploadResult({
        success: true,
        message: `Imported ${result.validRows ?? 0} valid rows (${result.duplicateRows ?? 0} duplicates, ${result.errorRows ?? 0} errors)`,
      });
      queryClient.invalidateQueries({ queryKey: ['importBatches'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: any) => {
      setUploadResult({
        success: false,
        message: err?.response?.data?.error ?? 'Upload failed. Please try again.',
      });
    },
  });

  async function pickAndUpload() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      upload({ uri: asset.uri, name: asset.name });
    } catch {
      Alert.alert('Error', 'Could not open file picker');
    }
  }

  const batches: ImportBatch[] = data?.batches ?? [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Imports</Text>

        {/* Upload card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload CSV File</Text>
          <Text style={styles.cardSubtitle}>
            Select a CSV file exported from your town assessor's office
          </Text>

          <TouchableOpacity
            style={[styles.uploadBtn, isUploading && styles.uploadBtnDisabled]}
            onPress={pickAndUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <LoadingSpinner size="small" color="#fff" />
            ) : (
              <Text style={styles.uploadBtnText}>📁  Choose CSV File</Text>
            )}
          </TouchableOpacity>

          {uploadResult && (
            <View style={[styles.resultBanner, uploadResult.success ? styles.resultSuccess : styles.resultError]}>
              <Text style={[styles.resultText, uploadResult.success ? styles.resultTextSuccess : styles.resultTextError]}>
                {uploadResult.success ? '✓ ' : '✕ '}
                {uploadResult.message}
              </Text>
            </View>
          )}
        </View>

        {/* Expected columns */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Expected Columns</Text>
          <View style={styles.columns}>
            {EXPECTED_COLUMNS.map((col) => (
              <View key={col} style={styles.colTag}>
                <Text style={styles.colText}>{col}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Compliance note */}
        <View style={[styles.card, styles.warningCard]}>
          <Text style={styles.warningTitle}>⚠ Data Usage Reminder</Text>
          <Text style={styles.warningText}>
            Only upload data you are legally authorized to use. Assessor data from
            public sources is generally permissible — never upload scraped or
            purchased contact lists.
          </Text>
        </View>

        {/* Import history */}
        <Text style={styles.sectionTitle}>Import History</Text>
        {isLoading ? (
          <LoadingSpinner />
        ) : batches.length === 0 ? (
          <Text style={styles.empty}>No imports yet</Text>
        ) : (
          batches.map((batch) => <ImportBatchRow key={batch.id} batch={batch} />)
        )}
      </ScrollView>
    </View>
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
  uploadBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  resultBanner: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
  },
  resultSuccess: { backgroundColor: Colors.successLight },
  resultError: { backgroundColor: Colors.dangerLight },
  resultText: { fontSize: 13 },
  resultTextSuccess: { color: Colors.success },
  resultTextError: { color: Colors.danger },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  colTag: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  colText: { fontSize: 11, color: Colors.textSecondary, fontFamily: 'monospace' },
  warningCard: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  warningTitle: { fontSize: 14, fontWeight: '600', color: '#92400e', marginBottom: 6 },
  warningText: { fontSize: 13, color: '#78350f', lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginBottom: 10, marginTop: 4 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 16, fontSize: 14 },
});
