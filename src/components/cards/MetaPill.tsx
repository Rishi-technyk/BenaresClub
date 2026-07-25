import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/AppThemeProvider';

type Props = {
  label: string;
  value: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral';
};

const MetaPill: React.FC<Props> = ({ label, value, tone = 'neutral' }) => {
  const { colors ,} = useAppTheme();

  const palette =
    tone === 'success'
      ? { bg: `${colors.success}20`, fg: colors.success }
      : tone === 'warning'
      ? { bg: `${colors.warning}20`, fg: colors.warning }
      : tone === 'danger'
      ? { bg: `${colors.danger}20`, fg: colors.danger }
      : { bg: `${colors.onPrimary}20`, fg: colors.onPrimary };

  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.label, { color: colors.onPrimary }]}>{label}</Text>
      <Text style={[styles.value, { color: palette.fg }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
    minWidth: 80,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
});

export default MetaPill;
