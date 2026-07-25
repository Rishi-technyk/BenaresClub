import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { FONT_FAMILY } from '../util/colors';
import UniversalModal from './UniversalModal';
import NewButton from './Button';
import { useAppTheme } from '../theme/AppThemeProvider';

interface Props {
  onApply: (prompt: string) => void;
  loading?: boolean;
  title?: string;
  placeholder?: string;
}

const AIFilterButton: React.FC<Props> = ({
  onApply,
  loading = false,
  title = 'Ask AI',
  placeholder = 'Ask for insights, anomalies, trends or recommended filters...',
}) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [visible, setVisible] = useState(false);
  const [prompt, setPrompt] = useState('');
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
    scale.value = withRepeat(withTiming(1.04, { duration: 1200 }), -1, true);
  }, [glow, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: interpolate(glow.value, [0, 1], [0, 0.35]),
    shadowRadius: interpolate(glow.value, [0, 1], [0, 16]),
    shadowColor: colors.secondary,
  }));

  const handleApply = () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      return;
    }

    onApply(trimmed);
    setVisible(false);
  };

  return (
    <>
      <Animated.View style={[animatedStyle]}>
        <TouchableOpacity
          onPress={() => setVisible(true)}
          activeOpacity={0.85}
          style={styles.trigger}
        >
          <Icon name="robot-outline" size={18} color={colors.text} />
          <Text style={styles.triggerText}>{title}</Text>
        </TouchableOpacity>
      </Animated.View>

      <UniversalModal
        setVisible={setVisible}
        visible={visible}
        isFull={true}
        title={title}
      >
        <Text style={styles.helpText}>
          Ask for spending patterns, suspicious spikes, payment suggestions, or the best filters to apply.
        </Text>
        <TextInput
          style={styles.input}
          value={prompt}
          onChangeText={setPrompt}
          multiline
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
        />
        <View style={{ marginTop: 8 }}>
          <NewButton text={loading ? 'Analysing...' : 'Apply'} loading={loading} onPress={handleApply} />
        </View>
      </UniversalModal>
    </>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    trigger: {
      backgroundColor: colors.surface,
      borderColor: colors.secondary,
      borderWidth: 1,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    triggerText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 13,
    },
    helpText: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 13,
      marginBottom: 12,
      lineHeight: 18,
    },
    input: {
      minHeight: 140,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      color: colors.text,
      fontFamily: FONT_FAMILY.normal,
      textAlignVertical: 'top',
      backgroundColor: colors.surface,
    },
  });

export default AIFilterButton;
