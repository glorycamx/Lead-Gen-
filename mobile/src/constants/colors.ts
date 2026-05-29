export const Colors = {
  scoreHigh: '#16a34a',
  scoreMedium: '#ca8a04',
  scoreLow: '#ea580c',
  scoreVeryLow: '#dc2626',

  primary: '#2563eb',
  primaryLight: '#dbeafe',
  success: '#16a34a',
  successLight: '#dcfce7',
  warning: '#ca8a04',
  warningLight: '#fef9c3',
  danger: '#dc2626',
  dangerLight: '#fee2e2',

  background: '#f3f4f6',
  card: '#ffffff',
  border: '#e5e7eb',

  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',

  solar: '#f97316',
  solarLight: '#ffedd5',
  massSave: '#16a34a',
  massSaveLight: '#dcfce7',

  statusNotContacted: '#6b7280',
  statusKnocked: '#2563eb',
  statusInterested: '#16a34a',
  statusNotHome: '#ca8a04',
  statusNotQualified: '#dc2626',
  statusConverted: '#7c3aed',
  statusDoNotContact: '#1f2937',
};

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  not_contacted: { bg: '#f3f4f6', text: '#6b7280' },
  knocked: { bg: '#dbeafe', text: '#1d4ed8' },
  interested: { bg: '#dcfce7', text: '#15803d' },
  not_home: { bg: '#fef9c3', text: '#a16207' },
  not_qualified: { bg: '#fee2e2', text: '#b91c1c' },
  converted: { bg: '#ede9fe', text: '#6d28d9' },
  do_not_contact: { bg: '#f1f5f9', text: '#334155' },
};
