import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Dropdown } from 'react-native-element-dropdown';
import moment from 'moment';
import lodash from 'lodash';

import Header from '../../components/Header';
import NewButton from '../../components/Button';
import PickPlayers from './PickPlayers';
import BookingHeroCard from '../../components/booking/BookingHeroCard';
import DetailSection from '../../components/booking/DetailSection';
import AppAlertModal from '../../components/feedback/AppAlertModal';
import { CustomCheckbox } from '../../components/CustomCheckBox';
import UniversalModal from '../../components/UniversalModal';
import { useAppAlert } from '../../hooks/useAppAlert';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { usePlayers, usePlayersQuery } from '../../services/Activity/FacilityService';
import { AppStackParamList } from '../../navigation/AppDrawer';
import { RootState } from '../../store/store';
import { useSelector } from 'react-redux';
import { FONT_FAMILY } from '../../util/colors';
import { ENDPOINT } from '../../util/constant';
import * as api from '../../util/api';

type Props = NativeStackScreenProps<AppStackParamList, 'ChoosePlayer'>;

const formatSlotTime = (value: string) => {
  if (!value) {
    return 'Time unavailable';
  }

  const [start, end] = String(value).split(' to ');
  if (start && end) {
    return `${moment(start, 'HH:mm').format('hh:mm A')} - ${moment(
      end,
      'HH:mm',
    ).format('hh:mm A')}`;
  }

  return value;
};

