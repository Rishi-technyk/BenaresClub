import { Pressable, Text, View } from 'react-native';
import React from 'react';
import UniversalModal from './UniversalModal';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { FONT_FAMILY } from '../util/colors';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../theme/AppThemeProvider';

interface MemberOrderTypeModalProps {
  showTypes: boolean;
  setShowType: (value: boolean) => void;
}

const MemberOrderTypeModal: React.FC<MemberOrderTypeModalProps> = ({ showTypes, setShowType }) => {
  const navigation = useNavigation();
  const { colors } = useAppTheme();

  const handleOrderTypeSelection = (type: { key: 'take_away' | 'home_delivery'|'order_history' }) => {
    setShowType(false);
    if(type.key==='order_history'){
       navigation.navigate('MemberOrders');
    }else{

      navigation.navigate('FoodMenu', { orderType: type.key });
    }
  };

  const types = [
    {
      id: 101,
      name: 'Take Away',
      key: 'take_away' as const,
      subtitle: 'Show the complete pickup menu.',
    },
    {
      id: 102,
      name: 'Home Delivery',
      key: 'home_delivery' as const,
      subtitle: 'Show only dishes available for your member location.',
    },
    {
      id: 103,
      name: 'Order History',
      key: 'order_history' as const,
      subtitle: 'Your recent orders.',
    },
  ];

  return (
    <UniversalModal visible={showTypes} setVisible={setShowType} title="Select an Order type">
      <View style={{ gap: 12 }}>
        {types.map(type => (
          <Pressable
            key={type.id}
            onPress={() => handleOrderTypeSelection(type)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: 18,
              padding: 16,
              gap: 12,
            }}
          >
            <Icon name="fastfood" size={20} color={colors.text} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontFamily: FONT_FAMILY.bold, color: colors.text }}>{type.name}</Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  fontFamily: FONT_FAMILY.medium,
                  color: colors.textMuted,
                }}
              >
                {type.subtitle}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </UniversalModal>
  );
};

export default MemberOrderTypeModal;
