
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import LinearGradient from 'react-native-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import Header from '../../components/Header';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import DetailSection from '../../components/booking/DetailSection';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { useAppAlert } from '../../hooks/useAppAlert';
import { useAppTheme } from '../../theme/AppThemeProvider';
import * as api from '../../util/api';
import { DOMAIN, ENDPOINT } from '../../util/constant';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { FONT_FAMILY } from '../../util/colors';
import { RootState } from '../../store/store';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
type Props = NativeStackScreenProps<AppStackParamList, 'AllActivities'>;

const imageBaseUrl = DOMAIN.IMG ;


const AllActivities: React.FC<Props> = ({ navigation }) => {
  const userData = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const [currentIndex, setCurrentIndex] = useState(0);
  const sliderWidth = Dimensions.get('window').width;

  const facilitiesQuery = useQuery({
    queryKey: ['facilities'],
    enabled: !!userData?.token,
    staleTime: 1000 * 60 * 10,
    retry: 1,
    queryFn: async () => {
      const response = await api.javascriptGet({
        path: ENDPOINT.get_facility,
        body: {},
        Token: userData?.token,
      });
      return response;
    },
  });

  const facilities = useMemo(() => {
   
    return facilitiesQuery?.data?.data || [];
  }, [facilitiesQuery?.data?.data]);

  const featured = facilitiesQuery?.data?.banners||[];
  
  console.log( facilities, '---------------------- item ---------------------');
  const availableCount = facilities.filter((item: any) => item?.status == 1).length;

  const handleFacility = (item: any) => {
    if (item?.status == 1) {
      (navigation as any).navigate('Activity', { facility: item });
      return;
    }

    showAlert({
      title: 'Slots unavailable',
      message: `No slots are available for ${item?.name || 'this activity'} right now.`,
      tone: 'warning',
    });
  };

  const renderBannerPlaceholder = () => (
    <View style={styles.heroPlaceholderWrap}>
      <ShimmerPlaceholder
        shimmerStyle={styles.heroPlaceholder}
        width={sliderWidth - 32}
        height={220}
      />
    </View>
  );


  const renderFacility = ({ item }: { item: any }) => {
    return(
    <Pressable
      onPress={() => handleFacility(item)}
      style={[
        styles.facilityCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Image
        source={{
          uri: `${imageBaseUrl}${item?.icon || item?.first_image || ''}`,
        }}
        style={styles.facilityImage}
      />
      <Text style={[styles.facilityTitle, { color: colors.text }]} numberOfLines={2}>
        {item?.activity_name || item?.name || 'Activity'}
      </Text>
      <Text style={[styles.facilityMeta, { color: colors.textMuted }]} numberOfLines={2}>
        {item?.description || 'Activity access and slot-based booking'}
      </Text>
  
    </Pressable>
  )};

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="All Activities">
      
      </Header>

      <FlatList
        data={facilities}
        keyExtractor={(item, index) => String(item?.id || index)}
        numColumns={2}
        renderItem={renderFacility}
        columnWrapperStyle={facilities.length ? styles.columnWrap : undefined}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <BookingHeroCard
              eyebrow="Activity Discovery"
              title="Book sports and facility slots"
              // subtitle="Browse active facilities, check slot availability, and continue into the upgraded booking flow."
              status={facilities.length ? 'Available' : 'No activities'}
              statusTone={facilities.length ? 'success' : 'warning'}
              meta={[
                // { label: 'Active', value: String(facilities.length) },
                // { label: 'Open now', value: String(availableCount), tone: 'success' },
                // { label: 'Players', value: 'Manage anytime' },
              ]}
            />

            <DetailSection
              title="Featured Activities"
              // subtitle="Use the featured cards to jump directly into popular activities."
              delay={40}
            >
              {facilitiesQuery.isLoading ? (
                renderBannerPlaceholder()
              ) : featured.length ? (
                <>
                  <Carousel
                    width={sliderWidth - 70}
                    height={210}
                    data={featured}
                    autoPlay={navigation.isFocused()}
                    autoPlayInterval={3200}
                    loop={featured.length > 1}
                    onSnapToItem={index => setCurrentIndex(index)}
                    renderItem={({ item }) => (
                      <Pressable
                        onPress={() => handleFacility(item)}
                        style={styles.bannerCard}
                      >
                        <Image
                          source={{
                            uri: `${imageBaseUrl}${item?.banner_image || item?.third_image || ''}`,
                          }}

                          style={[styles.bannerImage,{resizeMode:'stretch'}]}
                        />
                        
                          <View     style={styles.bannerOverlay}>
                          <View style={styles.bannerCopy}>
                            <Text style={styles.bannerTitle}>{item?.name}</Text>
                            <Text style={styles.bannerDescription} numberOfLines={2}>
                              {item?.description || 'Tap to explore available slots.'}
                            </Text>
                          </View>
                          <View style={styles.bannerAction}>
                            <Text style={styles.bannerActionText}>{item.status}</Text>
                          </View>
                          </View>
                      </Pressable>
                    )}
                  />
                  <View style={styles.paginationRow}>
                    {featured.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.paginationDot,
                          {
                            backgroundColor:
                              currentIndex === index ? colors.secondary : colors.border,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </>
              ) : (
                <EmptyStateCard
                  title="No featured activity yet"
                  description="New activities will appear here once the backend marks them active."
                />
              )}
            </DetailSection>

            {/* <DetailSection
              title="Activity Grid"
              subtitle="Select a facility to check dates, sessions, and live slot inventory."
              delay={70}
            >
              {facilitiesQuery.isLoading ? renderGridPlaceholder() : null}
            </DetailSection> */}
          </View>
        }
        ListEmptyComponent={
          facilitiesQuery.isLoading ? null : (
            <EmptyStateCard
              title="No active activities"
              description="There are no active activity modules available right now."
            />
          )
        }
      />

      <AppAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        tone={alertState.tone}
        primaryLabel={alertState.primaryLabel}
        secondaryLabel={alertState.secondaryLabel}
        onDismiss={hideAlert}
        onPrimaryPress={() => {
          hideAlert();
          alertState.onPrimaryPress?.();
        }}
        onSecondaryPress={() => {
          hideAlert();
          alertState.onSecondaryPress?.();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  listContent: {
    paddingBottom: 24,
  },
  heroPlaceholderWrap: {
    alignItems: 'center',
  },
  heroPlaceholder: {
    borderRadius: 28,
  },
  bannerCard: {
    borderRadius: 26,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
      flex:1,
      padding:18
  },
  bannerCopy: {
    marginTop: 'auto',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: FONT_FAMILY.bold,
  },
  bannerDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.normal,
    marginTop: 8,
  },
  bannerAction: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bannerActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginHorizontal: 4,
  },
  columnWrap: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  facilityCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
  },
  facilityImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignSelf: 'center',
    marginBottom: 14,
  },
  facilityTitle: {
    fontSize: 15,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.semiBold,
  },
  facilityMeta: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.normal,
    marginTop: 8,
    minHeight: 36,
  },
  facilityBadge: {
    marginTop: 12,
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  facilityBadgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    textTransform: 'uppercase',
  },
  gridPlaceholderWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridPlaceholderCard: {
    width: '48%',
    alignItems: 'center',
    borderRadius: 22,
    paddingVertical: 16,
    marginBottom: 12,
  },
  gridPlaceholderImage: {
    borderRadius: 18,
    marginBottom: 14,
  },
  gridPlaceholderText: {
    borderRadius: 8,
    marginBottom: 8,
  },
});