const ChoosePlayer: React.FC<Props> = ({ route, navigation }) => {
  const userData = useSelector((state: RootState) => state.auth);
  const params: any = route.params;
  const { colors } = useAppTheme();
  const { alertState, showAlert, hideAlert } = useAppAlert();

  const facility = params?.facility || {};
  const [search, setSearch] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedGameType, setSelectedGameType] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>(params?.slots || []);
  const [searchPlayer, setSearchPlayer] = useState(false);
  const [agree, setAgree] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [loading, setLoading] = useState(false);

  const { guestQuery, gameQuery } = usePlayers(
    1,
    debouncedSearch,
    facility?.id,
    userData,
  );
  const { playersQuery: playerLibraryQuery } = usePlayersQuery(
    userData,
    false,
    false,
    false,
  );

  useEffect(() => {
    const handler = lodash.debounce(() => setDebouncedSearch(search), 350);
    handler();
    return () => handler.cancel();
  }, [search]);

  const slotCount = slots.length;
  const selectedPlayerCount = useMemo(
    () =>
      slots.reduce(
        (total, item) => total + (Array.isArray(item?.players) ? item.players.length : 0),
        0,
      ),
    [slots],
  );

  const baseAmount = useMemo(
    () => Number(facility?.charge || 0) * slotCount,
    [facility?.charge, slotCount],
  );

  const guestTotal = useMemo(
    () =>
      slots.reduce((total, item) => {
        const playerTotal =
          item?.players?.reduce(
            (acc: number, player: any) => acc + Number(player?.charge || 0),
            0,
          ) || 0;
        return total + playerTotal;
      }, 0),
    [slots],
  );

  const subTotal = baseAmount + guestTotal;
  const gstAmount = Number(facility?.GSTper || 0)
    ? (subTotal * Number(facility?.GSTper || 0)) / 100
    : 0;
  const payableAmount = Number(subTotal + gstAmount).toFixed(2);

  const handleBookFacility = async () => {
    if (!agree) {
      showAlert({
        title: 'Accept terms first',
        message: 'Please review and accept the booking terms before checkout.',
        tone: 'warning',
      });
      return;
    }

    if (!slotCount) {
      showAlert({
        title: 'No slot selected',
        message: 'Please keep at least one slot in your booking.',
        tone: 'warning',
      });
      return;
    }

    if (slots.some(item => !Array.isArray(item?.players) || item.players.length === 0)) {
      showAlert({
        title: 'Players missing',
        message: 'Each selected slot must have at least one player.',
        tone: 'warning',
      });
      return;
    }

    const apiobject = {
      path: ENDPOINT.book_facilities,
      body: {
        memberId: userData?.user?.MemberID,
        slots,
        session_id: params?.session?.id,
        facility_id: facility?.id,
        charge: facility?.charge,
        guest_total_amount: guestTotal,
        facility_gst_per: facility?.GSTper,
        facility_gst_amt: Number(gstAmount.toFixed(2)),
        game_type_id: selectedGameType?.id || null,
        payble_amount: Number(payableAmount),
      },
      Token: userData?.token,
    };

    try {
      setLoading(true);
      const response = await api.javascriptPost(apiobject);
      setLoading(false);

      if (response?.status && response?.data?.order_id) {
        navigation.navigate('UniversalPayment', {
          orderData: response.data,
          type: 'Activity',
        });
        return;
      }

      showAlert({
        title: 'Booking unavailable',
        message: response?.message || 'Unable to reserve the activity right now.',
        tone: 'danger',
      });
    } catch (error) {
      setLoading(false);
      showAlert({
        title: 'Booking failed',
        message: 'A network issue interrupted the activity booking request.',
        tone: 'danger',
      });
    }
  };

  const gameTypes = gameQuery?.data?.data?.gameTypes || [];
  const dropdownContainerStyle = useMemo(
    () => ({
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
    }),
    [colors.border, colors.surface],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Activity Booking" />

      <ScrollView contentContainerStyle={styles.content}>
        <BookingHeroCard
          eyebrow="Activity Checkout"
          title={facility?.name || 'Facility booking'}
          subtitle={`${params?.session?.session_name || 'Session'} • ${slotCount} ${
            slotCount === 1 ? 'slot' : 'slots'
          } selected`}
          status={selectedPlayerCount ? 'In progress' : 'Awaiting players'}
          statusTone={selectedPlayerCount ? 'success' : 'warning'}
          meta={[
            { label: 'Base rate', value: `Rs. ${Number(facility?.charge || 0).toFixed(2)}` },
            { label: 'Players', value: String(selectedPlayerCount) },
            {
              label: 'Payable',
              value: `Rs. ${payableAmount}`,
              tone: 'neutral',
            },
          ]}
        />

        <DetailSection
          title="Booking setup"
          subtitle="Choose the game type first so the player count and guest rules stay aligned."
          delay={40}
        >
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Game type</Text>
          <Dropdown
            style={[
              styles.dropdown,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
            placeholderStyle={[styles.dropdownPlaceholder, { color: colors.textMuted }]}
            selectedTextStyle={[styles.dropdownValue, { color: colors.text }]}
            containerStyle={dropdownContainerStyle}
            itemTextStyle={{ color: colors.text, fontFamily: FONT_FAMILY.normal }}
            data={gameTypes}
            maxHeight={280}
            labelField="name"
            valueField="id"
            placeholder="Select game type"
            value={selectedGameType?.id}
            onChange={item => {
              setSelectedGameType(item);
              setSlots(prev => prev.map(slot => ({ ...slot, players: null })));
            }}
            renderItem={item => (
              <View style={styles.dropdownItem}>
                <Text style={[styles.dropdownItemText, { color: colors.text }]}>
                  {item.name}
                </Text>
                <Text style={[styles.dropdownItemMeta, { color: colors.textMuted }]}>
                  {item.no_of_players} {item.no_of_players > 1 ? 'players' : 'player'}
                </Text>
              </View>
            )}
          />
        </DetailSection>

        <DetailSection
          title="Selected slots"
          subtitle="Each slot needs players before you continue to payment."
          delay={70}
        >
          {slots.map((item, index) => {
            const players = Array.isArray(item?.players) ? item.players : [];
            return (
              <View
                key={`${item?.day?.id || index}-${item?.time?.slot_id || index}`}
                style={[
                  styles.slotCard,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.slotHeader}>
                  <View style={styles.flexOne}>
                    <Text style={[styles.slotTitle, { color: colors.text }]}>
                      {moment(item?.day?.session_date).format('ddd, DD MMM YYYY')}
                    </Text>
                    <Text style={[styles.slotMeta, { color: colors.textMuted }]}>
                      {formatSlotTime(item?.time?.name)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}14` }]}>
                    <Text style={[styles.statusText, { color: colors.primary }]}>
                      {players.length
                        ? `${players.length} selected`
                        : 'Players pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.inlineMetrics}>
                  <View style={[styles.metricTile, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.metricValue, { color: colors.text }]}>1</Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>slot</Text>
                  </View>
                  <View style={[styles.metricTile, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                      Rs. {Number(facility?.charge || 0).toFixed(0)}
                    </Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>facility</Text>
                  </View>
                  <View style={[styles.metricTile, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                      Rs.{' '}
                      {players
                        .reduce((total: number, player: any) => total + Number(player?.charge || 0), 0)
                        .toFixed(0)}
                    </Text>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>players</Text>
                  </View>
                </View>

                {players.length ? (
                  <View style={styles.playerList}>
                    {players.map((player: any, playerIndex: number) => (
                      <View
                        key={`${player?.MemberID || player?.DisplayName}-${playerIndex}`}
                        style={[
                          styles.playerCard,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.flexOne}>
                          <Text style={[styles.playerName, { color: colors.text }]}>
                            {player.DisplayName}
                          </Text>
                          <Text style={[styles.playerMeta, { color: colors.textMuted }]}>
                            {player.occupant_id === 2 ? 'Non-member' : player.MemberID}
                          </Text>
                        </View>
                        <Text style={[styles.playerCharge, { color: colors.primary }]}>
                          Rs. {Number(player?.charge || 0).toFixed(0)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No players added yet for this slot.
                  </Text>
                )}

                <View style={styles.slotActions}>
                  <Pressable
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      slotCount !== 1
                        ? setSlots(slots.filter((slotItem, slotIndex) => slotIndex !== index))
                        : navigation.goBack();
                    }}
                    style={[
                      styles.secondaryAction,
                      { backgroundColor: `${colors.danger}14`, borderColor: `${colors.danger}30` },
                    ]}
                  >
                    <Text style={[styles.secondaryActionLabel, { color: colors.danger }]}>
                      Remove slot
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (!selectedGameType) {
                        showAlert({
                          title: 'Game type required',
                          message: 'Select the game type before choosing players.',
                          tone: 'warning',
                        });
                        return;
                      }

                      if (players.length) {
                        setSlots(prev =>
                          prev.map((slot, slotIndex) =>
                            slotIndex === index ? { ...slot, players: null } : slot,
                          ),
                        );
                        return;
                      }

                      setSelectedSlot(item);
                      setSearchPlayer(true);
                    }}
                    style={[
                      styles.primaryAction,
                      { backgroundColor: players.length ? colors.surface : colors.secondary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.primaryActionLabel,
                        { color: players.length ? colors.text : colors.onPrimary },
                      ]}
                    >
                      {players.length ? 'Clear players' : 'Add players'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </DetailSection>

        <DetailSection
          title="Payment summary"
          subtitle="The backend fields for GST, facility charge, guest amount, and payable total will be posted exactly from this breakdown."
          delay={100}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Facility total</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              Rs. {baseAmount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Guest/player total</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              Rs. {guestTotal.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              GST ({Number(facility?.GSTper || 0)}%)
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              Rs. {gstAmount.toFixed(2)}
            </Text>
          </View>
          <View
            style={[
              styles.totalRow,
              { borderTopColor: colors.border },
            ]}
          >
            <Text style={[styles.totalLabel, { color: colors.text }]}>Grand total</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>
              Rs. {payableAmount}
            </Text>
          </View>
        </DetailSection>

        <DetailSection
          title="Terms and confirmation"
          subtitle="Review the cancellation policy before checkout."
          delay={130}
        >
          <Pressable style={styles.termsRow} onPress={() => setShowPolicies(true)}>
            <CustomCheckbox
              onToggle={() => setShowPolicies(true)}
              checked={agree}
              color={colors.secondary}
            />
            <Text style={[styles.termsText, { color: colors.textMuted }]}>
              I agree to the
              <Text style={[styles.termsLink, { color: colors.primary }]}> booking terms and cancellation policy</Text>
            </Text>
          </Pressable>
        </DetailSection>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.flexOne}>
          <Text style={[styles.footerAmount, { color: colors.text }]}>Rs. {payableAmount}</Text>
          <Text style={[styles.footerMeta, { color: colors.textMuted }]}>
            {slotCount} {slotCount === 1 ? 'slot' : 'slots'} • {selectedPlayerCount} players
          </Text>
        </View>
        <NewButton text="Proceed to pay" loading={loading} onPress={handleBookFacility} />
      </View>

      <UniversalModal
        visible={showPolicies}
        setVisible={setShowPolicies}
        title="Terms & Conditions"
      >
        <View style={styles.policyBody}>
          <Text style={[styles.policyTitle, { color: colors.danger }]}>Cancellation policy</Text>
          <Text style={[styles.policyText, { color: colors.textMuted }]}>
            Plans can change, but facility usage is reserved slot by slot. Cancellation and
            refund charges will apply as per the configured club policy for this activity.
          </Text>
          <View style={styles.policyAction}>
            <NewButton
              text="Accept"
              onPress={() => {
                setAgree(true);
                setShowPolicies(false);
              }}
            />
          </View>
        </View>
      </UniversalModal>

      {searchPlayer ? (
        <PickPlayers
          facility={facility}
          searchPlayer={searchPlayer}
          setSearchPlayer={setSearchPlayer}
          guestQuery={guestQuery}
          playerLibraryQuery={playerLibraryQuery}
          setSlot={setSlots}
          slots={slots}
          search={search}
          setSearch={setSearch}
          selectedSlot={selectedSlot}
          setSelectedSlot={setSelectedSlot}
          selectedGameType={selectedGameType}
        />
      ) : null}

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
  flexOne: {
    flex: 1,
  },
  content: {
    paddingBottom: 130,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    marginBottom: 8,
  },
  dropdown: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  dropdownPlaceholder: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.normal,
  },
  dropdownValue: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
  },
  dropdownItemMeta: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONT_FAMILY.normal,
  },
  slotCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  slotTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
  },
  slotMeta: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: FONT_FAMILY.normal,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
  },
  inlineMetrics: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  metricTile: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
  },
  metricValue: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 11,
    textTransform: 'uppercase',
    fontFamily: FONT_FAMILY.normal,
  },
  playerList: {
    marginTop: 14,
    gap: 10,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  playerName: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
  },
  playerMeta: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: FONT_FAMILY.normal,
  },
  playerCharge: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
  },
  emptyText: {
    marginTop: 14,
    fontSize: 13,
    fontFamily: FONT_FAMILY.normal,
  },
  slotActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryActionLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
  },
  primaryAction: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryActionLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.normal,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
  },
  totalRow: {
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
  },
  totalAmount: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.normal,
  },
  termsLink: {
    fontFamily: FONT_FAMILY.semiBold,
    textDecorationLine: 'underline',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerAmount: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bold,
  },
  footerMeta: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONT_FAMILY.normal,
  },
  policyBody: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  policyTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
  },
  policyText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FONT_FAMILY.normal,
  },
  policyAction: {
    marginTop: 18,
    alignItems: 'flex-end',
  },
});

export default ChoosePlayer;
