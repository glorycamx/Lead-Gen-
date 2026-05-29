import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Slider from '@react-native-community/slider';
import { configApi } from '../utils/api';
import { Config } from '../types';
import { Colors } from '../constants/colors';
import LoadingSpinner from '../components/LoadingSpinner';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DeepPartial<Config>>({});

  const { data: config, isLoading } = useQuery<Config>({
    queryKey: ['config'],
    queryFn: configApi.get,
  });

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: () => configApi.update(form as Record<string, any>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      Alert.alert('Saved', 'Configuration saved successfully');
    },
    onError: () => Alert.alert('Error', 'Failed to save configuration'),
  });

  function setFilters(updates: Partial<Config['filters']>) {
    setForm((f) => ({ ...f, filters: { ...f.filters, ...updates } as Config['filters'] }));
  }

  function setOutput(updates: Partial<Config['output']>) {
    setForm((f) => ({ ...f, output: { ...f.output, ...updates } as Config['output'] }));
  }

  function setScheduler(updates: Partial<Config['scheduler']>) {
    setForm((f) => ({ ...f, scheduler: { ...f.scheduler, ...updates } as Config['scheduler'] }));
  }

  function setScoring(updates: Partial<Config['scoring']>) {
    setForm((f) => ({ ...f, scoring: { ...f.scoring, ...updates } as Config['scoring'] }));
  }

  if (isLoading) return <LoadingSpinner fullscreen />;

  const filters = form.filters ?? ({} as Config['filters']);
  const output = form.output ?? ({} as Config['output']);
  const scheduler = form.scheduler ?? ({} as Config['scheduler']);
  const scoring = form.scoring ?? ({} as Config['scoring']);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={() => save()}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Targeting */}
      <SectionHeader title="Targeting" />
      <View style={styles.card}>
        <FieldLabel label="Target Towns (comma-separated)" />
        <TextInput
          style={styles.textInput}
          value={(form.target_towns ?? []).join(', ')}
          onChangeText={(t) => setForm((f) => ({ ...f, target_towns: t.split(',').map((s) => s.trim()).filter(Boolean) }))}
          placeholder="e.g. Worcester, Springfield, Lowell"
          placeholderTextColor={Colors.textMuted}
          multiline
        />
      </View>

      {/* Filters */}
      <SectionHeader title="Filters" />
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Exclude Condos</Text>
          <Switch
            value={!!filters.exclude_condos}
            onValueChange={(v) => setFilters({ exclude_condos: v })}
            trackColor={{ true: Colors.primary }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Prefer Single Family</Text>
          <Switch
            value={!!filters.prefer_single_family}
            onValueChange={(v) => setFilters({ prefer_single_family: v })}
            trackColor={{ true: Colors.primary }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Prefer Owner Occupied</Text>
          <Switch
            value={!!filters.prefer_owner_occupied}
            onValueChange={(v) => setFilters({ prefer_owner_occupied: v })}
            trackColor={{ true: Colors.primary }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Prefer Older Homes</Text>
          <Switch
            value={!!filters.prefer_older_homes}
            onValueChange={(v) => setFilters({ prefer_older_homes: v })}
            trackColor={{ true: Colors.primary }}
          />
        </View>
        <View style={styles.row2}>
          <View style={styles.halfField}>
            <FieldLabel label="Min Sq Ft" />
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={filters.min_sqft?.toString() ?? ''}
              onChangeText={(t) => setFilters({ min_sqft: t ? parseInt(t, 10) : undefined })}
              placeholder="800"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.halfField}>
            <FieldLabel label="Max Sq Ft" />
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={filters.max_sqft?.toString() ?? ''}
              onChangeText={(t) => setFilters({ max_sqft: t ? parseInt(t, 10) : undefined })}
              placeholder="5000"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>
        <View style={styles.row2}>
          <View style={styles.halfField}>
            <FieldLabel label="Min Year Built" />
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={filters.min_year_built?.toString() ?? ''}
              onChangeText={(t) => setFilters({ min_year_built: t ? parseInt(t, 10) : undefined })}
              placeholder="1900"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.halfField}>
            <FieldLabel label="Max Year Built" />
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={filters.max_year_built?.toString() ?? ''}
              onChangeText={(t) => setFilters({ max_year_built: t ? parseInt(t, 10) : undefined })}
              placeholder="2010"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>
      </View>

      {/* Output */}
      <SectionHeader title="Output" />
      <View style={styles.card}>
        <View style={styles.row2}>
          <View style={styles.halfField}>
            <FieldLabel label="Min Leads / Day" />
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={output.min_leads_per_day?.toString() ?? ''}
              onChangeText={(t) => setOutput({ min_leads_per_day: t ? parseInt(t, 10) : undefined })}
              placeholder="10"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.halfField}>
            <FieldLabel label="Max Leads / Day" />
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={output.max_leads_per_day?.toString() ?? ''}
              onChangeText={(t) => setOutput({ max_leads_per_day: t ? parseInt(t, 10) : undefined })}
              placeholder="100"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Export CSV</Text>
          <Switch
            value={!!output.export_csv}
            onValueChange={(v) => setOutput({ export_csv: v })}
            trackColor={{ true: Colors.primary }}
          />
        </View>
      </View>

      {/* Scheduler */}
      <SectionHeader title="Scheduler" />
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Enable Scheduler</Text>
          <Switch
            value={!!scheduler.enabled}
            onValueChange={(v) => setScheduler({ enabled: v })}
            trackColor={{ true: Colors.primary }}
          />
        </View>
        <FieldLabel label="Cron Expression" />
        <TextInput
          style={styles.textInput}
          value={scheduler.cron ?? ''}
          onChangeText={(t) => setScheduler({ cron: t })}
          placeholder="0 7 * * *"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
        />
        <FieldLabel label="Timezone" />
        <TextInput
          style={styles.textInput}
          value={scheduler.timezone ?? ''}
          onChangeText={(t) => setScheduler({ timezone: t })}
          placeholder="America/New_York"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
        />
      </View>

      {/* Scoring weights */}
      <SectionHeader title="Scoring Weights" />
      <View style={styles.card}>
        {[
          { key: 'single_family_weight' as const, label: 'Single Family', max: 30 },
          { key: 'sqft_weight' as const, label: 'Square Footage', max: 25 },
          { key: 'age_weight' as const, label: 'Home Age', max: 25 },
          { key: 'value_weight' as const, label: 'Assessed Value', max: 25 },
          { key: 'owner_occupied_weight' as const, label: 'Owner Occupied', max: 30 },
          { key: 'data_completeness_weight' as const, label: 'Data Completeness', max: 15 },
        ].map(({ key, label, max }) => (
          <View key={key} style={styles.sliderRow}>
            <View style={styles.sliderLabelRow}>
              <Text style={styles.sliderLabel}>{label}</Text>
              <Text style={styles.sliderValue}>{scoring[key] ?? 0}</Text>
            </View>
            <Slider
              minimumValue={0}
              maximumValue={max}
              step={1}
              value={(scoring[key] as number) ?? 0}
              onValueChange={(v) => setScoring({ [key]: v } as any)}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.border}
              thumbTintColor={Colors.primary}
            />
          </View>
        ))}
      </View>

      {/* Compliance */}
      <View style={[styles.card, styles.complianceCard]}>
        <Text style={styles.complianceTitle}>⚖ Compliance Reminder</Text>
        <Text style={styles.complianceText}>
          This system only processes data you provide. It never auto-sends messages,
          scrapes private data, or bypasses any access controls.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchLabel: { fontSize: 14, color: Colors.textPrimary },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 10, marginBottom: 4 },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  row2: { flexDirection: 'row', gap: 10, marginTop: 4 },
  halfField: { flex: 1 },
  sliderRow: { marginBottom: 10 },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  sliderLabel: { fontSize: 13, color: Colors.textPrimary },
  sliderValue: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  complianceCard: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  complianceTitle: { fontSize: 14, fontWeight: '600', color: '#166534', marginBottom: 6 },
  complianceText: { fontSize: 13, color: '#15803d', lineHeight: 18 },
});