export default AllActivities;


// import React, { useMemo, useState } from 'react';
// import {
//   Dimensions,
//   FlatList,
//   Image,
//   Pressable,
//   StyleSheet,
//   Text,
//   View,
// } from 'react-native';
// import Carousel from 'react-native-reanimated-carousel';
// import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
// import LinearGradient from 'react-native-linear-gradient';
// import { useQuery } from '@tanstack/react-query';
// import { useSelector } from 'react-redux';
// import { NativeStackScreenProps } from '@react-navigation/native-stack';

// import Header from '../../components/Header';
// import BookingHeroCard from '../../components/booking/BookingHeroCard';
// import DetailSection from '../../components/booking/DetailSection';
// import EmptyStateCard from '../../components/booking/EmptyStateCard';
// import AppAlertModal from '../../components/feedback/AppAlertModal';
// import { useAppAlert } from '../../hooks/useAppAlert';
// import { useAppTheme } from '../../theme/AppThemeProvider';
// import * as api from '../../util/api';
// import { DOMAIN, ENDPOINT } from '../../util/constant';
// import { AppStackParamList } from '../../navigation/AppDrawer';
// import { FONT_FAMILY } from '../../util/colors';
// import { RootState } from '../../store/store';

// const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
// type Props = NativeStackScreenProps<AppStackParamList, 'AllActivities'>;

