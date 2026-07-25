import React from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import { useAppTheme } from '../../theme/AppThemeProvider';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

const BookingDetailSkeleton: React.FC = () => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ShimmerPlaceholder style={styles.hero} />
      <ShimmerPlaceholder style={styles.card} />
      <ShimmerPlaceholder style={styles.card} />
      <ShimmerPlaceholder style={styles.card} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  hero: {
    height: 190,
    borderRadius: 24,
    marginBottom: 18,
  },
  card: {
    height: 120,
    borderRadius: 18,
    marginBottom: 16,
  },
});

export default BookingDetailSkeleton;
