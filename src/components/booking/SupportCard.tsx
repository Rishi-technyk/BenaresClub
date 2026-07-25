import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../theme/AppThemeProvider';

type Props = {
  title?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  note?: string;
};

const SupportCard: React.FC<Props> = ({
  title = 'Need help?',
  contactName,
  phone,
  email,
  note,
}) => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {contactName ? <Text style={[styles.note, { color: colors.textMuted }]}>{contactName}</Text> : null}
      {note ? <Text style={[styles.note, { color: colors.textMuted }]}>{note}</Text> : null}

      {phone ? (
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(`tel:${phone}`)}>
          <Icon name="phone-outline" size={18} color={colors.primary} />
          <Text style={[styles.link, { color: colors.primary }]}>{phone}</Text>
        </TouchableOpacity>
      ) : null}

      {email ? (
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(`mailto:${email}`)}>
          <Icon name="email-outline" size={18} color={colors.primary} />
          <Text style={[styles.link, { color: colors.primary }]}>{email}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  note: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  link: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default SupportCard;
