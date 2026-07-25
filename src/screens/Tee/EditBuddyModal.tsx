import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import RNModal from 'react-native-modal';
import { Dialog, Portal } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Toast } from 'react-native-toast-notifications';

import { useSession } from '../../services/TeeService';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { ENDPOINT } from '../../util/constant';
import { javascriptGet } from '../../util/api';
import { FONT_FAMILY } from '../../util/colors';

const EditBuddyModal = ({ visible, onDismiss, buddy, token, refetch }) => {
  const { colors } = useAppTheme();
  const sessionsData = useSession(token);
  const navigation = useNavigation();
  const [sessionDialogVisible, setSessionDialogVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const players = useMemo(
    () =>
      [
        { id: buddy?.player1_id, ...buddy?.player1 },
        { id: buddy?.player2_id, ...buddy?.player2 },
        { id: buddy?.player3_id, ...buddy?.player3 },
        { id: buddy?.player4_id, ...buddy?.player4 },
      ].filter(player => player?.id),
    [buddy],
  );

  const sessionName = useMemo(
    () =>
      sessionsData?.data?.data?.find(session => session.id == buddy?.tee_session_id)
        ?.session_name || 'Session unavailable',
    [buddy?.tee_session_id, sessionsData?.data?.data],
  );

  const handleDelete = async () => {
    Alert.alert(
      'Delete favorite four',
      `Do you want to delete ${buddy?.group_name || 'this group'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const response = await javascriptGet({
                path: ENDPOINT.tee_delete_group + buddy?.id,
                Token: token,
                body: {},
              });
              setDeleting(false);

              if (response?.status) {
                Toast.show(response.message || 'Favorite four deleted successfully', {
                  type: 'success',
                });
                refetch?.();
                onDismiss?.();
                return;
              }

              Toast.show(response?.message || 'Unable to delete this favorite four.', {
                type: 'danger',
              });
            } catch (_error) {
              setDeleting(false);
              Toast.show('Unable to delete this favorite four right now.', {
                type: 'danger',
              });
            }
          },
        },
      ],
    );
  };

  const handleEditSession = item => {
    navigation.navigate('Addgroups', {
      type: 'Group',
      data: item,
      edit: { ...buddy, group: players },
    });
    setSessionDialogVisible(false);
    onDismiss?.();
  };

  return (
    <>
      <RNModal
        isVisible={Boolean(visible)}
        swipeDirection={['down']}
        onBackdropPress={onDismiss}
        onSwipeComplete={onDismiss}
        style={styles.modal}
        backdropColor={colors.overlay}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: colors.textMuted }]}>
                Favorite Four
              </Text>
              <Text style={[styles.title, { color: colors.text }]}>
                {buddy?.group_name || 'Saved group'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {sessionName}
              </Text>
            </View>
            <Pressable
              onPress={onDismiss}
              style={[
                styles.closeButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Icon name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          <FlatList
            data={players}
            keyExtractor={(item, index) => `${item?.id}-${index}`}
            scrollEnabled={false}
            contentContainerStyle={styles.playerList}
            renderItem={({ item, index }) => (
              <View
                style={[
                  styles.playerCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.playerIndex, { backgroundColor: `${colors.secondary}18` }]}>
                  <Text style={[styles.playerIndexText, { color: colors.secondary }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.playerName, { color: colors.text }]}>
                    {item?.DisplayName}
                  </Text>
                  <Text style={[styles.playerMeta, { color: colors.textMuted }]}>
                    Member ID: {item?.MemberID || 'N/A'}
                  </Text>
                </View>
              </View>
            )}
          />

          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => {
                onDismiss?.();
                setSessionDialogVisible(true)}}
              style={[
                styles.actionButton,
                {
                  backgroundColor: `${colors.text}12`,
                  borderColor: `${colors.text}35`,
                },
              ]}
            >
              <Icon name="pencil-outline" size={18} color={colors.text} />
              <Text style={[styles.actionText, { color: colors.text }]}>Edit Group</Text>
            </Pressable>

            <Pressable
              onPress={handleDelete}
              disabled={deleting}
              style={[
                styles.actionButton,
                {
                  backgroundColor: `${colors.danger}12`,
                  borderColor: `${colors.danger}35`,
                },
              ]}
            >
              <Icon name="trash-can-outline" size={18} color={colors.danger} />
              <Text style={[styles.actionText, { color: colors.danger }]}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Text>
            </Pressable>
          </View>
        </View>
      </RNModal>

      <Portal>
        <Dialog
          visible={sessionDialogVisible}
          onDismiss={() => setSessionDialogVisible(false)}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 22,
          }}
        >
          <Dialog.Title style={{ color: colors.text, fontFamily: FONT_FAMILY.bold }}>
            Choose a Session
          </Dialog.Title>
          <Dialog.Content>
            {Array.isArray(sessionsData?.data?.data) && sessionsData?.data?.data.length > 0 ? (
              sessionsData.data.data.map(item => (
                <Pressable
                  key={item.id}
                  onPress={() => handleEditSession(item)}
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
              <Text style={[styles.emptySessionText, { color: colors.textMuted }]}>
                No sessions available right now.
              </Text>
            )}
          </Dialog.Content>
        </Dialog>
      </Portal>
    </>
  );
};

export default EditBuddyModal;

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 26,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 6,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  playerList: {
    marginTop: 18,
    gap: 10,
  },
  playerCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerIndex: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playerIndexText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
  },
  playerName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
  },
  playerMeta: {
    marginTop: 4,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    marginLeft: 8,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
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
  emptySessionText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    paddingVertical: 12,
  },
});