// // const imageBaseUrl = 'https://dynamixclubedepalma.co.in/clubdepalma';
// const imageBaseUrl = DOMAIN.IMG ;


// const AllActivities: React.FC<Props> = ({ navigation }) => {
//   const userData = useSelector((state: RootState) => state.auth);
//   const { colors } = useAppTheme();
//   const { alertState, showAlert, hideAlert } = useAppAlert();
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const sliderWidth = Dimensions.get('window').width;

//   const facilitiesQuery = useQuery({
//     queryKey: ['facilities'],
//     enabled: !!userData?.token,
//     staleTime: 1000 * 60 * 10,
//     retry: 1,
//     queryFn: async () => {
//       const response = await api.javascriptGet({
//         path: ENDPOINT.get_facility,
//         body: {},
//         Token: userData?.token,
//       });
//       return response;
//     },
//   });

//   const facilities = useMemo(() => {
//     const source = facilitiesQuery?.data?.data || [];
//     return Array.isArray(source)
//       ? source.filter((item: any) => item?.status === 'Active')
//       : [];
//   }, [facilitiesQuery?.data?.data]);

//   const featured = facilities.slice(0, Math.max(facilities.length, 1));
//   const availableCount = facilities.filter((item: any) => item?.is_available_slots).length;

//   const handleFacility = (item: any) => {
//     if (item?.is_available_slots) {
//       (navigation as any).navigate('Activity', { facility: item });
//       return;
//     }

//     showAlert({
//       title: 'Slots unavailable',
//       message: `No slots are available for ${item?.name || 'this activity'} right now.`,
//       tone: 'warning',
//     });
//   };

//   const renderBannerPlaceholder = () => (
//     <View style={styles.heroPlaceholderWrap}>
//       <ShimmerPlaceholder
//         shimmerStyle={styles.heroPlaceholder}
//         width={sliderWidth - 32}
//         height={220}
//       />
//     </View>
//   );

//   const renderGridPlaceholder = () => (
//     <View style={styles.gridPlaceholderWrap}>
//       {[1, 2, 3, 4, 5, 6].map(item => (
//         <View key={item} style={styles.gridPlaceholderCard}>
//           <ShimmerPlaceholder width={72} height={72} shimmerStyle={styles.gridPlaceholderImage} />
//           <ShimmerPlaceholder width={90} height={16} shimmerStyle={styles.gridPlaceholderText} />
//           <ShimmerPlaceholder width={70} height={14} shimmerStyle={styles.gridPlaceholderText} />
//         </View>
//       ))}
//     </View>
//   );

//   const renderFacility = ({ item }: { item: any }) => {
//     return(
//     <Pressable
//       onPress={() => handleFacility(item)}
//       style={[
//         styles.facilityCard,
//         {
//           backgroundColor: colors.surface,
//           borderColor: colors.border,
//         },
//       ]}
//     >
//       <Image
//         source={{
//           uri: `${imageBaseUrl}${item?.third_image || item?.first_image || ''}`,
//         }}
//         style={styles.facilityImage}
//       />
//       <Text style={[styles.facilityTitle, { color: colors.text }]} numberOfLines={2}>
//         {item?.name}
//       </Text>
//       <Text style={[styles.facilityMeta, { color: colors.textMuted }]} numberOfLines={2}>
//         {item?.short_description || 'Activity access and slot-based booking'}
//       </Text>
//       <View
//         style={[
//           styles.facilityBadge,
//           {
//             backgroundColor: item?.is_available_slots ? `${colors.success}18` : `${colors.warning}18`,
//           },
//         ]}
//       >
//         <Text
//           style={[
//             styles.facilityBadgeText,
//             { color: item?.is_available_slots ? colors.success : colors.warning },
//           ]}
//         >
//           {item?.is_available_slots ? 'Open now' : 'Slots closed'}
//         </Text>
//       </View>
//     </Pressable>
//   )};

