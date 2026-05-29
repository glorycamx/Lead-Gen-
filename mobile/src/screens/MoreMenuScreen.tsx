import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { MoreStackParamList } from '../navigation';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreMenu'>;

const ITEMS = [
  { title: 'Exports', subtitle: 'View and download export files', icon: '⬇', route: 'Exports' as const },
  { title: 'Settings', subtitle: 'Configure scoring, filters, and scheduler', icon: '⚙', route: 'Settings' as const },
];

export default function MoreMenuScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>More</Text>
      {ITEMS.map((item) => (
        <TouchableOpacity
          key={item.route}
          style={styles.row}
          onPress={() => navigation.navigate(item.route)}
          activeOpacity={0.7}
        >
          <Text style={styles.icon}>{item.icon}</Text>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  row: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  icon: { fontSize: 24, marginRight: 14 },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  rowSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 22, color: Colors.textMuted },
});
