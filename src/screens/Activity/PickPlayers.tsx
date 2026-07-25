import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Entypo';

import UniversalModal from '../../components/UniversalModal';
import NewButton from '../../components/Button';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { useAppAlert } from '../../hooks/useAppAlert';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { RootState } from '../../store/store';
import { ENDPOINT } from '../../util/constant';
import { javascriptPost } from '../../util/api';
import { FONT_FAMILY } from '../../util/colors';

type Player = {
  id?: number | string;
  DisplayName?: string;
  MemberID?: string | null;
  charge?: number | string;
  occupant_id?: number | string;
  mobile?: string;
  email?: string;
  is_favorite?: number | string;
  played_count?: number | string;
  last_played_at?: string | null;
  source?: string;
};

const playerKey = (item: Player) =>
  String(
    item?.MemberID ||
      item?.mobile ||
      item?.email ||
      item?.DisplayName ||
      item?.id ||
      '',
  )
    .trim()
    .toLowerCase();

const dedupePlayers = (players: Player[]) => {
  const seen = new Set<string>();

  return players.filter(item => {
    const key = playerKey(item);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const PickPlayers: React.FC<any> = ({
  searchPlayer = false,
  setSearchPlayer,
  selectedGameType,
  guestQuery,
  playerLibraryQuery,
  selectedSlot,
  setSelectedSlot,
  setSlot,
  slots,
  search,
  setSearch,
}) => {
  const userData = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [isGuestFormVisible, setIsGuestFormVisible] = useState(false);
  const [addNewPlayer, setAddNewPlayer] = useState({
    name: '',
    email: '',
    mobile: '',
  });
  const [savingGuest, setSavingGuest] = useState(false);
  const styles = useMemo(() => createStyles(), []);

  useEffect(() => {
    setSelectedPlayers(Array.isArray(selectedSlot?.players) ? selectedSlot.players : []);
  }, [selectedSlot]);

  const maxPlayers = Number(selectedGameType?.no_of_players || 0);
  const availablePlayers = Array.isArray(guestQuery?.data?.data?.data)
    ? guestQuery.data.data.data
    : [];
    console.log( availablePlayers, '---------------------- availablePlayers ---------------------');
  const playerLibrary = useMemo(() => {
    const libraryResponse = playerLibraryQuery?.data || {};
    const savedPlayers = Array.isArray(libraryResponse?.data) ? libraryResponse.data : [];
    const favoritePlayers = Array.isArray(libraryResponse?.favorites)
      ? libraryResponse.favorites
      : [];
    const recentPlayers = Array.isArray(libraryResponse?.recent_players)
      ? libraryResponse.recent_players
      : [];
    const guestPlayers = Array.isArray(libraryResponse?.guest_players)
      ? libraryResponse.guest_players
      : savedPlayers.filter((item: Player) => Number(item?.occupant_id) === 2);

    return {
      savedPlayers,
      favoritePlayers,
      recentPlayers,
      guestPlayers,
    };
  }, [playerLibraryQuery?.data]);

  const isSelectionComplete = !!maxPlayers && selectedPlayers.length === maxPlayers;
  const guestSummary = useMemo(
    () =>
      selectedPlayers.reduce((total, item) => total + Number(item?.charge || 0), 0),
    [selectedPlayers],
  );

  const selectedKeys = useMemo(
    () => new Set(selectedPlayers.map(player => playerKey(player))),
    [selectedPlayers],
  );

  const suggestedSections = useMemo(() => {
    const favorites = dedupePlayers(
      playerLibrary.favoritePlayers.filter(item => !selectedKeys.has(playerKey(item))),
    );
    const recent = dedupePlayers(
      playerLibrary.recentPlayers.filter(
        item =>
          !selectedKeys.has(playerKey(item)) &&
          !favorites.some(favorite => playerKey(favorite) === playerKey(item)),
      ),
    );
    const guests = dedupePlayers(
      playerLibrary.guestPlayers.filter(
        item =>
          !selectedKeys.has(playerKey(item)) &&
          !favorites.some(favorite => playerKey(favorite) === playerKey(item)) &&
          !recent.some(recentItem => playerKey(recentItem) === playerKey(item)),
      ),
    );

    return [
      {
        key: 'favorites',
        title: 'Favorite players',
        subtitle: 'Fastest picks from your saved favorites.',
        data: favorites.slice(0, 6),
      },
      {
        key: 'recent',
        title: 'Previously played',
        subtitle: 'Players from your recent activity bookings.',
        data: recent.slice(0, 6),
      },
      {
        key: 'guests',
        title: 'Guest players',
        subtitle: 'Saved non-member players ready for reuse.',
        data: guests.slice(0, 8),
      },
    ].filter(section => section.data.length);
  }, [playerLibrary, selectedKeys]);

  const closeModal = () => {
    setSelectedPlayers([]);
    setSelectedSlot(null);
    setSearch('');
    setSearchPlayer(false);
    setIsGuestFormVisible(false);
  };

  const handlePlayerSelect = (item: Player) => {
    if (!selectedGameType) {
      showAlert({
        title: 'Game type required',
        message: 'Please select a game type before choosing players.',
        tone: 'warning',
      });
      return;
    }

    if (selectedPlayers.length >= maxPlayers) {
      showAlert({
        title: 'Player limit reached',
        message: `You can only select up to ${maxPlayers} player${maxPlayers > 1 ? 's' : ''}.`,
        tone: 'warning',
      });
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedPlayers(prev => [
      {
        DisplayName: item.DisplayName,
        MemberID: item.MemberID || null,
        charge: Number(item.charge || 0),
        occupant_id: Number(item.occupant_id || 1),
        mobile: item.mobile,
        email: item.email,
        is_favorite: Number(item.is_favorite || 0),
      },
      ...prev,
    ]);
  };

  const handleDeletePlayer = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedPlayers(prev => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleAddNewGuest = async () => {
    if (!addNewPlayer.name.trim()) {
      showAlert({
        title: 'Name required',
        message: 'Enter the guest name before saving.',
        tone: 'warning',
      });
      return;
    }

    if (!/^[0-9]{10}$/.test(addNewPlayer.mobile)) {
      showAlert({
        title: 'Invalid mobile number',
        message: 'Please enter a valid 10-digit mobile number.',
        tone: 'warning',
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addNewPlayer.email)) {
      showAlert({
        title: 'Invalid email',
        message: 'Please enter a valid email address for the guest.',
        tone: 'warning',
      });
      return;
    }

    const apiobject = {
      path: ENDPOINT.create_activity_guest,
      body: {
        name: addNewPlayer.name,
        email: addNewPlayer.email,
        mobile: addNewPlayer.mobile,
        game_type: selectedGameType?.id,
        occupant_id: 2,
      },
      Token: userData?.token,
    };

    try {
      setSavingGuest(true);
      const response = await javascriptPost(apiobject);
      setSavingGuest(false);

      if (response?.success) {
        setAddNewPlayer({ name: '', email: '', mobile: '' });
        setIsGuestFormVisible(false);
        guestQuery?.refetch?.();
        playerLibraryQuery?.refetch?.();
        showAlert({
          title: 'Guest added',
          message: response?.message || 'The guest player was saved successfully.',
          tone: 'success',
        });
        return;
      }

      if (response?.message && typeof response.message === 'object') {
        const firstError = Object.values(response.message).flat().find(Boolean);
        showAlert({
          title: 'Unable to save guest',
          message: String(firstError || 'Please review the guest details and try again.'),
          tone: 'danger',
        });
        return;
      }

      showAlert({
        title: 'Unable to save guest',
        message: response?.message || 'Please review the guest details and try again.',
        tone: 'danger',
      });
    } catch (error) {
      setSavingGuest(false);
      showAlert({
        title: 'Guest creation failed',
        message: 'A network issue interrupted the guest creation request.',
        tone: 'danger',
      });
    }
  };

  const handleProceedPlayers = () => {
    setSlot(
      slots.map((item: any) => {
        if (
          item?.day?.id === selectedSlot?.day?.id &&
          item?.time?.id === selectedSlot?.time?.id
        ) {
          return {
            ...item,
            players: selectedPlayers,
            game_type_id: selectedGameType?.id,
          };
        }

        return item;
      }),
    );

    closeModal();
  };

  const renderSelectedPlayer = (item: Player, index: number) => (
    <View
      key={`${playerKey(item)}-${index}`}
      style={[
        styles.selectedPlayerCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.flexOne}>
        <Text style={[styles.selectedPlayerName, { color: colors.text }]}>
          {item.DisplayName}
        </Text>
        <Text style={[styles.selectedPlayerMeta, { color: colors.textMuted }]}>
          {Number(item.occupant_id) === 2 ? 'Guest player' : item.MemberID || 'Member player'}
        </Text>
      </View>
      <Text style={[styles.selectedPlayerCharge, { color: colors.primary }]}>
        Rs. {Number(item?.charge || 0).toFixed(0)}
      </Text>
      <Pressable onPress={() => handleDeletePlayer(index)} hitSlop={10}>
        <Icon name="circle-with-minus" size={18} color={colors.danger} />
      </Pressable>
    </View>
  );

  const renderSuggestionCard = (item: Player) => {
    const badgeText =
      item.source === 'favorite'
        ? 'Favorite'
        : item.source === 'recent'
        ? `${Number(item.played_count || 1)} plays`
        : Number(item.occupant_id) === 2
        ? 'Guest'
        : 'Saved';
console.log( item, '---------------------- item ---------------------');
    return (
      <Pressable
        key={`${item.source}-${playerKey(item)}`}
        onPress={() => handlePlayerSelect(item)}
        style={[
          styles.suggestionCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.suggestionHeader}>
          <View style={styles.flexOne}>
            <Text style={[styles.memberName, { color: colors.text }]}>
              {item.DisplayName}
            </Text>
            <Text style={[styles.memberMeta, { color: colors.textMuted }]}>
              {
              Number(item.occupant_id) === 2
                ? 'Guest player'
                : item.MemberID || 'Member player'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>
              {badgeText}
            </Text>
          </View>
        </View>

        <View style={styles.suggestionFooter}>
          <Text style={[styles.memberPrice, { color: colors.primary }]}>
            Rs. {Number(item?.charge || 0).toFixed(0)}
          </Text>
          <View style={styles.addInline}>
            <Text style={[styles.addInlineText, { color: colors.primary }]}>Add</Text>
            <Icon name="plus" size={16} color={colors.primary} />
          </View>
        </View>
      </Pressable>
    );
  };

  const renderMembers = ({ item }: { item: Player }) => {
  
    return (
      <Pressable
        // onPress={() => handlePlayerSelect(item)}
        style={[
          styles.memberCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.flexOne}>
          <Text style={[styles.memberName, { color: colors.text }]}>
            {item.DisplayName}
          </Text>
          <Text style={[styles.memberMeta, { color: colors.textMuted }]}>
            {Number(item.occupant_id) === 2 ? 'Guest player' : item.MemberID || 'Member player'}
          </Text>
        </View>
        <View style={styles.memberPriceWrap}>
          <Text style={[styles.memberPrice, { color: colors.placeholder }]}>
            Rs. {Number(item?.charge || 0).toFixed(0)}
          </Text>
          <Icon name="plus" size={18} color={colors.primary} />
        </View>
      </Pressable>
    );
  };

  const showSuggestions = !isGuestFormVisible && !search.trim();

  return (
    <UniversalModal
      visible={searchPlayer}
      title="Choose Players"
      isFull
      setVisible={visible => {
        if (!visible) {
          closeModal();
        }
      }}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.summaryHeader}>
            <View style={styles.flexOne}>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>
                Player selection
              </Text>
              <Text style={[styles.summarySubtitle, { color: colors.textMuted }]}>
                {selectedPlayers.length}/{maxPlayers || 0} selected for this slot
              </Text>
            </View>
            {isSelectionComplete ? (
              <NewButton text="Use players" onPress={handleProceedPlayers} />
            ) : null}
          </View>

          <View style={styles.metricsRow}>
            <View style={[styles.metricChip, { backgroundColor: colors.surface }]}>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {selectedPlayers.length}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>players</Text>
            </View>
            <View style={[styles.metricChip, { backgroundColor: colors.surface }]}>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                Rs. {guestSummary.toFixed(0)}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>charges</Text>
            </View>
            <View style={[styles.metricChip, { backgroundColor: colors.surface }]}>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {selectedGameType?.name || 'Game'}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>type</Text>
            </View>
          </View>

          {selectedPlayers.length ? (
            <View style={styles.selectedList}>
              {selectedPlayers.map((item, index) => renderSelectedPlayer(item, index))}
            </View>
          ) : (
            <Text style={[styles.emptySelection, { color: colors.textMuted }]}>
              Open suggestions below to quickly add favorite, recent, or guest players for this slot.
            </Text>
          )}
        </View>

        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setIsGuestFormVisible(false)}
            style={[
              styles.tabButton,
              {
                backgroundColor: !isGuestFormVisible ? colors.primary : colors.surfaceAlt,
              },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: !isGuestFormVisible ? colors.onPrimary : colors.text },
              ]}
            >
              Select players
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setIsGuestFormVisible(true)}
            style={[
              styles.tabButton,
              {
                backgroundColor: isGuestFormVisible ? colors.primary : colors.surfaceAlt,
              },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: isGuestFormVisible ? colors.onPrimary : colors.text },
              ]}
            >
              Add guest
            </Text>
          </Pressable>
        </View>

        {isGuestFormVisible ? (
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.formTitle, { color: colors.text }]}>
              Guest player details
            </Text>
            <Text style={[styles.formSubtitle, { color: colors.textMuted }]}>
              Create a guest once and it will also appear in your future booking suggestions.
            </Text>
            <TextInput
              value={addNewPlayer.name}
              placeholder="Enter guest name"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              onChangeText={text => setAddNewPlayer(prev => ({ ...prev, name: text }))}
            />
            <TextInput
              value={addNewPlayer.mobile}
              placeholder="Enter guest mobile"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              onChangeText={text => setAddNewPlayer(prev => ({ ...prev, mobile: text }))}
              keyboardType="number-pad"
              maxLength={10}
            />
            <TextInput
              value={addNewPlayer.email}
              placeholder="Enter guest email"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              onChangeText={text => setAddNewPlayer(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <NewButton text="Save guest" loading={savingGuest} onPress={handleAddNewGuest} />
          </View>
        ) : (
          <>
            <TextInput
              value={search}
              placeholder="Search by member name or member ID"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                styles.searchInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              onChangeText={text => setSearch(text)}
            />

            {showSuggestions ? (
              <View style={styles.sectionList}>
                {suggestedSections.length ? (
                  suggestedSections.map(section => (
                    <View key={section.key} style={styles.sectionBlock}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        {section.title}
                      </Text>
                      <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                        {section.subtitle}
                      </Text>
                      <View style={styles.suggestionList}>
                        {section.data.map(renderSuggestionCard)}
                      </View>
                    </View>
                  ))
                ) : (
                  <View
                    style={[
                      styles.formCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.formTitle, { color: colors.text }]}>
                      No quick suggestions yet
                    </Text>
                    <Text style={[styles.formSubtitle, { color: colors.textMuted }]}>
                      Search members above or add a guest player to start building smarter suggestions here.
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <FlatList
                data={availablePlayers}
                renderItem={renderMembers}
                keyExtractor={(item, index) =>
                  String(item?.MemberID || item?.DisplayName || item?.mobile || index)
                }
                scrollEnabled={false}
                ListEmptyComponent={
                  <Text style={[styles.emptyResults, { color: colors.textMuted }]}>
                    {guestQuery?.isLoading ? 'Searching players...' : 'No matching players found.'}
                  </Text>
                }
                contentContainerStyle={styles.listContent}
              />
            )}
          </>
        )}
      </ScrollView>

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
    </UniversalModal>
  );
};

const createStyles = () =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    flexOne: {
      flex: 1,
    },
    summaryCard: {
      borderWidth: 1,
      borderRadius: 22,
      padding: 16,
    },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    summaryTitle: {
      fontSize: 18,
      fontFamily: FONT_FAMILY.bold,
    },
    summarySubtitle: {
      marginTop: 4,
      fontSize: 13,
      fontFamily: FONT_FAMILY.normal,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
    },
    metricChip: {
      flex: 1,
      borderRadius: 16,
      padding: 12,
    },
    metricValue: {
      fontSize: 14,
      fontFamily: FONT_FAMILY.bold,
    },
    metricLabel: {
      marginTop: 4,
      fontSize: 11,
      textTransform: 'uppercase',
      fontFamily: FONT_FAMILY.normal,
    },
    selectedList: {
      marginTop: 14,
      gap: 10,
    },
    selectedPlayerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,
      gap: 10,
    },
    selectedPlayerName: {
      fontSize: 14,
      fontFamily: FONT_FAMILY.semiBold,
    },
    selectedPlayerMeta: {
      marginTop: 4,
      fontSize: 12,
      fontFamily: FONT_FAMILY.normal,
    },
    selectedPlayerCharge: {
      fontSize: 13,
      fontFamily: FONT_FAMILY.semiBold,
    },
    emptySelection: {
      marginTop: 16,
      fontSize: 13,
      lineHeight: 19,
      fontFamily: FONT_FAMILY.normal,
    },
    tabRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
      marginBottom: 12,
    },
    tabButton: {
      flex: 1,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
    },
    tabLabel: {
      fontSize: 13,
      fontFamily: FONT_FAMILY.semiBold,
    },
    formCard: {
      borderWidth: 1,
      borderRadius: 22,
      padding: 16,
    },
    formTitle: {
      fontSize: 16,
      fontFamily: FONT_FAMILY.bold,
      marginBottom: 6,
    },
    formSubtitle: {
      fontSize: 13,
      fontFamily: FONT_FAMILY.normal,
      lineHeight: 19,
      marginBottom: 14,
    },
    input: {
      minHeight: 52,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 14,
      fontSize: 14,
      fontFamily: FONT_FAMILY.normal,
      marginBottom: 12,
    },
    searchInput: {
      marginBottom: 10,
    },
    listContent: {
      paddingBottom: 24,
    },
    memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 18,
      padding: 14,
      marginBottom: 10,
    },
    memberName: {
      fontSize: 14,
      fontFamily: FONT_FAMILY.semiBold,
    },
    memberMeta: {
      marginTop: 4,
      fontSize: 12,
      fontFamily: FONT_FAMILY.normal,
    },
    memberPriceWrap: {
      alignItems: 'flex-end',
      gap: 4,
    },
    memberPrice: {
      fontSize: 13,
      fontFamily: FONT_FAMILY.bold,
    },
    emptyResults: {
      textAlign: 'center',
      fontSize: 13,
      fontFamily: FONT_FAMILY.normal,
      marginTop: 28,
    },
    sectionList: {
      gap: 16,
      paddingBottom: 12,
    },
    sectionBlock: {
      gap: 10,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: FONT_FAMILY.bold,
    },
    sectionSubtitle: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.normal,
      lineHeight: 18,
    },
    suggestionList: {
      gap: 10,
    },
    suggestionCard: {
      borderWidth: 1,
      borderRadius: 18,
      padding: 14,
    },
    suggestionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
    },
    badgeText: {
      fontSize: 11,
      fontFamily: FONT_FAMILY.semiBold,
    },
    suggestionFooter: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    addInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    addInlineText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.semiBold,
    },
  });

export default PickPlayers;
