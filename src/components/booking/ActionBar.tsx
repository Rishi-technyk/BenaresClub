import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../theme/AppThemeProvider';

type Action = {
  label: string;
  icon: string;
  onPress: () => void;
};

type Props = {
  actions: Action[];
};

const ActionBar: React.FC<Props> = ({ actions }) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      {actions.map((action, index) => (
        <TouchableOpacity
          key={`${action.label}-${index}`}
          onPress={action.onPress}
          style={[
            styles.button,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Icon name={action.icon} size={18} color={colors.text} />
          <Text style={[styles.label, { color: colors.text }]}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent:'space-between',
    alignItems:'center',
    marginHorizontal: 16,
    marginBottom: 14,
  },
  button: {
    minWidth: '42%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginRight: '4%',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default ActionBar;
