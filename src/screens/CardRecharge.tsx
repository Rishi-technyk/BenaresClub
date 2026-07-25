import React, { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card } from 'react-native-paper';
import moment from 'moment';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import Header from '../components/Header';
import DatePickerComponent from '../components/DatePicker';
import NewButton from '../components/Button';
import UniversalModal from '../components/UniversalModal';
import AIFilter from '../components/AIFilter';
import { askFinancialAi, useRechargeDashboard } from '../services/ViewStatementService';
import { javascriptPost } from '../util/api';
import { ENDPOINT } from '../util/constant';
import { useAppTheme } from '../theme/AppThemeProvider';
import { FONT_FAMILY } from '../util/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/AppDrawer';
import { RootState } from '../store/store';
import AppAlertModal from '../components/feedback/AppAlertModal';
import { useAppAlert } from '../hooks/useAppAlert';
import LinearGradient from 'react-native-linear-gradient';



const initialFilters = {
  startDate: null,
  endDate: null,
  locations: [],
  payModes: [],
  transactionType: null,
  minAmount: null,
  maxAmount: null,
  search: '',
  sortKey: 'BillDate',
  sortDir: 'desc',
  limit: 150,
};

const currency = value => `₹${Number(value || 0).toFixed(2)}`;

type Props = NativeStackScreenProps<AppStackParamList, 'CardRecharge'>;
const CardRecharge:React.FC<Props> = ({ navigation, route }) => {
  const fallbackBalance = Number(route?.params || 0);
  const userData = useSelector((state: RootState) => state.auth);
  const { colors,resolvedMode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
console.log( resolvedMode, '---------------------- resolvedMode ---------------------');
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const { alertState, showAlert, hideAlert } = useAppAlert();

  const { data, isLoading, refetch } = useRechargeDashboard(filters, userData);

  const dashboard = data?.data || {};
  const summary = dashboard.summary || {};
  const analytics = dashboard.analytics || {};
  const cards = analytics.cards || {};
  // const highlights = analytics.highlights || {};
  const transactions = dashboard.transactions || [];
  const balance = summary.current_balance ?? cards.current_balance ?? fallbackBalance;
  const quickAmounts = [500, 1000, 2000, 5000];

  const activeFilterCount =
    (filters.locations?.length || 0) +
    (filters.payModes?.length || 0) +
    (filters.startDate && filters.endDate ? 1 : 0) +
    (filters.search ? 1 : 0) +
    (filters.transactionType ? 1 : 0);

  const toggleArrayValue = (key, item) => {
    setDraftFilters(prev => ({
      ...prev,
      [key]: prev[key]?.includes(item)
        ? prev[key].filter(value => value !== item)
        : [...(prev[key] || []), item],
    }));
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  };

  const applyFilters = () => {
    setFilters({
      ...draftFilters,
      search: draftFilters.search?.trim() || '',
    });
    setShowFilterModal(false);
  };

  const payNowAction = async () => {
    if (!amount || Number(amount) <= 0) {
      showAlert({
        title: 'Invalid amount',
        message: 'Please enter a valid recharge amount before continuing.',
        tone: 'warning',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await javascriptPost({
        path: ENDPOINT.create_recharge_pay_order,
        body: {
          amount: Number(amount),
          type: 'Card Recharge',
        },
        Token: userData?.token,
      });
   
      if (response?.data?.order_id || response?.data?.checkout || response?.data?.payment_url) {
        navigation.navigate('UniversalPayment', {
          type: 'Recharge',
          orderData: response.data,
        });
        setAmount('');
      } else {
        showAlert({
          title: 'Recharge unavailable',
          message: response?.message || 'Unable to create recharge order right now.',
          tone: 'danger',
        });
      }
    } catch (error) {
      showAlert({
        title: 'Recharge unavailable',
        message: 'Unable to start recharge right now.',
        tone: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAskAi = async prompt => {
    try {
      setAiLoading(true);
      const response = await askFinancialAi({
        contextType: 'recharge',
        prompt,
        filters,
        token: userData?.token,
      });

      setAiAnswer(response?.data?.answer || 'No recharge insight available yet.');
      showAlert({
        title: 'AI insight ready',
        message: 'Your recharge summary and suggestions are ready to review.',
        tone: 'success',
      });
    } catch (error) {
      showAlert({
        title: 'AI unavailable',
        message: 'Unable to fetch AI insight right now.',
        tone: 'danger',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const renderBreakdown = (items, emptyLabel) => {
    if (!items?.length) {
      return <Text style={styles.emptyText}>{emptyLabel}</Text>;
    }

    return items.slice(0, 5).map(item => (
      <View key={`${item.label}-${item.count}`} style={styles.breakdownRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.breakdownLabel}>{item.label}</Text>
          <Text style={styles.breakdownMeta}>{item.count} transactions</Text>
        </View>
        <Text style={styles.breakdownAmount}>{currency(item.amount)}</Text>
      </View>
    ));
  };

  const renderTransaction = ({ item }) => {
    const isCredit = Number(item.Amount) >= 0;

    return (
      <Card style={styles.transactionCard}>
        <View style={styles.transactionTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.transactionDate}>
              {moment(item.BillDate).format('DD MMM YYYY')}
            </Text>
            <Text style={styles.transactionTitle}>Txn #{item.BillNo}</Text>
          </View>
          <Text
            style={[
              styles.transactionAmount,
              { color: isCredit ? colors.success : colors.danger },
            ]}
          >
            {currency(Math.abs(item.Amount))}
          </Text>
        </View>
        <Text style={styles.transactionMeta}>{item.LocationName}</Text>
        <Text style={styles.transactionMeta}>
          {item.PayMode} • Balance {item.Balance}
        </Text>
      </Card>
    );
  };

  return (
    <View style={styles.screen}>


      <Header
        title="Card"
        OpenDropDawn={() => setShowFilterModal(true)}
        isMulti={true}
        isDawnload={true}
        type='Card'
      >
             {/* <View style={styles.rightControls}>

             <AIFilter onApply={handleAskAi} loading={aiLoading} title="Ask AI" />
             </View> */}

      </Header>

       
         
     
     
      

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
      >
       <View
            // colors={[colors.primary, colors.overlay]}
  //           colors={resolvedMode === 'dark'
  // ? ['#020617', '#0F172A', '#1E293B']
  // : ['#1E293B', '#334155', '#475569']}
  //           start={{ x: 0, y: 0 }}
  //           end={{ x: 1, y: 1 }}
            
            style={styles.heroCard}
          >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.eyebrow}>Current Card Balance</Text>
              <Text style={styles.heroValue}>{currency(balance)}</Text>
            </View>
            <View style={[styles.healthPill, { backgroundColor: balance >= 500 ? colors.success + '20' : colors.danger + '20' }]}>
              <Text style={[styles.healthPillText,{ color: balance >= 500 ? colors.success : colors.danger ,}]}>
                {balance >= 500 ? 'Healthy balance' : 'Low balance'}
              </Text>
            </View>
            
          </View>

          <View style={styles.rechargeRow}>
            <TextInput
              style={styles.rechargeInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter recharge amount"
              placeholderTextColor={colors.placeholder}
              keyboardType="decimal-pad"
            />
            <View style={{ width: 130 }}>
              <NewButton text="Recharge" loading={loading} onPress={payNowAction} />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {quickAmounts.map(item => (
              <TouchableOpacity
                key={item}
                style={styles.quickAmountChip}
                onPress={() => setAmount(String(item))}
              >
                <Text style={styles.quickAmountText}>{currency(item)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.metricsRow}>
          {/* <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Credits</Text>
            <Text style={styles.metricValue}>{currency(cards.credit_total)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Spends</Text>
            <Text style={styles.metricValue}>{currency(cards.debit_total)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Transactions</Text>
            <Text style={styles.metricValue}>{cards.transaction_count || 0}</Text>
          </View> */}
            <View style={styles.metricCard}>
                         <Text style={styles.metricLabel}>Payments may take a few minutes to reflect after a successful transaction.</Text>
                      </View>
        </View>

        {/* <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Highlights</Text>
          <Text style={styles.infoLine}>
            Largest recharge: <Text style={styles.infoStrong}>{currency(highlights.largest_recharge)}</Text>
          </Text>
          <Text style={styles.infoLine}>
            Largest spend: <Text style={styles.infoStrong}>{currency(highlights.largest_spend)}</Text>
          </Text>
          <Text style={styles.infoLine}>
            Average recharge: <Text style={styles.infoStrong}>{currency(highlights.average_recharge)}</Text>
          </Text>
          <Text style={styles.infoLine}>
            Average spend: <Text style={styles.infoStrong}>{currency(highlights.average_spend)}</Text>
          </Text>
        </View> */}

        {/* {aiAnswer ? (
          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <Icon name="robot-outline" size={18} color={colors.primary} />
              <Text style={styles.aiTitle}>AI Insight</Text>
            </View>
            <Text style={styles.aiText}>{aiAnswer}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment Mode Breakdown</Text>
          {renderBreakdown(analytics.payment_mode_breakdown, 'No payment mode data found.')}
        </View> */}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Top Locations</Text>
          {renderBreakdown(analytics.location_breakdown, 'No location data found.')}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recharge Activity</Text>
            <Text style={styles.sectionMeta}>
              {activeFilterCount ? `${activeFilterCount} filters active` : 'All activity'}
            </Text>
          </View>

          <FlatList
            scrollEnabled={false}
            data={transactions}
            keyExtractor={(item, index) => `${item.BillNo || 'txn'}-${index}`}
            renderItem={renderTransaction}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {isLoading ? 'Loading transactions...' : 'No recharge transactions found for the selected filters.'}
              </Text>
            }
          />
        </View>
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

      <UniversalModal
        visible={showFilterModal}
        setVisible={setShowFilterModal}
        isFull={true}
        title="Recharge Filters"
      >
        <View style={styles.modalSection}>
          <Text style={styles.modalLabel}>Date Range</Text>
          <DatePickerComponent
            placeholder={draftFilters.startDate || 'Start date'}
            stateDate={value => setDraftFilters(prev => ({ ...prev, startDate: value }))}
          />
          <DatePickerComponent
            placeholder={draftFilters.endDate || 'End date'}
            stateDate={value => setDraftFilters(prev => ({ ...prev, endDate: value }))}
          />
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.modalLabel}>Location</Text>
          <View style={styles.optionRow}>
            {(userData?.user?.location || []).map(item => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.optionChip,
                  draftFilters.locations.includes(item) ? styles.optionChipActive : null,
                ]}
                onPress={() => toggleArrayValue('locations', item)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    draftFilters.locations.includes(item) ? styles.optionChipTextActive : null,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.modalLabel}>Pay Mode</Text>
          <View style={styles.optionRow}>
            {(userData?.user?.paymode || []).map(item => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.optionChip,
                  draftFilters.payModes.includes(item) ? styles.optionChipActive : null,
                ]}
                onPress={() => toggleArrayValue('payModes', item)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    draftFilters.payModes.includes(item) ? styles.optionChipTextActive : null,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.modalLabel}>Transaction Type</Text>
          <View style={styles.optionRow}>
            {['credit', 'debit'].map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.optionChip,
                  draftFilters.transactionType === type ? styles.optionChipActive : null,
                ]}
                onPress={() =>
                  setDraftFilters(prev => ({
                    ...prev,
                    transactionType: prev.transactionType === type ? null : type,
                  }))
                }
              >
                <Text
                  style={[
                    styles.optionChipText,
                    draftFilters.transactionType === type ? styles.optionChipTextActive : null,
                  ]}
                >
                  {type === 'credit' ? 'Credits' : 'Debits'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.modalLabel}>Search</Text>
          <TextInput
            style={styles.filterInput}
            value={draftFilters.search}
            onChangeText={value => setDraftFilters(prev => ({ ...prev, search: value }))}
            placeholder="Search by txn no, location or pay mode"
            placeholderTextColor={colors.placeholder}
          />
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.modalLabel}>Amount Range</Text>
          <View style={styles.dualInputRow}>
            <TextInput
              style={[styles.filterInput, styles.dualInput]}
              value={draftFilters.minAmount ? String(draftFilters.minAmount) : ''}
              onChangeText={value =>
                setDraftFilters(prev => ({
                  ...prev,
                  minAmount: value ? Number(value) : null,
                }))
              }
              keyboardType="decimal-pad"
              placeholder="Min"
              placeholderTextColor={colors.placeholder}
            />
            <TextInput
              style={[styles.filterInput, styles.dualInput]}
              value={draftFilters.maxAmount ? String(draftFilters.maxAmount) : ''}
              onChangeText={value =>
                setDraftFilters(prev => ({
                  ...prev,
                  maxAmount: value ? Number(value) : null,
                }))
              }
              keyboardType="decimal-pad"
              placeholder="Max"
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>

        <View style={styles.modalActionRow}>
          <TouchableOpacity style={styles.secondaryAction} onPress={resetFilters}>
            <Text style={styles.secondaryActionText}>Reset</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <NewButton text="Apply Filters" onPress={applyFilters} />
          </View>
        </View>
      </UniversalModal>
    </View>
  );
};

const createStyles = colors =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 36,
      gap: 14,
    },
    heroCard: {
      // flex:1,
      backgroundColor: colors.primary,
      borderRadius: 24,
      padding: 18,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    eyebrow: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 12,
    },
    heroValue: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 30,
      marginTop: 4,
    },
    healthPill: {
      backgroundColor: colors.overlay,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    healthPillText: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 12,
    },
    rechargeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    
      gap: 10,
    },
    rechargeInput: {
      flex: 1,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontFamily: FONT_FAMILY.normal,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    },
    quickAmountChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 10,
    },
    quickAmountText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 13,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricLabel: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 12,
    },
    metricValue: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 16,
      marginTop: 8,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 16,
      marginBottom: 12,
    },
    infoLine: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 13,
      marginBottom: 8,
    },
    infoStrong: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
    },
    aiCard: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    aiHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    aiTitle: {
      color: colors.primary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
    },
    aiText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.normal,
      lineHeight: 20,
    },
    breakdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    breakdownLabel: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
    },
    breakdownMeta: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 12,
      marginTop: 4,
    },
    breakdownAmount: {
      color: colors.primary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionMeta: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 12,
    },
    transactionCard: {
      marginBottom: 10,
      padding: 14,
      backgroundColor: colors.background,
      borderRadius: 16,
    },
    transactionTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    transactionDate: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 12,
    },
    transactionTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      marginTop: 4,
    },
    transactionMeta: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      lineHeight: 18,
      marginTop: 2,
    },
    transactionAmount: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 15,
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      textAlign: 'center',
      paddingVertical: 16,
    },
    modalSection: {
      marginBottom: 16,
    },
    modalLabel: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      marginBottom: 10,
      fontSize: 14,
    },
    optionRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    optionChip: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    optionChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionChipText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
    },
    optionChipTextActive: {
      color: colors.onPrimary,
    },
    filterInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontFamily: FONT_FAMILY.normal,
      backgroundColor: colors.surface,
    },
    dualInputRow: {
      flexDirection: 'row',
      gap: 10,
    },
    dualInput: {
      flex: 1,
    },
    modalActionRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    secondaryAction: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryActionText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
    },
    rightControls: {
      position: 'absolute',
      right: 90,
      top: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
  });

export default CardRecharge;