//   return (
//     <View style={[styles.container, { backgroundColor: colors.background }]}>
//       <Header title="All Activities">
//         <Pressable
//           style={[styles.headerAction, { borderColor: `${colors.onPrimary}35` }]}
//           onPress={() => navigation.navigate('Players')}
//         >
//           <Text style={[styles.headerActionLabel, { color: colors.onPrimary }]}>
//             My Player
//           </Text>
//         </Pressable>
//       </Header>

//       <FlatList
//         data={facilities}
//         keyExtractor={(item, index) => String(item?.id || index)}
//         numColumns={2}
//         renderItem={renderFacility}
//         columnWrapperStyle={facilities.length ? styles.columnWrap : undefined}
//         contentContainerStyle={styles.listContent}
//         ListHeaderComponent={
//           <View>
//             <BookingHeroCard
//               eyebrow="Activity Discovery"
//               title="Book sports and facility slots"
//               subtitle="Browse active facilities, check slot availability, and continue into the upgraded booking flow."
//               status={facilities.length ? 'Available' : 'No activities'}
//               statusTone={facilities.length ? 'success' : 'warning'}
//               meta={[
//                 { label: 'Active', value: String(facilities.length) },
//                 { label: 'Open now', value: String(availableCount), tone: 'success' },
//                 { label: 'Players', value: 'Manage anytime' },
//               ]}
//             />

//             <DetailSection
//               title="Featured Activities"
//               subtitle="Use the featured cards to jump directly into popular activities."
//               delay={40}
//             >
//               {facilitiesQuery.isLoading ? (
//                 renderBannerPlaceholder()
//               ) : featured.length ? (
//                 <>
//                   <Carousel
//                     width={sliderWidth - 70}
//                     height={210}
//                     data={featured}
//                     autoPlay={navigation.isFocused()}
//                     autoPlayInterval={3200}
//                     loop={featured.length > 1}
//                     onSnapToItem={index => setCurrentIndex(index)}
//                     renderItem={({ item }) => (
//                       <Pressable
//                         onPress={() => handleFacility(item)}
//                         style={styles.bannerCard}
//                       >
//                         <Image
//                           source={{
//                             uri: `${imageBaseUrl}${item?.first_image || item?.third_image || ''}`,
//                           }}
//                           style={styles.bannerImage}
//                         />
                        
//                           <View     style={styles.bannerOverlay}>
//                           <View style={styles.bannerCopy}>
//                             <Text style={styles.bannerTitle}>{item?.name}</Text>
//                             <Text style={styles.bannerDescription} numberOfLines={2}>
//                               {item?.short_description || 'Tap to explore available slots.'}
//                             </Text>
//                           </View>
//                           <View style={styles.bannerAction}>
//                             <Text style={styles.bannerActionText}>Book now</Text>
//                           </View>
//                           </View>
//                       </Pressable>
//                     )}
//                   />
//                   <View style={styles.paginationRow}>
//                     {featured.map((_, index) => (
//                       <View
//                         key={index}
//                         style={[
//                           styles.paginationDot,
//                           {
//                             backgroundColor:
//                               currentIndex === index ? colors.secondary : colors.border,
//                           },
//                         ]}
//                       />
//                     ))}
//                   </View>
//                 </>
//               ) : (
//                 <EmptyStateCard
//                   title="No featured activity yet"
//                   description="New activities will appear here once the backend marks them active."
//                 />
//               )}
//             </DetailSection>

