import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/AppThemeProvider';

type Item = {
  label: string;
  value?: string | number | null;
  highlight?: boolean;
};

type Props = {
  items: Item[];
  columns?: number;
};

const DetailGrid: React.FC<Props> = ({ items, columns = 2 }) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.grid}>
      {items.map((item, index) => (
        <View
          key={`${item.label}-${index}`}
          style={[
            styles.box,
            {
              width: columns === 1 ? '100%' : '48.5%',
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: colors.textMuted }]}>{item.label}</Text>
          <Text
            style={[
              styles.value,
              {
                color: item.highlight ? colors.success : colors.text,
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
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  box: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  value: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default DetailGrid;
