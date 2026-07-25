import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import StarIcon from 'react-native-vector-icons/AntDesign';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';

import Header from '../../components/Header';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import EmptyStateCard from '../../components/booking/EmptyStateCard';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { useAppAlert } from '../../hooks/useAppAlert';
import UniversalModal from '../../components/UniversalModal';
import NewButton from '../../components/Button';
import { usePlayers, usePlayersQuery } from '../../services/Activity/FacilityService';
import { javascriptPost } from '../../util/api';
import { ENDPOINT } from '../../util/constant';
import { FONT_FAMILY } from '../../util/colors';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { RootState } from '../../store/store';
import { useAppTheme } from '../../theme/AppThemeProvider';

type Props = NativeStackScreenProps<AppStackParamList, 'Players'>;

type PlayerForm = {
  id?: number | string;
  is_update?: boolean;
  name: string;
  mobile: string;
  email: string;
};

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

const initialFormState: PlayerForm = {
  name: '',
  mobile: '',
  email: '',
};

const Players: React.FC<Props> = () => {
  const userData = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { alertState, hideAlert, showAlert } = useAppAlert();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playerForm, setPlayerForm] = useState<PlayerForm>(initialFormState);
  const [playerFilters, setPlayerFilters] = useState([
    { id: 1, title: 'Favorite', is_active: false },
    { id: 2, title: 'Non-member', is_active: false },
    { id: 3, title: 'Member', is_active: false },
  ]);

  const { playersQuery } = usePlayersQuery(
    userData,
    playerFilters[0].is_active,
    playerFilters[1].is_active,
    playerFilters[2].is_active,
  );
  const { guestQuery } = usePlayers(1, debouncedSearch, null, userData);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchText]);

  const savedPlayers = useMemo(() => {
    if (playersQuery?.data?.status && Array.isArray(playersQuery?.data?.data)) {
      return playersQuery.data.data;
    }

    return [];
  }, [playersQuery?.data]);
