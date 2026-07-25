import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import QuantityCounter from './QuantityCounter';
import { FONT_FAMILY } from '../util/colors';
import { useAppTheme } from '../theme/AppThemeProvider';

type Props = {
  data: any;
  quantity: number;
  onChange: (quantity: number) => void;
};

const TicketCard: React.FC<Props> = ({ data, quantity, onChange }) => {
  const { colors,resolvedMode } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const soldOut = Boolean(data?.sold_out);
  const isComplimentary = Number(data?.price || 0) === 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: soldOut ? 0.6 : 1,
        },
      ]}
    >
      <LinearGradient
                 colors={resolvedMode === 'dark'
      ? ['#020617', '#0F172A', '#1E293B']
      : ['#1E293B', '#334155', '#475569']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
               <View style={{ padding: 22, overflow: 'hidden' }}>

       
        <View style={styles.heroHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{data?.title}</Text>
            {/* <Text style={styles.description}>
              {data?.description || 'Event access pass'}
            </Text> */}
          </View>

          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>
              {soldOut ? 'Sold out' : `Rs. ${Number(data?.price || 0).toFixed(0)}`}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Type</Text>
            <Text style={styles.metaValue}>
              {String(data?.type || 'ticket').toUpperCase()}
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Limit</Text>
            <Text style={styles.metaValue}>{data?.max || 0}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Access</Text>
            <Text style={styles.metaValue}>
              {isComplimentary ? 'Free' : 'Paid'}
            </Text>
          </View>
        </View>
         </View>
      </LinearGradient>

      <View style={styles.body}>
        {isComplimentary ? (
          <Text style={[styles.note, { color: colors.success }]}>
            Complimentary eligibility is already applied in the total.
          </Text>
        ) : null}
        {data?.max ? (
          <Text style={[styles.note, { color: colors.warning }]}>
            Maximum {data.max} allowed for this pass type.
          </Text>
        ) : null}

        <View style={styles.divider} />

        <QuantityCounter
          value={quantity}
          max={data?.max}
          disabled={soldOut}
          onChange={onChange}
        />
      </View>
    </View>
  );
};

const createStyles = (colors: {
  background: string;
  border: string;
  onPrimary: string;
  primary: string;
  secondary: string;
  surface: string;
  text: string;
  textMuted: string;
  warning: string;
  success: string;
}) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginTop: 14,
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
    },
    hero: {
      // padding: 18,
    },
    heroHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    title: {
      color: colors.onPrimary,
      fontSize: 18,
      fontFamily: FONT_FAMILY.bold,
    },
    description: {
      marginTop: 6,
      color: `${colors.onPrimary}DE`,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: FONT_FAMILY.normal,
    },
    priceBadge: {
      backgroundColor: 'rgba(255,255,255,0.16)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
    },
    priceText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontFamily: FONT_FAMILY.semiBold,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    metaChip: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 16,
      padding: 10,
    },
    metaLabel: {
      color: `${colors.onPrimary}B8`,
      fontSize: 11,
      fontFamily: FONT_FAMILY.normal,
      textTransform: 'uppercase',
    },
    metaValue: {
      color: colors.onPrimary,
      marginTop: 4,
      fontSize: 13,
      fontFamily: FONT_FAMILY.semiBold,
    },
    body: {
      padding: 16,
    },
    note: {
      fontSize: 12,
      lineHeight: 17,
      fontFamily: FONT_FAMILY.normal,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 14,
    },
  });

export default TicketCard;
