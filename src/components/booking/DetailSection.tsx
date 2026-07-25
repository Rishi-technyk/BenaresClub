import React, { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppTheme } from '../../theme/AppThemeProvider';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  delay?: number;
}>;

const DetailSection: React.FC<Props> = ({ title, subtitle, delay = 0, children }) => {
  const { colors } = useAppTheme();

  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(delay)}
      style={[
        styles.section,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      <View style={styles.body}>{children}</View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  section: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  body: {
    marginTop: 16,
  },
});

export default DetailSection;
