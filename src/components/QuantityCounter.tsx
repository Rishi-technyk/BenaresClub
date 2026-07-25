import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Entypo';

import { FONT_FAMILY } from '../util/colors';
import { useAppTheme } from '../theme/AppThemeProvider';

type Props = {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  disabled?: boolean;
};

const QuantityCounter: React.FC<Props> = ({
  value,
  onChange,
  max,
  disabled = false,
}) => {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const canDecrease = value > 0 && !disabled;
  const canIncrease = !disabled && !(max && value >= max);

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.label}>Quantity</Text>
        <Text style={styles.helper}>
          {max ? `Up to ${max} allowed` : 'Adjust tickets as needed'}
        </Text>
      </View>

      <View style={styles.counter}>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!canDecrease}
          onPress={() => onChange(value - 1)}
          style={[
            styles.iconButton,
            !canDecrease && styles.iconButtonDisabled,
          ]}
        >
          <Icon
            name="minus"
            size={20}
            color={canDecrease ? colors.text : colors.text}
          />
        </TouchableOpacity>

        <Text style={styles.value}>{value}</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!canIncrease}
          onPress={() => onChange(value + 1)}
          style={[
            styles.iconButton,
            !canIncrease && styles.iconButtonDisabled,
          ]}
        >
          <Icon
            name="plus"
            size={20}
            color={canIncrease ? colors.text : colors.text}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: {
  background: string;
  border: string;
  primary: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
}) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    label: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 15,
    },
    helper: {
      marginTop: 2,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 12,
    },
    counter: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 18,
      padding: 4,
      backgroundColor: colors.surfaceAlt,
    },
    iconButton: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonDisabled: {
      opacity: 0.2,
    },
    value: {
      minWidth: 42,
      textAlign: 'center',
      color: colors.text,
      fontSize: 18,
      fontFamily: FONT_FAMILY.bold,
    },
  });

export default QuantityCounter;
