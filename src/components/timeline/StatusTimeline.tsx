import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/AppThemeProvider';

type TimelineItem = {
  title: string;
  description?: string;
  time?: string | null;
  tone?: 'success' | 'warning' | 'danger' | 'neutral';
};

type Props = {
  items: TimelineItem[];
};

const StatusTimeline: React.FC<Props> = ({ items }) => {
  const { colors } = useAppTheme();

  const toneColor = (tone?: string) => {
    if (tone === 'success') return colors.success;
    if (tone === 'danger') return colors.danger;
    if (tone === 'warning') return colors.warning;
    return colors.primary;
  };

  return (
    <View>
      {items.map((item, index) => {
        const dotColor = toneColor(item.tone);
        const isLast = index === items.length - 1;

        return (
          <View key={`${item.title}-${index}`} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              {!isLast ? (
                <View style={[styles.line, { backgroundColor: colors.border }]} />
              ) : null}
            </View>
            <View style={styles.content}>
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              {item.description ? (
                <Text style={[styles.description, { color: colors.textMuted }]}>
                  {item.description}
                </Text>
              ) : null}
              {item.time ? (
                <Text style={[styles.time, { color: colors.textMuted }]}>{item.time}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  rail: {
    alignItems: 'center',
    width: 24,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 4,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -6,
  },
  content: {
    flex: 1,
    paddingBottom: 18,
    paddingLeft: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  time: {
    marginTop: 6,
    fontSize: 12,
  },
});

export default StatusTimeline;
