import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { javascriptGet } from '../../util/api';
import { FONT_FAMILY } from '../../util/colors';
import { FlatList } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../components/Header';
import { DOMAIN, ENDPOINT } from '../../util/constant';
import moment from 'moment';
import { useQuery } from '@tanstack/react-query';
import LinearGradient from 'react-native-linear-gradient';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import { useAppTheme } from '../../theme/AppThemeProvider';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
type Props = NativeStackScreenProps<AppStackParamList, 'EventsList'>;
const EventsList: React.FC<Props> = ({ navigation }) => {
  const userData = useSelector((state: RootState) => state.auth);

const {colors}=useAppTheme();
const styles = createStyles(colors);
 const { data: events, isLoading } = useQuery({
  queryKey: ["events"],
  queryFn: async () => {
    const response = await javascriptGet({
      path: "member/get/events",
      Token: userData?.token,
    });
    return response.data;
  },
  staleTime: 1000 * 60 * 10, // 10 minutes
});
  const emptyList = () => (
    <FlatList
      data={[1, 1, 1, 1, 1, ]}
      renderItem={() => (
        <View
          style={[styles.card, { marginHorizontal: 10, borderRadius: 20 }]}>
          <View style={{ flex: 1, alignItems: "center", flexDirection: "row" }}>
            <ShimmerPlaceholder style={{height:100,width:100,borderRadius:10}}  />
            <View style={{ flex: 1, alignItems: "flex-start", marginLeft: 10 }}>
              <ShimmerPlaceholder style={{ margin: 5 }} />
              <ShimmerPlaceholder style={{ margin: 5 }} />
              <ShimmerPlaceholder style={{ margin: 5 }} />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-around",
                }}>
                <ShimmerPlaceholder width={70} style={{ margin: 5 }} />
                <ShimmerPlaceholder width={70} style={{ margin: 5 }} />
              </View>
            </View>
          </View>
        </View>
      )}
    />
  );
  const renderEvents = ({ item }) => {
    return (
      <Pressable
      onPress={()=>navigation.navigate('Event',{data:item.id})}
       style={[styles.card]}>
        <View style={styles.row}>
          <Image
            source={{ uri: item.image }}
            height={100}
            width={100}
            borderRadius={10}
          />
          <View style={{ marginLeft: 10 }}>
            <View style={styles.rowstart}>
              <Text style={styles.price} numberOfLines={2}>{item.name}</Text>
            </View>
            <View style={[styles.rowstart, { marginTop: 5 }]}>
              <Icon
                name="location-pin"
                size={20}
                color={colors.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.title}>{item.location}</Text>
              {/* <Text style={styles.desc}>{item.location}</Text> */}
            </View>
            <View style={styles.rowstart}>
              <Icon
                name="date-range"
                size={20}
                color={colors.textMuted}
                style={{ marginRight: 5 }}
              />

              <Text style={styles.meta}>
                {moment(item.start_date).format('DD, MMM yy [at] h:m A')}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };
  return (
    <View style={{flex:1}}>
      <Header title="Events" />
      <FlatList data={events|| []}
     ListEmptyComponent={isLoading ?emptyList(): 
<View
            style={{
              marginTop: 50,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              source={require('../../../assets/images/norecord.png')}
              style={{ height: 100, width: 100 }}
            />
            <Text style={styles.empty}>No Events available.</Text>
          </View>
     }
       renderItem={renderEvents} />
    </View>
  );
};



export default EventsList;

const createStyles = (color) => StyleSheet.create({
  card: {
    backgroundColor:color.surface,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  rowstart: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* 🔹 Disabled / Sold Out */
  disabled: {
    opacity: 0.5,
  },

  /* 🔹 Top Row */
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  /* 🔹 Title */
  title: {
    fontSize: 16,
    color: color.text,
    fontFamily: FONT_FAMILY.normal,
  },
empty:{
    marginTop: 20,
    fontSize: 16,
    color: color.textMuted,
    fontFamily: FONT_FAMILY.normal,
},
  /* 🔹 Description */
  desc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    maxWidth: 220,
    fontFamily: FONT_FAMILY.normal,
  },

  /* 🔹 Max Text */
  max: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#f97316', // orange highlight
    fontFamily: FONT_FAMILY.semiBold,
  },

  /* 🔹 Price */
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#135bec',
    fontFamily: FONT_FAMILY.semiBold,
  },

  meta:{
    fontSize: 12,
    color: color.textMuted,
    fontFamily: FONT_FAMILY.normal,
  },
  /* 🔹 Divider */
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 14,
  },
});
