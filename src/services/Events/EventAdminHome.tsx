import {
  Alert,
  Image,
  StyleSheet,
  Text,
  View,
  Pressable,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import Icon from 'react-native-vector-icons/AntDesign';
import IconM from 'react-native-vector-icons/MaterialIcons';
import Icons from 'react-native-vector-icons/Ionicons';
import { ENDPOINT } from '../../util/constant';
import { useDispatch, useSelector } from 'react-redux';
import { FlatList } from 'react-native-gesture-handler';
import { javascriptGet } from '../../util/api';
import { useQuery } from '@tanstack/react-query';
import DatePicker from 'react-native-date-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONT_FAMILY } from '../../util/colors';
import { logout } from '../../store/slices/authSlice';
import { RootState } from '../../store/store';
import { APP_NAME } from '@env';
import { Dropdown } from 'react-native-element-dropdown';
import UniversalModal from '../../components/UniversalModal';
import InAppUpdate from '../../components/InAppUpdate';

// 🔹 API Function — returns summary
const getEventAdminDashboard = async (
  token: string | any,
  id: string | number,
) => {
  const res = await javascriptGet({
    path: ENDPOINT.event_admin_dashboard + `id=${id}`,
    Token: token,
  });
  if (!res?.status) {
    Alert.alert('Failed', res.message || 'unable to fetch summery');
    throw new Error(res.message || 'Failed to fetch data');
  }

  return res.summary;
};
const getAllEvent = async (token: string | any) => {
  const res = await javascriptGet({
    path: ENDPOINT.all_event,
    Token: token,
  });

  if (!res?.status) {
    throw new Error(res.message || 'Failed to fetch event');
  }

  return res.data;
};

const EventAdminHome = ({ navigation }) => {
  const userData = useSelector((state: RootState) => state.auth);
  const token = userData?.token;
  const [open, setOpen] = useState(false);
  const [SelectedEvent, setselectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadVisible, setDownloadVisible] = useState(false);
  const [reportType, setReportType] = useState('day');
  const [reportDate, setReportDate] = useState(new Date());
  const [ticketType, setTicketType] = useState(null);
  const [entryStatus, setEntryStatus] = useState(null);
  const [buffetStatus, setBuffetStatus] = useState(null);
  const dispatch = useDispatch();
  // 🔹 React Query Fetch
  const {
    data: summery,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['event-admin-dashboard', SelectedEvent?.id],
    queryFn: () => getEventAdminDashboard(token, SelectedEvent?.id),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
  const { data: Events } = useQuery({
    queryKey: ['all-event'],
    queryFn: () => getAllEvent(token),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
  if (error) {
    Alert.alert('Error', error.message);
  }
  useEffect(() => {
    if (Events?.length && !SelectedEvent) {
      setselectedEvent(Events[0]); // auto select first event
    }
  }, [Events]);
  const Menues = {
    EventAdmin: [
      {
        id: 1,
        name: 'Ticket Validation',
        img: 'https://club26.org/mobileAPI/icons/qr.png',
        navigate: 'TicketValidation',
      },
      {
        id: 2,
        name: 'Member Tickets',
        img: 'https://club26.org/mobileAPI/icons/ticket.png',
        navigate: 'Event',
      },
      {
        id: 3,
        name: 'My Bookings',
        img: 'https://club26.org/mobileAPI/icons/98786876.png',
        navigate: 'EventBooking',
      },
    ],
  };
  const buildSummaryQuery = () => {
    if (!SelectedEvent?.id) {
      Alert.alert('Select Event', 'Please select an event first');
      return null;
    }

    let query = `?id=${SelectedEvent?.id}`;

    // ✅ Day summary
    if (reportType === 'day') {
      const formatted = reportDate.toISOString().split('T')[0];
      query += `&date=${formatted}`;
    }

    // ✅ Filters
    if (ticketType) query += `&ticket_type=${ticketType}`;
    if (entryStatus !== null) query += `&entry_status=${entryStatus}`;
    if (buffetStatus !== null) query += `&food_status=${buffetStatus}`;

    return query;
  };

  const downloadReport = async () => {
    const query = buildSummaryQuery();
    if (!query) return;
    try {
      setLoading(true);
      console.log(query, '---------------------- query ---------------------');
      const res = await javascriptGet({
        path: `${ENDPOINT.admin_event_summary}${query}`,
        Token: token,
      });
      console.log(res, '---------------------- res ---------------------');
      setLoading(false);

      if (!res?.status) {
        Alert.alert('Error', res.message);
        return;
      }

      navigation.navigate('SummeryPDFViewer', {
        html: res.html,
        date:
          reportType === 'day'
            ? reportDate.toISOString().split('T')[0]
            : 'full',
      });

      setDownloadVisible(false);
    } catch (e) {
      setLoading(false);
      Alert.alert('Error', 'Download failed');
    }
  };
  const renderMenues = ({ item }) => {
    if (
      userData?.user?.role !== 'Event Admin' &&
      (item.id == 2 || item.id == 3)
    ) {
      return null;
    }

    return (
      <Pressable
        onPress={() =>
          navigation.navigate(item.navigate, { data: SelectedEvent?.id })
        }
        style={({ pressed }) => [
          // styles.menuCard,
          { alignItems: 'center', marginBottom: 20, flex: 1 },
          pressed && { transform: [{ scale: 0.96 }], opacity: 0.8 },
        ]}
      >
        <View style={styles.menuIconWrap}>
          <Image source={{ uri: item.img }} style={styles.menuIcon} />
        </View>

        <Text style={styles.menuTitle}>{item.name}</Text>

        {/* <Text style={styles.menuHint}>Tap to open</Text> */}
      </Pressable>
    );
  };

  const handleLogOut = async () => {
    Alert.alert(
      'Logout',
      'Are you sure, you want to logout?',
      [
        {
          text: 'Yes',
          onPress: async () => {
            await AsyncStorage.clear();

            dispatch(logout());
            navigation.reset({
              routes: [{ name: 'LoginScreen' }],
            });
          },
        },
        { text: 'No' },
      ],
      { cancelable: false },
    );
  };
  console.log( summery?.breakup, '---------------------- summery?.breakup ---------------------');
  const ticketTypes =
    Events?.find(ev => ev.id === SelectedEvent?.id)?.ticket_types || [];
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../../../assets/images/Logo.png')}
              style={styles.logo}
            />
            <Text style={styles.headerTitle}>{APP_NAME}</Text>
          </View>

          <Pressable onPress={handleLogOut}>
            <Icons name="exit-outline" size={26} color="#fff" />
          </Pressable>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />
        }
      >
        <View style={styles.selectorCard}>
          <Dropdown
            data={Events || []}
            labelField="name"
            valueField="id"
            placeholder="Choose Event"
            value={SelectedEvent}
            onChange={setselectedEvent}
            style={styles.dropdown}
            placeholderStyle={{ color: '#999' }}
          />
          {!SelectedEvent && (
            <Text style={{ textAlign: 'center', marginTop: 10, color: '#999' }}>
              Please select an event to view dashboard
            </Text>
          )}
          {userData?.user?.role === 'Event Admin' && (
            <View style={styles.summaryCard}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Text style={styles.summaryTitle}>Event Summary</Text>

                <DatePicker
                  modal
                  mode="date"
                  open={open}
                  date={reportDate}
                  maximumDate={new Date()}
                  onConfirm={date => {
                    setOpen(false);
                    setReportDate(date);
                    // fetchSummary(date); // 🔥 Fetch API after picking date
                  }}
                  onCancel={() => {
                    setOpen(false);
                  }}
                />
              </View>
              {isLoading ? (
                <ActivityIndicator size="large" color="#4A6CF7" />
              ) : (
                <View style={styles.topStats}>
                  <View style={styles.statBox}>
                    <View style={styles.statIconCircle}>
                      <Icon name="profile" size={18} color="#4A6CF7" />
                    </View>
                    <Text style={styles.statLabel}>Total Passes</Text>
                    <Text style={styles.statValue}>
                      {summery?.total_tickets || 0}
                    </Text>
                  </View>

                  <View style={styles.statBox}>
                    <Icon name="login" size={22} color="#0537ff" />
                    <Text style={styles.statLabel}>Total Entry</Text>
                    <Text style={styles.statValue}>
                      {summery?.total_entry || 0}
                    </Text>
                  </View>

                  <View style={styles.statBox}>
                    <Icon name="rest" size={22} color="#0537ff" />
                    <Text style={styles.statLabel}>Total Buffet</Text>
                    <Text style={styles.statValue}>
                      {summery?.total_buffet || 0}
                    </Text>
                  </View>
                  {summery?.total_seats && (
                    <View style={styles.statBox}>
                      <IconM name="chair" size={22} color="#0537ff" />
                      <Text style={styles.statLabel}>Total Seats</Text>
                      <Text style={styles.statValue}>
                        {summery?.total_seats || 0}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.breakdownTitle}>Ticket Breakdown</Text>

              <View style={styles.breakdownWrap}>
                {summery?.breakup?.map((item, i) => {
                  const ticket = ticketTypes.find(t => t.id == item.ticket_id);
          
                  return (
                    <View key={i} style={styles.breakdownChip}>
                      <Text style={styles.breakdownChipText}>
                        {ticket?.name?.toUpperCase() || 'UNKNOWN'}: {item.total}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <FlatList
          numColumns={3}
          style={styles.menuCard}
          contentContainerStyle={{ flexGrow: 1 }}
          columnWrapperStyle={{ justifyContent: 'space-around' }}
          data={Menues.EventAdmin}
          renderItem={renderMenues}
        />
        {userData?.user?.role === 'Event Admin' && (
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>Reports & Downloads</Text>
            <Text style={styles.reportSubtitle}>
              Export event reports for records and analysis
            </Text>

            <View style={styles.reportActions}>
              {/* Day Summary */}

              {/* Full Summary */}
              <Pressable
                style={styles.reportButton}
                onPress={() => setDownloadVisible(true)}
              >
                <View style={styles.reportIconWrap}>
                  <Icon name="filetext1" size={22} color="#00A86B" />
                </View>
                <View>
                  <Text style={styles.reportButtonTitle}>Event Summary</Text>
                  <Text style={styles.reportButtonSub}>
                    Download detailed event summary report
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
      <UniversalModal
        visible={downloadVisible}
        setVisible={setDownloadVisible}
        title="Download Summary"
        isFull={true}
      >
        <View style={{ padding: 16 }}>
          {/* REPORT TYPE */}
          <Text style={styles.filterLabel}>Report Type</Text>

          <View style={styles.radioRow}>
            <Pressable
              style={styles.radioItem}
              onPress={() => setReportType('day')}
            >
              <Icon
                name={reportType === 'day' ? 'checkcircle' : 'checkcircleo'}
                size={18}
              />
              <Text> Day Summary</Text>
            </Pressable>

            <Pressable
              style={styles.radioItem}
              onPress={() => setReportType('full')}
            >
              <Icon
                name={reportType === 'full' ? 'checkcircle' : 'checkcircleo'}
                size={18}
              />
              <Text> Full Event</Text>
            </Pressable>
          </View>

          {/* DATE FILTER */}
          {reportType === 'day' && (
            <>
              <Text style={styles.filterLabel}>Select Date</Text>
              <Pressable style={styles.filterBox} onPress={() => setOpen(true)}>
                <Text>{reportDate.toDateString()}</Text>
              </Pressable>
            </>
          )}

          {/* TICKET TYPE */}
          <Text style={styles.filterLabel}>Ticket Type</Text>
          <Dropdown
            data={
              Events?.find(ev => ev.id === SelectedEvent?.id)?.ticket_types ||
              []
            }
            labelField="name"
            valueField="id"
            value={ticketType}
            onChange={item => setTicketType(item.id)}
            style={styles.dropdown}
          />

          {/* ENTRY STATUS */}
          <Text style={styles.filterLabel}>Entry Status</Text>
          <Dropdown
            data={[
              { label: 'All', value: null },
              { label: 'Entered', value: 1 },
              { label: 'Not Entered', value: 0 },
            ]}
            labelField="label"
            valueField="value"
            value={entryStatus}
            onChange={item => setEntryStatus(item.value)}
            style={styles.dropdown}
          />

          {/* BUFFET */}
          <Text style={styles.filterLabel}>Buffet Status</Text>
          <Dropdown
            data={[
              { label: 'All', value: null },
              { label: 'Taken', value: 1 },
              { label: 'Not Taken', value: 0 },
            ]}
            labelField="label"
            valueField="value"
            value={buffetStatus}
            onChange={item => setBuffetStatus(item.value)}
            style={styles.dropdown}
          />

          {/* ACTION BUTTONS */}
          <View style={styles.modalActions}>
            <Pressable style={styles.previewBtn} onPress={downloadReport}>
              {loading && <ActivityIndicator color="#4A6CF7" />}
              <Text style={{ color: '#4A6CF7' }}>Preview</Text>
            </Pressable>
          </View>
        </View>
      </UniversalModal>
        <InAppUpdate />
    </View>
  );
};

export default EventAdminHome;

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#151831',
  },

  headerTitle: {
    color: 'white',
    fontSize: 25,
    marginLeft: 5,
    fontFamily: FONT_FAMILY.semiBold,
  },

  summaryCard: {
    margin: 10,
  },

  summaryTitle: {
    fontSize: 18,
    color: 'black',
    fontFamily: FONT_FAMILY.bold,
    marginBottom: 12,
  },

  topStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  statBox: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },

  statLabel: {
    fontSize: 12,
    marginTop: 4,
    color: '#555',
    fontFamily: FONT_FAMILY.normal,
  },

  statValue: {
    marginTop: 4,
    fontSize: 18,
    color: '#0537ff',
    fontFamily: FONT_FAMILY.bold,
  },

  breakdownTitle: {
    fontSize: 16,
    color: 'black',
    fontFamily: FONT_FAMILY.bold,
    marginBottom: 10,
  },

  breakdownWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  breakdownChip: {
    backgroundColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#0537ff',
  },

  breakdownChipText: {
    fontFamily: FONT_FAMILY.semiBold,
    color: '#0537ff',
  },

  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logo: {
    height: 30,
    width: 30,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  selectorCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 15,
    padding: 14,
    borderRadius: 14,
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    fontFamily: FONT_FAMILY.semiBold,
  },

  dropdown: {
    backgroundColor: '#f4f6fa',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
  },

  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    margin: 18,
    padding: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  menuIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#eef1ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  menuIcon: {
    height: 34,
    width: 34,
    resizeMode: 'contain',
  },

  menuTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: '#222',
    textAlign: 'center',
    width: 80,
  },

  menuHint: {
    fontSize: 11,
    color: '#888',
    marginTop: 3,
  },

  reportCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 18,
    borderRadius: 18,
    elevation: 4,
  },

  reportTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    color: '#222',
  },

  reportActions: {
    gap: 12,
  },

  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    padding: 14,
    borderRadius: 14,
  },

  reportIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#eef1ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  reportButtonTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: '#222',
  },

  reportButtonSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  reportSubtitle: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
    marginBottom: 14,
  },

  filterLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    marginTop: 14,
    marginBottom: 6,
  },

  radioRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 10,
  },

  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  filterBox: {
    backgroundColor: '#f4f6fa',
    padding: 12,
    borderRadius: 10,
  },

  modalActions: {
    marginTop: 20,
  },

  previewBtn: {
    borderWidth: 1,
    borderColor: '#4A6CF7',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    alignItems: 'center',
  },
});
