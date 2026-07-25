import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { FONT_FAMILY } from '../../util/colors';

export type AppAlertTone = 'success' | 'warning' | 'danger' | 'info';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  tone?: AppAlertTone;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  onDismiss: () => void;
};

const toneConfig = {
  success: {
    icon: 'check-decagram',
    getColor: (colors: any) => colors.success,
  },
  warning: {
    icon: 'alert-decagram',
    getColor: (colors: any) => colors.warning,
  },
  danger: {
    icon: 'close-octagon',
    getColor: (colors: any) => colors.danger,
  },
  info: {
    icon: 'information',
    getColor: (colors: any) => colors.border,
  },
};

const AppAlertModal: React.FC<Props> = ({
  visible,
  title,
  message,
  tone = 'info',
  primaryLabel = 'Okay',
  secondaryLabel,
  onPrimaryPress,
  onSecondaryPress,
  onDismiss,
}) => {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const config = toneConfig[tone];
  const accent = config.getColor(colors);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={event => event.stopPropagation()}
        >
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: `${accent}18`,
                borderColor: `${accent}30`,
              },
            ]}
          >
            <Icon name={config.icon} size={28} color={accent} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>

          <View style={styles.actionRow}>
            {secondaryLabel ? (
              <Pressable
                onPress={onSecondaryPress || onDismiss}
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.secondaryLabel, { color: colors.text }]}>
                  {secondaryLabel}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={onPrimaryPress || onDismiss}
              style={[
                styles.primaryButton,
                { backgroundColor: accent },
              ]}
            >
              <Text style={[styles.primaryLabel, { color: colors.onPrimary }]}>
                {primaryLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      borderWidth: 1,
      borderRadius: 28,
      padding: 22,
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    iconWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      alignSelf: 'center',
    },
    title: {
      fontSize: 20,
      lineHeight: 24,
      textAlign: 'center',
      fontFamily: FONT_FAMILY.bold,
      marginBottom: 10,
    },
    message: {
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      fontFamily: FONT_FAMILY.regular,
      marginBottom: 20,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    primaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    primaryLabel: {
      fontSize: 14,
      fontFamily: FONT_FAMILY.semiBold,
    },
    secondaryLabel: {
      fontSize: 14,
      fontFamily: FONT_FAMILY.medium,
    },
  });

export default AppAlertModal;
