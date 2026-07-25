import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppTheme } from '../../theme/AppThemeProvider';
import MetaPill from '../cards/MetaPill';

type HeroMeta = {
  label: string;
  value: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral';
};

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  status: string;
  statusTone?: 'success' | 'warning' | 'danger' | 'neutral';
  meta?: HeroMeta[];
};

const BookingHeroCard: React.FC<Props> = ({
  eyebrow,
  title,
  subtitle,
  status,
  statusTone = 'neutral',
  meta = [],
}) => {
  const { colors ,resolvedMode} = useAppTheme();

  return (
    <Animated.View entering={FadeInDown.duration(320)} style={styles.wrapper}>
      <LinearGradient
        colors={resolvedMode === 'dark'
          ? ['#020617', '#0F172A', '#1E293B']
          : ['#1E293B', '#334155', '#475569']}

        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={{ padding: 22, overflow: 'hidden' }}>

       
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {eyebrow ? <Text style={[styles.eyebrow, { color: colors.onPrimary }]}>{eyebrow}</Text> : null}
            <Text style={[styles.title, { color: colors.onPrimary }]}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: `${colors.onPrimary}DD` }]}>{subtitle}</Text> : null}
          </View>
          <MetaPill label="Status" value={status} tone={statusTone} />
        </View>

        {!!meta.length && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.metaRow}
          >
            {meta.map((item, index) => (
              <MetaPill
                key={`${item.label}-${index}`}
                label={item.label}
                value={item.value}
                tone={item.tone}
              />
            ))}
          </ScrollView>
        )}
         </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 14,
    borderRadius: 28,
    overflow: 'hidden',
  },
  gradient: {
    
    // padding: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    marginTop: 18,
    paddingRight: 8,
  },
});

export default BookingHeroCard;
