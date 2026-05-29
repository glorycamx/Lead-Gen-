import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Lead } from '../types';
import { Colors } from '../constants/colors';
import ScoreBadge from './ScoreBadge';
import StatusBadge from './StatusBadge';

interface Props {
  lead: Lead;
  onPress: () => void;
}

export default function LeadRow({ lead, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.main}>
        <Text style={styles.address} numberOfLines={1}>{lead.address}</Text>
        <Text style={styles.city}>{lead.city}, {lead.state} {lead.zipCode}</Text>
        <View style={styles.badges}>
          <StatusBadge status={lead.status} />
          {lead.solarCandidate && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>☀ Solar</Text>
            </View>
          )}
          {lead.massSaveCandidate && (
            <View style={[styles.tag, styles.tagGreen]}>
              <Text style={[styles.tagText, styles.tagTextGreen]}>⚡ MassSave</Text>
            </View>
          )}
        </View>
      </View>
      <ScoreBadge score={lead.fitScore} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  main: {
    flex: 1,
    marginRight: 10,
  },
  address: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  city: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    backgroundColor: Colors.solarLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: Colors.solar,
    fontWeight: '500',
  },
  tagGreen: {
    backgroundColor: Colors.massSaveLight,
  },
  tagTextGreen: {
    color: Colors.massSave,
  },
});
