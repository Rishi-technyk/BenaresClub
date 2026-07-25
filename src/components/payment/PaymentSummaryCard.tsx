import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/AppThemeProvider';

type Props = {
  status?: string;
  items: Array<{ label: string; value?: string | number | null; emphasize?: boolean }>;
};

const PaymentSummaryCard: React.FC<Props> = ({ status, items }) => {
  const { colors } = useAppTheme();
console.log( status, '---------------------- status ---------------------');
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Payment Snapshot</Text>
        {status ? (
          <Text style={[styles.status, { color:status==='Failed' ?colors.danger: status==='Success' ?colors.success :colors.text}]}>{status}</Text>
        ) : null}
      </View>

      {items.map((item, index) => (
        <View
          key={`${item.label}-${index}`}
          style={[
            styles.row,
            index !== items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.label, { color: colors.textMuted }]}>{item.label}</Text>
          <Text
            style={[
              styles.value,
              {
                color: item.emphasize ? colors.success : colors.text,
              },
            ]}
          >
            {item.value ?? 'N/A'}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  status: {
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    flex: 1,
    marginRight: 12,
    fontSize: 13,
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default PaymentSummaryCard;
