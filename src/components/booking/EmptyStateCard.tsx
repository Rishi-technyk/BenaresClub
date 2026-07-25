import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { useAppTheme } from '../../theme/AppThemeProvider';

type Props = {
  title: string;
  description: string;
  type?: 'empty' | 'error';
};

const EmptyStateCard: React.FC<Props> = ({ title, description, type = 'empty' }) => {
  const { colors } = useAppTheme();
  const source =
    type === 'error'
      ? require('../../screens/Animations/Cross_loop.json')
      : require('../../screens/Animations/wave_animation.json');

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <LottieView source={source} autoPlay loop style={styles.animation} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    margin: 16,
    padding: 18,
    alignItems: 'center',
  },
  animation: {
    width: 120,
    height: 120,
  },
  title: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default EmptyStateCard;
