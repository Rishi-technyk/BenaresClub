import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { AnimatedFAB, Dialog, Portal } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Toast } from 'react-native-toast-notifications';

import Header from '../../components/Header';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { useAppAlert } from '../../hooks/useAppAlert';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { userGroups, useSession } from '../../services/TeeService';
import { javascriptGet } from '../../util/api';
import { ENDPOINT } from '../../util/constant';
import { FONT_FAMILY } from '../../util/colors';
import EditBuddyModal from './EditBuddyModal';

const SessionPickerDialog = ({
  visible,
  title,
  sessions,
  colors,
  onDismiss,
  onSelect,
}) => (
  <Portal>
    <Dialog
      visible={visible}
      onDismiss={onDismiss}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 22,
      }}
    >
      <Dialog.Title style={{ color: colors.text, fontFamily: FONT_FAMILY.bold }}>
        {title}
      </Dialog.Title>
      <Dialog.Content>
        {Array.isArray(sessions) && sessions.length > 0 ? (
          sessions.map(item => (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item)}
              style={[
                styles.sessionRow,
                {
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.sessionText, { color: colors.text }]}>
                {item.session_name}
              </Text>
              <Icon name="chevron-right" size={18} color={colors.textMuted} />
            </Pressable>
          ))
        ) : (
          <Text style={[styles.sessionEmptyText, { color: colors.textMuted }]}>
            No sessions available right now.
          </Text>
        )}
      </Dialog.Content>
    </Dialog>
  </Portal>
);

