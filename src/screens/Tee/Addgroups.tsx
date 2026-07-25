import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Toast } from 'react-native-toast-notifications';

import Header from '../../components/Header';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import DetailSection from '../../components/booking/DetailSection';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { useAppAlert } from '../../hooks/useAppAlert';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { ENDPOINT } from '../../util/constant';
import { javascriptPost } from '../../util/api';
import { FONT_FAMILY } from '../../util/colors';
import { useBuddies, userGroups } from '../../services/TeeService';

const Addgroups = ({ navigation, route }) => {
  const userData = useSelector((state: any) => state.auth);
  const { colors } = useAppTheme();
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const { type = 'Buddy', data, edit } = route.params;
  const [buddy, setBuddy] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupError, setGroupError] = useState(false);
  const [group, setGroup] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedBuddy, setDebouncedBuddy] = useState('');

  const currentMember = useMemo(
    () => ({
      id: userData?.user?.id,
      DisplayName: userData?.user?.DisplayName,
      MemberID: userData?.user?.MemberID,
    }),
    [userData?.user?.DisplayName, userData?.user?.MemberID, userData?.user?.id],
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedBuddy(buddy.trim());
    }, 300);

    return () => clearTimeout(handler);
  }, [buddy]);

  useEffect(() => {
    if (type === 'Group') {
      if (Array.isArray(edit?.group) && edit.group.length) {
        setGroup(edit.group);
      } else {
        setGroup([currentMember]);
      }
      setGroupName(edit?.group_name || '');
      return;
    }

    if (edit?.member) {
      setGroup([
        {
          id: edit.member.id,
          DisplayName: edit.member.DisplayName,
          MemberID: edit.member.MemberID,
        },
      ]);
      return;
    }

    setGroup([]);
  }, [currentMember, edit, type]);

  const membersQuery = useBuddies(userData, data.id, debouncedBuddy);
  const groupsQuery = userGroups(userData.token);

  const isGroupMode = type === 'Group';
  const canSubmit = isGroupMode
    ? group.length >= 3 && groupName.trim().length > 0
    : group.length === 1;

  const selectedCountLabel = isGroupMode
    ? `${group.length}/4 selected`
    : `${group.length}/1 selected`;

  const helperText = isGroupMode
    ? 'Pick at least three golfers to build a reusable favorite four.'
    : 'Choose one member to save as a tee buddy for this session.';

  const addBuddy = async () => {
    if (group.length !== 1) {
      showAlert({
        title: 'Select one buddy',
        message: 'You can save only one buddy at a time.',
        tone: 'warning',
      });
      return;
    }

    const apiObj = {
      path: edit?.id ? ENDPOINT.tee_edit_buddy + edit.id : ENDPOINT.tee_add_buddy,
      Token: userData.token,
      body: {
        buddy_member_id: group[0].id,
        tee_session_id: data.id,
      },
    };

    try {
      setLoading(true);
      const response = await javascriptPost(apiObj);
      setLoading(false);

      if (response.status) {
        Toast.show(response.message || 'Buddy saved successfully', {
          type: 'success',
        });
        groupsQuery.refetch();
        navigation.goBack();
        return;
      }

      showAlert({
        title: 'Unable to save buddy',
        message: response.message || 'Please try again in a moment.',
        tone: 'danger',
      });
    } catch (_error) {
      setLoading(false);
      showAlert({
        title: 'Network issue',
        message: 'We could not save this buddy right now.',
        tone: 'danger',
      });
    }
  };

  const addGroup = async () => {
    console.log(  '---------------------- feeewdwedf---------------------');
    if (!groupName.trim()) {
      setGroupError(true);
      showAlert({
        title: 'Add a group name',
        message: 'Your favorite four needs a clear group name.',
        tone: 'warning',
      });
      return;
    }

    if (group.length < 3) {
      showAlert({
        title: 'More players needed',
        message: 'Select at least three players before saving this favorite four.',
        tone: 'warning',
      });
      return;
    }

    const apiObj = {
      path: edit?.id ? ENDPOINT.tee_edit_group + edit.id : ENDPOINT.tee_add_group,
      Token: userData.token,
      body: {
        group_name: groupName.trim(),
        player1_id: group[0]?.id,
        player2_id: group[1]?.id,
        player3_id: group[2]?.id,
        player4_id: group[3]?.id,
        tee_session_id: data.id,
        category_type_code: userData?.user?.CategoryTypeCode,
      },
    };

    try {
      setLoading(true);
      const response = await javascriptPost(apiObj);
      setLoading(false);

      if (response.status) {
        Toast.show(response.message || 'Favorite four saved successfully', {
          type: 'success',
        });
        groupsQuery.refetch();
        navigation.goBack();
        return;
      }

      showAlert({
        title: 'Unable to save group',
        message: response.message || 'Please review the players and try again.',
        tone: 'danger',
      });
    } catch (_error) {
      setLoading(false);
      showAlert({
        title: 'Network issue',
        message: 'We could not save this favorite four right now.',
        tone: 'danger',
      });
    }
  };

  const addNewBuddy = (item: any) => {
    if (group.some(existing => existing.id === item.id)) {
      return;
    }

    if (isGroupMode && group.length === 4) {
      showAlert({
        title: 'Group full',
        message: 'A favorite four can include a maximum of four players.',
        tone: 'warning',
      });
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isGroupMode) {
      setGroup(prev => [...prev, item]);
      return;
    }

    setGroup([item]);
  };

  const removeMember = (index: number) => {
    if (isGroupMode && index === 0) {
      showAlert({
        title: 'Primary player locked',
        message: 'Your own member profile stays pinned as the first player in this favorite four.',
        tone: 'warning',
      });
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setGroup(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const members = Array.isArray(membersQuery.data) ? membersQuery.data : [];

  const renderBuddies = ({ item }) => {
    if (group.some(entry => entry.id === item.id)) {
      return null;
    }

    return (
      <Pressable
        style={[
          styles.resultCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => addNewBuddy(item)}
      >
        <View style={styles.resultBody}>
          <View style={[styles.avatarPill, { backgroundColor: `${colors.text}16` }]}>
            <MaterialIcon name="account" size={18} color={colors.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              {item?.DisplayName}
            </Text>
            <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
              Member ID: {item?.MemberID}
            </Text>
          </View>
        </View>
        <Icon name="add-circle" size={22} color={colors.text} />
      </Pressable>
    );
  };

  const listHeader = (
    <View>
    

      <DetailSection
        title="Selected Players"
        subtitle={isGroupMode ? 'Reorder mentally before saving your regular foursome.' : 'Only one active buddy can be saved in this step.'}
        delay={40}
      >
        <View style={styles.selectedWrap}>
          {group.map((item, index) => (
            <Pressable
              key={`${item?.id}-${index}`}
              style={[
                styles.selectedChip,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => removeMember(index)}
            >
              <View>
                <Text style={[styles.selectedName, { color: colors.text }]}>
                  {isGroupMode ? `${index + 1}. ` : ''}
                  {item?.DisplayName || item?.MemberID}
                </Text>
                <Text style={[styles.selectedMeta, { color: colors.textMuted }]}>
                  {item?.MemberID || 'Member'}
                </Text>
              </View>
              <MaterialIcon
                name={isGroupMode && index === 0 ? 'lock-outline' : 'close-circle'}
                size={18}
                color={isGroupMode && index === 0 ? colors.warning : colors.danger}
              />
            </Pressable>
          ))}
        </View>

        {!group.length ? (
          <EmptyStateCard
            title={`No ${type.toLowerCase()} selected`}
            description={helperText}
          />
        ) : null}
      </DetailSection>

      {isGroupMode ? (
        <DetailSection
          title="Group Name"
          // subtitle="Use a recognizable name so you can pick this four quickly during tee booking."
          delay={80}
        >
          <TextInput
            value={groupName}
            onChangeText={text => {
              setGroupName(text);
              setGroupError(false);
            }}
            cursorColor={colors.primary}
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: groupError ? colors.danger : colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Enter favorite four name"
            placeholderTextColor={colors.placeholder}
            maxLength={50}
          />
        </DetailSection>
      ) : null}

      <DetailSection
        title="Add Players"
        // subtitle="Search available members for this session and tap to add them."
        delay={120}
      >
        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <MaterialIcon name="magnify" size={20} color={colors.textMuted} />
          <TextInput
            value={buddy}
            onChangeText={setBuddy}
            cursorColor={colors.primary}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by member name or member ID"
            placeholderTextColor={colors.placeholder}
            maxLength={25}
          />
        </View>
      </DetailSection>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header title={`${edit?.id ? 'Edit' : 'Add'} ${type}`} />

      <FlatList
        data={members}
        keyExtractor={item => String(item?.id)}
        renderItem={renderBuddies}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          membersQuery.isLoading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[styles.loaderText, { color: colors.textMuted }]}>
                Searching eligible members...
              </Text>
            </View>
          ) : (
            <EmptyStateCard
              title="No players found"
              description="Try another search term or switch back to the session picker."
            />
          )
        }
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      />

      <View
        style={[
          styles.footerBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={isGroupMode ? addGroup : addBuddy}
          disabled={!canSubmit || loading}
          style={[
            styles.ctaButton,
            {
              backgroundColor: canSubmit ? colors.primary : `${colors.primary}55`,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <>
              <MaterialIcon
                name={edit?.id ? 'content-save-edit-outline' : 'content-save-outline'}
                size={18}
                color={colors.onPrimary}
              />
              <Text style={[styles.ctaLabel, { color: colors.onPrimary }]}>
                {isGroupMode
                  ? edit?.id
                    ? 'Update Favorite Four'
                    : 'Create Favorite Four'
                  : edit?.id
                    ? 'Update Buddy'
                    : 'Save Buddy'}
              </Text>
            </>
          )}
        </Pressable>
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

export default Addgroups;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  selectedWrap: {
    gap: 12,
  },
  selectedChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
  },
  selectedMeta: {
    marginTop: 3,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14,
  },
  searchWrap: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 10,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 14,
  },
  resultCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPill: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
  },
  resultMeta: {
    marginTop: 4,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
  },
  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
  },
  ctaButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  ctaLabel: {
    marginLeft: 8,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
  },
  loaderWrap: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
  },
});