//             <DetailSection
//               title="Activity Grid"
//               subtitle="Select a facility to check dates, sessions, and live slot inventory."
//               delay={70}
//             >
//               {facilitiesQuery.isLoading ? renderGridPlaceholder() : null}
//             </DetailSection>
//           </View>
//         }
//         ListEmptyComponent={
//           facilitiesQuery.isLoading ? null : (
//             <EmptyStateCard
//               title="No active activities"
//               description="There are no active activity modules available right now."
//             />
//           )
//         }
//       />

//       <AppAlertModal
//         visible={alertState.visible}
//         title={alertState.title}
//         message={alertState.message}
//         tone={alertState.tone}
//         primaryLabel={alertState.primaryLabel}
//         secondaryLabel={alertState.secondaryLabel}
//         onDismiss={hideAlert}
//         onPrimaryPress={() => {
//           hideAlert();
//           alertState.onPrimaryPress?.();
//         }}
//         onSecondaryPress={() => {
//           hideAlert();
//           alertState.onSecondaryPress?.();
//         }}
//       />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   headerAction: {
//     borderWidth: 1,
//     borderRadius: 10,
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//   },
//   headerActionLabel: {
//     fontSize: 12,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   listContent: {
//     paddingBottom: 24,
//   },
//   heroPlaceholderWrap: {
//     alignItems: 'center',
//   },
//   heroPlaceholder: {
//     borderRadius: 28,
//   },
//   bannerCard: {
//     borderRadius: 26,
//     overflow: 'hidden',
//   },
//   bannerImage: {
//     width: '100%',
//     height: '100%',
//   },
//   bannerOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     justifyContent: 'space-between',
//       flex:1,
//       padding:18
//   },
//   bannerCopy: {
//     marginTop: 'auto',
//   },
//   bannerTitle: {
//     color: '#FFFFFF',
//     fontSize: 22,
//     fontFamily: FONT_FAMILY.bold,
//   },
//   bannerDescription: {
//     color: 'rgba(255,255,255,0.9)',
//     fontSize: 13,
//     lineHeight: 19,
//     fontFamily: FONT_FAMILY.normal,
//     marginTop: 8,
//   },
//   bannerAction: {
//     alignSelf: 'flex-end',
//     backgroundColor: 'rgba(255,255,255,0.16)',
//     paddingHorizontal: 14,
//     paddingVertical: 10,
//     borderRadius: 16,
//   },
//   bannerActionText: {
//     color: '#FFFFFF',
//     fontSize: 13,
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   paginationRow: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     marginTop: 14,
//   },
//   paginationDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 999,
//     marginHorizontal: 4,
//   },
//   columnWrap: {
//     paddingHorizontal: 16,
//     justifyContent: 'space-between',
//   },
//   facilityCard: {
//     width: '48%',
//     borderWidth: 1,
//     borderRadius: 22,
//     padding: 14,
//     marginBottom: 12,
//   },
//   facilityImage: {
//     width: 72,
//     height: 72,
//     borderRadius: 18,
//     alignSelf: 'center',
//     marginBottom: 14,
//   },
//   facilityTitle: {
//     fontSize: 15,
//     textAlign: 'center',
//     fontFamily: FONT_FAMILY.semiBold,
//   },
//   facilityMeta: {
//     fontSize: 12,
//     lineHeight: 18,
//     textAlign: 'center',
//     fontFamily: FONT_FAMILY.normal,
//     marginTop: 8,
//     minHeight: 36,
//   },
//   facilityBadge: {
//     marginTop: 12,
//     alignSelf: 'center',
//     borderRadius: 999,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//   },
//   facilityBadgeText: {
//     fontSize: 11,
//     fontFamily: FONT_FAMILY.semiBold,
//     textTransform: 'uppercase',
//   },
//   gridPlaceholderWrap: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//   },
//   gridPlaceholderCard: {
//     width: '48%',
//     alignItems: 'center',
//     borderRadius: 22,
//     paddingVertical: 16,
//     marginBottom: 12,
//   },
//   gridPlaceholderImage: {
//     borderRadius: 18,
//     marginBottom: 14,
//   },
//   gridPlaceholderText: {
//     borderRadius: 8,
//     marginBottom: 8,
//   },
// });

// export default AllActivities;