const MyBuddies = ({
  navigation,
  sessions,
  buddies,
  token,
  refetch,
  isLoading,
  colors,
  showAlert,
}) => {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editBuddy, setEditBuddy] = useState<any>(null);

  const buddyItems = buddies?.buddies || [];

  const deleteBuddy = async id => {
    try {
      const response = await javascriptGet({
        path: ENDPOINT.tee_delete_buddy + id,
        Token: token,
        body: {},
      });

      if (response.status) {
        Toast.show(response.message || 'Buddy deleted successfully', {
          type: 'success',
        });
        refetch();
        return;
      }

      showAlert({
        title: 'Delete failed',
        message: response.message || 'Unable to delete this buddy right now.',
        tone: 'danger',
      });
    } catch (_error) {
      showAlert({
        title: 'Delete failed',
        message: 'Unable to delete this buddy right now.',
        tone: 'danger',
      });
    }
  };

  const buddySummary = useMemo(
    () => ({
      total: buddyItems.length,
      uniqueSessions: new Set(buddyItems.map(item => item?.tee_session_id)).size,
    }),
    [buddyItems],
  );

  return (
    <View style={styles.tabContainer}>

      <FlatList
        data={buddyItems}
        contentContainerStyle={styles.listContent}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                Loading buddies...
              </Text>
            </View>
          ) : (
            <EmptyStateCard
              title="No buddies saved"
              description="Create a buddy for a session to speed up your next tee reservation."
            />
          )
        }
        renderItem={({ item }) => {
          const sessionName =
            sessions?.find(group => group.id == item.tee_session_id)?.session_name || 'Session';

          return (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIdentity}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: `${colors.text}14` },
                    ]}
                  >
                    <Icon name="account-heart-outline" size={20} color={colors.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                      {item?.member?.DisplayName}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                      {sessionName}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.sessionBadge,
                    { backgroundColor: `${colors.text}16` },
                  ]}
                >
                  <Text style={[styles.sessionBadgeText, { color: colors.text }]}>
                    Buddy
                  </Text>
                </View>
              </View>

              <View style={styles.infoBlock}>
                <InfoRow label="Member ID" value={item?.member?.MemberID} colors={colors} />
                <InfoRow label="Email" value={item?.member?.Email || 'N/A'} colors={colors} />
              </View>

              <View style={styles.cardActions}>
                <Pressable
                  style={[
                    styles.smallAction,
                    {
                      borderColor: `${colors.text}35`,
                      backgroundColor: `${colors.text}12`,
                    },
                  ]}
                  onPress={() => {
                    setEditBuddy(item);
                    setPickerVisible(true);
                  }}
                >
                  <Icon name="pencil-outline" size={18} color={colors.text} />
                  <Text style={[styles.smallActionText, { color: colors.text }]}>
                    Edit
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.smallAction,
                    {
                      borderColor: `${colors.danger}35`,
                      backgroundColor: `${colors.danger}12`,
                    },
                  ]}
                  onPress={() =>
                    Alert.alert(
                      'Delete buddy',
                      `Do you want to delete ${item?.member?.DisplayName}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => deleteBuddy(item.id),
                        },
                      ],
                    )
                  }
                >
                  <Icon name="trash-can-outline" size={18} color={colors.danger} />
                  <Text style={[styles.smallActionText, { color: colors.danger }]}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      <SessionPickerDialog
        visible={pickerVisible}
        title={`Select Session${editBuddy ? ` for ${editBuddy?.member?.DisplayName}` : ''}`}
        sessions={sessions}
        colors={colors}
        onDismiss={() => {
          setPickerVisible(false);
          setEditBuddy(null);
        }}
        onSelect={item => {
          navigation.navigate('Addgroups', {
            type: 'Buddy',
            data: item,
            edit: editBuddy,
          });
          setPickerVisible(false);
          setEditBuddy(null);
        }}
      />

      <AnimatedFAB
        icon="plus"
        label="New Buddy"
        extended
        onPress={() => setPickerVisible(true)}
        visible
        animateFrom="right"
        iconMode="dynamic"
        style={[
          styles.fabStyle,
          {
            backgroundColor: colors.primary,
          },
        ]}
        color={colors.onPrimary}
      />
    </View>
  );
};

const Favorite4 = ({
  navigation,
  sessions,
  groups,
  token,
  refetch,
  isLoading,
  colors,
}) => {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const groupItems = groups || [];

  const groupSummary = useMemo(
    () => ({
      total: groupItems.length,
      totalPlayers: groupItems.reduce(
        (sum, item) =>
          sum +
          [item?.player1, item?.player2, item?.player3, item?.player4].filter(Boolean).length,
        0,
      ),
    }),
    [groupItems],
  );

  return (
    <View style={styles.tabContainer}>
    

      <FlatList
        data={groupItems}
        contentContainerStyle={styles.listContent}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                Loading favorite fours...
              </Text>
            </View>
          ) : (
            <EmptyStateCard
              title="No favorite fours saved"
              description="Create a reusable group to reserve popular tee slots faster."
            />
          )
        }
        renderItem={({ item }) => {
          const sessionName =
            sessions?.find(group => group.id == item.tee_session_id)?.session_name || 'Session';
          const players = [item?.player1, item?.player2, item?.player3, item?.player4].filter(
            Boolean,
          );

          return (
            <Pressable
              onPress={() => setModalData({ buddy: item })}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIdentity}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: `${colors.secondary}14` },
                    ]}
                  >
                    <Icon name="account-group-outline" size={20} color={colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                      {item?.group_name}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                      {sessionName}
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={20} color={colors.textMuted} />
              </View>

              <View style={styles.groupList}>
                {players.map((player, index) => (
                  <View key={`${player?.id}-${index}`} style={styles.groupRow}>
                    <Text style={[styles.groupIndex, { color: colors.primary }]}>
                      {index + 1}.
                    </Text>
                    <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>
                      {player?.DisplayName}
                    </Text>
                    <Text style={[styles.groupMeta, { color: colors.textMuted }]} numberOfLines={1}>
                      {player?.MemberID}
                    </Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        }}
      />

      <EditBuddyModal
        visible={modalData}
        onDismiss={() => setModalData(null)}
        buddy={modalData?.buddy}
        token={token}
        refetch={refetch}
      />

      <SessionPickerDialog
        visible={pickerVisible}
        title="Select Session for Favorite Four"
        sessions={sessions}
        colors={colors}
        onDismiss={() => setPickerVisible(false)}
        onSelect={item => {
          navigation.navigate('Addgroups', {
            type: 'Group',
            data: item,
          });
          setPickerVisible(false);
        }}
      />

      <AnimatedFAB
        icon="plus"
        label="New Group"
        extended
        onPress={() => setPickerVisible(true)}
        visible
        animateFrom="right"
        iconMode="dynamic"
        style={[
          styles.fabStyle,
          {
            backgroundColor: colors.primary,
          },
        ]}
        color={colors.onPrimary}
      />
    </View>
  );
};

const BuddiesTabs = ({ navigation }) => {
  const userData = useSelector((state: any) => state.auth);
  const { colors } = useAppTheme();
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const sessionsData = useSession(userData.token);
  const { data, refetch } = userGroups(userData?.token);
  const [activeTab, setActiveTab] = useState<'buddies' | 'group'>('buddies');

  const sessions = sessionsData?.data?.data || [];
  const buddies = data?.buddies || [];
  const groups = data?.groups || [];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header title="Manage Buddies and Favorite 4" />

      <View
        style={[
          styles.tabRow,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => setActiveTab('buddies')}
          style={[
            styles.tabBtn,
            {
              backgroundColor:
                activeTab === 'buddies' ? colors.primary : 'transparent',
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'buddies' ? colors.onPrimary : colors.textMuted },
            ]}
          >
            Buddies
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('group')}
          style={[
            styles.tabBtn,
            {
              backgroundColor: activeTab === 'group' ? colors.primary : 'transparent',
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'group' ? colors.onPrimary : colors.textMuted },
            ]}
          >
            Favorite 4
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'buddies' ? (
          <MyBuddies
            navigation={navigation}
            sessions={sessions}
            buddies={data}
            token={userData?.token}
            refetch={refetch}
            isLoading={sessionsData.isLoading}
            colors={colors}
            showAlert={showAlert}
          />
        ) : (
          <Favorite4
            navigation={navigation}
            sessions={sessions}
            groups={groups}
            token={userData?.token}
            refetch={refetch}
            isLoading={sessionsData.isLoading}
            colors={colors}
          />
        )}
      </View>

      <AppAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        tone={alertState.tone}
       primaryLabel={alertState.primaryLabel}
        secondaryLabel={alertState.secondaryLabel}
        onPrimaryPress={() => {
          alertState.onPrimaryPress?.();
          hideAlert();
        }}
        onSecondaryPress={() => {
          alertState.onSecondaryPress?.();
          hideAlert();
        }}
        onDismiss={hideAlert}
      />
    </View>
  );
};

export default BuddiesTabs;

const InfoRow = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: any;
  colors: any;
}) => (
  <View style={styles.infoRow}>
    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
      {value || 'N/A'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  tabContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 110,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 18,
    padding: 5,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 14,
  },
  tabText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
  },
  cardSubtitle: {
    marginTop: 4,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
  },
  sessionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sessionBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
  },
  infoBlock: {
    marginTop: 14,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  smallAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallActionText: {
    marginLeft: 8,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
  },
  groupList: {
    marginTop: 14,
    gap: 10,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIndex: {
    width: 22,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
  },
  groupName: {
    flex: 1,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 13,
  },
  groupMeta: {
    maxWidth: 110,
    textAlign: 'right',
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
  },
  emptyWrap: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyHint: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
  },
  fabStyle: {
    position: 'absolute',
    right: 18,
    bottom: 24,
  },
  sessionRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
  },
  sessionEmptyText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    paddingVertical: 12,
  },
});