console.log( playersQuery?.data, '---------------------- playersQuery?.data ---------------------');
  const searchedPlayers = useMemo(() => {
    const searchData = guestQuery?.data?.data?.data;
    return Array.isArray(searchData) ? searchData : [];
  }, [guestQuery?.data]);

  const favoriteCount = useMemo(
    () => savedPlayers.filter((item: any) => Number(item?.is_favorite) === 1).length,
    [savedPlayers],
  );

  const activeFilterCount = useMemo(
    () => playerFilters.filter(item => item.is_active).length,
    [playerFilters],
  );

  const openCreateModal = useCallback(() => {
    setPlayerForm(initialFormState);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((item: any) => {
    setPlayerForm({
      id: item.id,
      is_update: true,
      name: item.name || '',
      mobile: item.mobile || '',
      email: item.email || '',
    });
    setShowModal(true);
  }, []);

  const validatePlayerForm = useCallback(() => {
    if (!playerForm.name.trim()) {
      showAlert({
        title: 'Name required',
        message: 'Please enter the player name before saving.',
        tone: 'warning',
      });
      return false;
    }

    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(playerForm.mobile)) {
      showAlert({
        title: 'Invalid mobile number',
        message: 'Please enter a valid 10-digit mobile number.',
        tone: 'warning',
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(playerForm.email)) {
      showAlert({
        title: 'Invalid email address',
        message: 'Please enter a valid email address.',
        tone: 'warning',
      });
      return false;
    }

    return true;
  }, [playerForm.email, playerForm.mobile, playerForm.name, showAlert]);

  const refreshSavedPlayers = useCallback(() => {
    playersQuery.refetch();
    if (debouncedSearch) {
      guestQuery.refetch();
    }
  }, [debouncedSearch, guestQuery, playersQuery]);

  const handleSavePlayer = useCallback(async () => {
    if (!validatePlayerForm()) {
      return;
    }

    setSaving(true);

    try {
      const response = await javascriptPost({
        path: playerForm.is_update
          ? ENDPOINT.update_activity_guest + playerForm.id
          : ENDPOINT.create_activity_guest,
        body: {
          name: playerForm.name,
          email: playerForm.email,
          mobile: playerForm.mobile,
          occupant_id: 2,
        },
        Token: userData?.token,
      });
console.log( response, '---------------------- response ---------------------');
      if (response?.success || response?.status) {
        setShowModal(false);
        setPlayerForm(initialFormState);
        refreshSavedPlayers();
        showAlert({
          title: playerForm.is_update ? 'Player updated' : 'Player added',
          message: response?.message || 'Player details have been saved successfully.',
          tone: 'success',
        });
        return;
      }
let message = 'Unable to save player details right now.';

if (typeof response?.message === 'string') {
  message = response.message;
} else if (
  response?.message &&
  typeof response.message === 'object'
) {
  message = Object.values(response.message)
    .flat()
    .join('\n');
}

      showAlert({
        title: 'Save failed',
        message,
        tone: 'danger',
      });
    } catch (error) {
      showAlert({
        title: 'Save failed',
        message: 'Something went wrong while saving the player.',
        tone: 'danger',
      });
    } finally {
      setSaving(false);
    }
  }, [playerForm, refreshSavedPlayers, showAlert, userData?.token, validatePlayerForm]);

  const updatePlayerAction = useCallback(async (item: any, action: 'Like' | 'Delete') => {
    try {
      const response = await javascriptPost({
        body: {
          type: action,
          id: item.id,
        },
        path: ENDPOINT.editPlayer,
        Token: userData?.token,
      });

      if (response?.status) {
        refreshSavedPlayers();
        return;
      }

      showAlert({
        title: 'Action unavailable',
        message: response?.message || 'We could not update this player right now.',
        tone: 'warning',
      });
    } catch (error) {
      showAlert({
        title: 'Action failed',
        message: 'Something went wrong while updating this player.',
        tone: 'danger',
      });
    }
  }, [refreshSavedPlayers, showAlert, userData?.token]);

  const confirmDelete = useCallback((item: any) => {
    showAlert({
      title: 'Remove player',
      message: `Do you want to remove ${item?.name || 'this player'} from your saved list?`,
      tone: 'warning',
      primaryLabel: 'Remove',
      secondaryLabel: 'Cancel',
      onPrimaryPress: () => updatePlayerAction(item, 'Delete'),
    });
  }, [showAlert, updatePlayerAction]);

  const toggleFilter = useCallback((id: number) => {
    setPlayerFilters(prev =>
      prev.map(item =>
        item.id === id ? { ...item, is_active: !item.is_active } : item,
      ),
    );
  }, []);

  const renderSavedPlayer = ({ item }: { item: any }) => (
    <View style={styles.playerCard}>
      <View style={styles.playerHeader}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarLabel}>
            {(item?.name || 'P').trim().charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{item?.name || 'Player'}</Text>
          <Text style={styles.playerMeta}>
            {Number(item?.occupant_id) === 1
              ? item?.player_memberId || 'Member'
              : 'Non-member'}
          </Text>
        </View>

        <TouchableOpacity onPress={() => updatePlayerAction(item, 'Like')} style={styles.starButton}>
          <StarIcon
            name={Number(item?.is_favorite) === 1 ? 'star' : 'staro'}
            size={18}
            color={Number(item?.is_favorite) === 1 ? '#f59e0b' : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.detailRow}>
        <Icon name="email-outline" size={16} color={colors.textMuted} />
        <Text style={styles.detailText}>{item?.email || 'Email not available'}</Text>
      </View>

      <View style={styles.detailRow}>
        <Icon name="phone-outline" size={16} color={colors.textMuted} />
        <Text style={styles.detailText}>{item?.mobile || 'Mobile not available'}</Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryAction} onPress={() => openEditModal(item)}>
          <Icon name="pencil-outline" size={16} color={colors.primary} />
          <Text style={styles.secondaryActionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerAction} onPress={() => confirmDelete(item)}>
          <Icon name="trash-can-outline" size={16} color={colors.danger} />
          <Text style={styles.dangerActionText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }: { item: any }) => (
    <View style={styles.searchResultCard}>
      <View style={styles.searchResultTextWrap}>
        <Text style={styles.searchResultName}>{item?.DisplayName?.trim() || 'Player'}</Text>
        <Text style={styles.searchResultSubtitle}>
          {Number(item?.occupant_id) === 2 ? 'Non-member' : item?.MemberID || 'Member'}
        </Text>
      </View>
      <Text style={styles.chargeText}>Rs. {item?.charge || 0}</Text>
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      {[1, 2, 3].map(item => (
        <View key={item} style={styles.playerCard}>
          <View style={styles.playerHeader}>
            <ShimmerPlaceholder style={styles.skeletonAvatar} />
            <View style={styles.flexOne}>
              <ShimmerPlaceholder style={styles.skeletonLineWide} />
              <ShimmerPlaceholder style={styles.skeletonLineShort} />
            </View>
          </View>
          <ShimmerPlaceholder style={styles.skeletonLineWide} />
          <ShimmerPlaceholder style={styles.skeletonLineWide} />
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.screen}>
      <Header title="My Guests">
        <TouchableOpacity style={styles.headerAction} onPress={openCreateModal}>
          <Icon name="plus" size={16} color={colors.onPrimary} />
          <Text style={styles.headerActionText}>Add Guest</Text>
        </TouchableOpacity>
      </Header>

      <FlatList
        data={debouncedSearch ? searchedPlayers : savedPlayers}
        keyExtractor={(item, index) => String(item?.id || item?.MemberID || index)}
        renderItem={debouncedSearch ? renderSearchResult : renderSavedPlayer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <BookingHeroCard
              eyebrow="Activity Directory"
              title="Guest Manager"
              // subtitle="Manage saved activity players, mark favorites, and quickly search the shared player directory before a booking."
              status={`${savedPlayers.length} saved`}
              statusTone="neutral"
              meta={[
                { label: 'Favorites', value: String(favoriteCount), tone: 'success' },
                // { label: 'Total', value: String(savedPlayers.length) },
              ]}
            />

          </View>
        }
        ListEmptyComponent={
          playersQuery.isLoading || guestQuery.isLoading ? (
            renderSkeleton()
          ) : (
            <EmptyStateCard
              title={  'No Active slots available for this activity.'}
              description={
               'Please check back later or contact support for assistance.'
              }
            />
          )
        }
      />

      <UniversalModal
        isFull
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={playerForm.is_update ? 'Edit Guest' : 'Add Guest'}
        setVisible={setShowModal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {playerForm.is_update ? 'Update guest details' : 'Create a new saved guest'}
          </Text>
          <Text style={styles.modalSubtitle}>
            These values are posted to the existing activity guest APIs, so the backend and booking flows stay unchanged.
          </Text>

          <TextInput
            value={playerForm.name}
            placeholder="Guest name"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
            onChangeText={text => setPlayerForm(prev => ({ ...prev, name: text }))}
            cursorColor={colors.primary}
            maxLength={50}
          />
          <TextInput
            value={playerForm.mobile}
            placeholder="Mobile number"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
            onChangeText={text => setPlayerForm(prev => ({ ...prev, mobile: text }))}
            keyboardType="number-pad"
            cursorColor={colors.primary}
            maxLength={10}
          />
          <TextInput
            value={playerForm.email}
            placeholder="Email address"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
            onChangeText={text => setPlayerForm(prev => ({ ...prev, email: text }))}
            keyboardType="email-address"
            cursorColor={colors.primary}
            maxLength={100}
          />

          <NewButton
            loading={saving}
            onPress={handleSavePlayer}
            text={playerForm.is_update ? 'Update Guest' : 'Add Guest'}
          />
        </View>
      </UniversalModal>

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

const createStyles = (colors: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingBottom: 40,
    },
    headerAction: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: `${colors.onPrimary}55`,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
    },
    headerActionText: {
      marginLeft: 6,
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 12,
    },
    toolsCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 10,
      color: colors.text,
      fontFamily: FONT_FAMILY.normal,
    },
    filterRow: {
      marginTop: 14,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
    },
    filterChipTextActive: {
      color: colors.onPrimary,
    },
    playerCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    playerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    avatarWrap: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarLabel: {
      color: colors.primary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
    },
    playerInfo: {
      flex: 1,
    },
    playerName: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 16,
    },
    playerMeta: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 12,
    },
    starButton: {
      padding: 6,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    detailText: {
      marginLeft: 10,
      flex: 1,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 13,
    },
    actionRow: {
      marginTop: 12,
      flexDirection: 'row',
      gap: 10,
    },
    secondaryAction: {
      flex: 1,
      minHeight: 44,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    secondaryActionText: {
      marginLeft: 6,
      color: colors.primary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
    },
    dangerAction: {
      flex: 1,
      minHeight: 44,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: `${colors.danger}35`,
      backgroundColor: `${colors.danger}12`,
    },
    dangerActionText: {
      marginLeft: 6,
      color: colors.danger,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
    },
    searchResultCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchResultTextWrap: {
      flex: 1,
    },
    searchResultName: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
    },
    searchResultSubtitle: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 12,
    },
    chargeText: {
      color: colors.primary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
    },
    modalContent: {
      padding: 24,
      gap: 12,
    },
    modalTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 18,
    },
    modalSubtitle: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontFamily: FONT_FAMILY.normal,
    },
    skeletonWrap: {
      paddingHorizontal: 16,
    },
    skeletonAvatar: {
      width: 46,
      height: 46,
      borderRadius: 15,
      marginRight: 12,
    },
    skeletonLineWide: {
      width: '78%',
      height: 14,
      borderRadius: 8,
      marginBottom: 10,
    },
    skeletonLineShort: {
      width: '42%',
      height: 14,
      borderRadius: 8,
    },
    flexOne: {
      flex: 1,
    },
  });

export default Players;
