import React, { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  // ScrollView,
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
// import AIFilter from '../components/AIFilter';
import { askFinancialAi, useStatementDashboard } from '../services/ViewStatementService';
import { javascriptPost } from '../util/api';
import { useAppTheme } from '../theme/AppThemeProvider';
import { FONT_FAMILY } from '../util/colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation/AppDrawer';
import { RootState } from '../store/store';
import { ScrollView } from 'react-native-gesture-handler';
import AppAlertModal from '../components/feedback/AppAlertModal';
import { useAppAlert } from '../hooks/useAppAlert';
import LinearGradient from 'react-native-linear-gradient';

const initialFilters = {
  startDate: null,
  endDate: null,
  transactionType: null,
  minAmount: null,
  maxAmount: null,
  search: '',
  sortKey: 'voucher_date',
  sortDir: 'desc',
  limit: 150,
};

const currency = value => `₹${Number(value || 0).toFixed(2)}`;

type Props = NativeStackScreenProps<AppStackParamList,'ViewStatement'>;
const ViewStatement:React.FC<Props> = ({ navigation }) => {
  const userData = useSelector((state:RootState) => state.auth);
  const { colors, resolvedMode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [amountHeading, setAmountHeading] = useState('');
  const [amountError, setAmountError] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const { alertState, showAlert, hideAlert } = useAppAlert();

  const { data, isLoading, refetch } = useStatementDashboard(filters, userData);

  const dashboard = data?.data || {};
  const summary = dashboard.summary || {};
  const analytics = dashboard.analytics || {};
  const cards = analytics.cards || {};
  const highlights = analytics.highlights || {};
  const transactions = dashboard.transactions || [];
  const trend = analytics.monthly_trend || [];

  React.useEffect(() => {
    if (summary.amount_payable !== undefined && summary.amount_payable !== null) {
      setAmountHeading(String(Math.max(Number(summary.amount_payable || 0), 0)));
    }
  }, [summary.amount_payable]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.startDate && filters.endDate) {
      chips.push(
        `${moment(filters.startDate).format('DD MMM')} - ${moment(filters.endDate).format('DD MMM')}`,
      );
    }
    if (filters.transactionType) {
      chips.push(filters.transactionType === 'credit' ? 'Credits only' : 'Debits only');
    }
    if (filters.minAmount) {
      chips.push(`Min ${currency(filters.minAmount)}`);
    }
    if (filters.maxAmount) {
      chips.push(`Max ${currency(filters.maxAmount)}`);
    }
    if (filters.search) {
      chips.push(`Search: ${filters.search}`);
    }
    return chips;
  }, [filters]);

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
    if (!amountHeading || Number(amountHeading) <= 0) {
      setAmountError('Please enter a valid payable amount.');
      return;
    }

    try {
      setPayLoading(true);
      setAmountError('');

      const response = await javascriptPost({
        path: 'member/create_invoice_pay_order',
        body: {
          type: 'Subscription',
          amount: Number(amountHeading),
        },
        Token: userData?.token,
      });

      if (response?.data?.order_id || response?.data?.checkout || response?.data?.payment_url) {
        navigation.navigate('UniversalPayment', {
          type: 'Bill',
          orderData: response.data,
        });
      } else {
        setAmountError(response?.message || 'Unable to create payment order.');
      }
    } catch (error) {
      setAmountError('Unable to start payment right now.');
    } finally {
      setPayLoading(false);
    }
  };

  // const handleAskAi = async prompt => {
  //   try {
  //     setAiLoading(true);
  //     const response = await askFinancialAi({
  //       contextType: 'statement',
  //       prompt,
  //       filters,
  //       token: userData?.token,
  //     });

  //     setAiAnswer(response?.data?.answer || 'No insight available yet.');
  //     showAlert({
  //       title: 'AI insight ready',
  //       message: 'Your statement analysis is ready to review.',
  //       tone: 'success',
  //     });
  //   } catch (error) {
  //     showAlert({
  //       title: 'AI unavailable',
  //       message: 'Unable to fetch AI insight right now.',
  //       tone: 'danger',
  //     });
  //   } finally {
  //     setAiLoading(false);
  //   }
  // };

  const renderTrendItem = item => (
    <View key={item.month} style={styles.trendCard}>
      <Text style={styles.trendMonth}>{moment(item.month, 'YYYY-MM').format('MMM YY')}</Text>
      <Text style={styles.trendPositive}>In {currency(item.credit_total)}</Text>
      <Text style={styles.trendNegative}>Out {currency(item.debit_total)}</Text>
    </View>
  );

  const renderTransaction = ({ item }) => {
    const isCredit = Number(item.credit_amt) > 0;

    return (
      <Card style={styles.transactionCard}>
        <View style={styles.transactionTop}>
          <View>
            <Text style={styles.transactionDate}>
              {moment(item.voucher_date).format('DD MMM YYYY')}
            </Text>
            <Text style={styles.transactionVoucher}>Voucher #{item.voucher_no}</Text>
          </View>
          <View style={styles.amountBadgeWrap}>
            <Icon
              name={isCredit ? 'arrow-bottom-left' : 'arrow-top-right'}
              size={16}
              color={isCredit ? colors.success : colors.danger}
            />
            <Text
              style={[
                styles.amountBadge,
                { color: isCredit ? colors.success : colors.danger },
              ]}
            >
              {currency(isCredit ? item.credit_amt : item.debit_amt)}
            </Text>
          </View>
        </View>

        <Text style={styles.transactionTitle}>{item.particulars}</Text>
        {!!item.narrations && <Text style={styles.transactionMeta}>{item.narrations}</Text>}
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      <Header
        title="Subscription"
        OpenDropDawn={() => setShowFilterModal(true)}
        isMulti={true}
        isDawnload={true}
        type="Invoice"
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
              <Text style={styles.eyebrow}>Current Outstanding</Text>
              <Text style={styles.heroValue}>{currency(summary.outstanding_amount)}</Text>
            </View>
 {(summary.pdf_exsist || summary.pdf) &&  <TouchableOpacity
              style={styles.billButton}
              activeOpacity={0.85}
              onPress={() =>
               { summary.pdf_exsist
                  ? navigation.navigate('ViewBill') :
                  summary.pdf ?
                   navigation.navigate('PDFView', {
                      url: summary.pdf,
                      title: 'Statement',
                    })
                  : showAlert({
                      title: 'Bill unavailable',
                      message: 'No bill is available to view right now.',
                      tone: 'warning',
                    })}
              }
            >
              <Text style={styles.billButtonText}>View Bill</Text>
            </TouchableOpacity>}
          </View>

          <View style={styles.heroStats}>
            {/* <View style={styles.heroStat}>
              <Text style={styles.heroLabel}>Available Credit</Text>
              <Text style={styles.heroAmount}>{currency(summary.available_credit)}</Text>
            </View> */}
            <View style={styles.heroStat}>
              <Text style={styles.heroLabel}>Last Bill Amount</Text>
              <Text style={styles.heroAmount}>{currency(summary.bill_amount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.analyticsRow}>
            <View style={styles.metricCard}>
               <Text style={styles.metricLabel}>Payments may take a few minutes to reflect after a successful transaction.</Text>
            </View>
          {/* <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Net Flow</Text>
            <Text style={styles.metricValue}>{currency(cards.net_flow)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Credits</Text>
            <Text style={styles.metricValue}>{currency(cards.credit_total)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Debits</Text>
            <Text style={styles.metricValue}>{currency(cards.debit_total)}</Text>
          </View> */}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment Action</Text>
          <View style={styles.payRow}>
            <TextInput
              style={[styles.amountInput, amountError ? styles.amountInputError : null]}
              value={amountHeading}
              onChangeText={value => {
                setAmountHeading(value);
                if (amountError) {
                  setAmountError('');
                }
              }}
              placeholder="Enter payable amount"
              placeholderTextColor={colors.placeholder}
              keyboardType="decimal-pad"
            />
            <View style={{ width: 130 }}>
              <NewButton text="Pay Now" loading={payLoading} onPress={payNowAction} />
            </View>
          </View>
          {!!amountError && <Text style={styles.errorText}>{amountError}</Text>}
        </View>

        {/* <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Highlights</Text>
          <Text style={styles.infoLine}>
            Largest credit: <Text style={styles.infoStrong}>{currency(highlights.largest_credit)}</Text>
          </Text>
          <Text style={styles.infoLine}>
            Largest debit: <Text style={styles.infoStrong}>{currency(highlights.largest_debit)}</Text>
          </Text>
          <Text style={styles.infoLine}>
            Average credit: <Text style={styles.infoStrong}>{currency(highlights.average_credit)}</Text>
          </Text>
          <Text style={styles.infoLine}>
            Average debit: <Text style={styles.infoStrong}>{currency(highlights.average_debit)}</Text>
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

        {trend.length ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Monthly Transactions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              {trend.map(renderTrendItem)}
            </ScrollView>
          </View>
        ) : null} */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            <Text style={styles.sectionMeta}>{cards.activity_count || transactions.length} transactions</Text>
          </View>

          {activeFilterChips.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {activeFilterChips.map(chip => (
                <View key={chip} style={styles.filterChip}>
                  <Text style={styles.filterChipText}>{chip}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <FlatList
            scrollEnabled={false}
            data={transactions}
            keyExtractor={(item, index) => `${item.voucher_no || 'txn'}-${index}`}
            renderItem={renderTransaction}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {isLoading ? 'Loading transactions...' : 'No transactions found for the selected filters.'}
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
        title="Advanced Filters"
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
            placeholder="Search voucher, particulars, narration"
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
      backgroundColor: colors.primary,
      borderRadius: 24,
      padding: 18,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
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
      fontSize: 28,
      marginTop: 4,
    },
    billButton: {
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
    },
    billButtonText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 13,
    },
    heroStats: {
      flexDirection: 'row',
      gap: 12,
    },
    heroStat: {
      flex: 1,
      backgroundColor: colors.overlay,
      borderRadius: 16,
      padding: 12,
    },
    heroLabel: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 12,
    },
    heroAmount: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.bold,
      marginTop: 6,
      fontSize: 16,
    },
    analyticsRow: {
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
    payRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    amountInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontFamily: FONT_FAMILY.normal,
      backgroundColor: colors.background,
    },
    amountInputError: {
      borderColor: colors.danger,
    },
    errorText: {
      color: colors.danger,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 12,
      marginTop: 8,
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
    trendCard: {
      width: 130,
      marginRight: 10,
      borderRadius: 16,
      padding: 12,
      backgroundColor: colors.background,
    },
    trendMonth: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      marginBottom: 10,
    },
    trendPositive: {
      color: colors.success,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 12,
      marginBottom: 6,
    },
    trendNegative: {
      color: colors.danger,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionMeta: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 12,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      marginRight: 8,
    },
    filterChipText: {
      color: colors.primary,
      fontFamily: FONT_FAMILY.semiBold,
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
    transactionVoucher: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
      marginTop: 4,
    },
    amountBadgeWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    amountBadge: {
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
    },
    transactionTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
      marginBottom: 4,
    },
    transactionMeta: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      lineHeight: 18,
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

export default ViewStatement;

// import React, { useMemo, useState } from 'react';
// import {
//   FlatList,
//   RefreshControl,
//   // ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import { Card } from 'react-native-paper';
// import moment from 'moment';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import { useSelector } from 'react-redux';
// import Header from '../components/Header';
// import DatePickerComponent from '../components/DatePicker';
// import NewButton from '../components/Button';
// import UniversalModal from '../components/UniversalModal';
// import AIFilter from '../components/AIFilter';
// import { askFinancialAi, useStatementDashboard } from '../services/ViewStatementService';
// import { javascriptPost } from '../util/api';
// import { useAppTheme } from '../theme/AppThemeProvider';
// import { FONT_FAMILY } from '../util/colors';
// import { NativeStackScreenProps } from '@react-navigation/native-stack';
// import { AppStackParamList } from '../navigation/AppDrawer';
// import { RootState } from '../store/store';
// import { ScrollView } from 'react-native-gesture-handler';
// import AppAlertModal from '../components/feedback/AppAlertModal';
// import { useAppAlert } from '../hooks/useAppAlert';
// import LinearGradient from 'react-native-linear-gradient';

// const initialFilters = {
//   startDate: null,
//   endDate: null,
//   transactionType: null,
//   minAmount: null,
//   maxAmount: null,
//   search: '',
//   sortKey: 'voucher_date',
//   sortDir: 'desc',
//   limit: 150,
// };

// const currency = value => `₹${Number(value || 0).toFixed(2)}`;

// type Props = NativeStackScreenProps<AppStackParamList,'ViewStatement'>;
// const ViewStatement:React.FC<Props> = ({ navigation }) => {
//   const userData = useSelector((state:RootState) => state.auth);
//   const { colors, resolvedMode } = useAppTheme();
//   const styles = useMemo(() => createStyles(colors), [colors]);

//   const [filters, setFilters] = useState(initialFilters);
//   const [draftFilters, setDraftFilters] = useState(initialFilters);
//   const [amountHeading, setAmountHeading] = useState('');
//   const [amountError, setAmountError] = useState('');
//   const [payLoading, setPayLoading] = useState(false);
//   const [showFilterModal, setShowFilterModal] = useState(false);
//   const [aiLoading, setAiLoading] = useState(false);
//   const [aiAnswer, setAiAnswer] = useState('');
//   const { alertState, showAlert, hideAlert } = useAppAlert();

//   const { data, isLoading, refetch } = useStatementDashboard(filters, userData);

//   const dashboard = data?.data || {};
//   const summary = dashboard.summary || {};
//   const analytics = dashboard.analytics || {};
//   const cards = analytics.cards || {};
//   // const highlights = analytics.highlights || {};
//   const transactions = dashboard.transactions || [];
//   const trend = analytics.monthly_trend || [];
//   React.useEffect(() => {
//     if (summary.amount_payable !== undefined && summary.amount_payable !== null) {
//       setAmountHeading(String(Math.max(Number(summary.amount_payable || 0), 0)));
//     }
//   }, [summary.amount_payable]);

//   const activeFilterChips = useMemo(() => {
//     const chips = [];
//     if (filters.startDate && filters.endDate) {
//       chips.push(
//         `${moment(filters.startDate).format('DD MMM')} - ${moment(filters.endDate).format('DD MMM')}`,
//       );
//     }
//     if (filters.transactionType) {
//       chips.push(filters.transactionType === 'credit' ? 'Credits only' : 'Debits only');
//     }
//     if (filters.minAmount) {
//       chips.push(`Min ${currency(filters.minAmount)}`);
//     }
//     if (filters.maxAmount) {
//       chips.push(`Max ${currency(filters.maxAmount)}`);
//     }
//     if (filters.search) {
//       chips.push(`Search: ${filters.search}`);
//     }
//     return chips;
//   }, [filters]);

//   const resetFilters = () => {
//     setDraftFilters(initialFilters);
//     setFilters(initialFilters);
//   };

//   const applyFilters = () => {
//     setFilters({
//       ...draftFilters,
//       search: draftFilters.search?.trim() || '',
//     });
//     setShowFilterModal(false);
//   };

//   const payNowAction = async () => {
//     if (!amountHeading || Number(amountHeading) <= 0) {
//       setAmountError('Please enter a valid payable amount.');
//       return;
//     }

//     try {
//       setPayLoading(true);
//       setAmountError('');

//       const response = await javascriptPost({
//         path: 'member/create_invoice_pay_order',
//         body: {
//           type: 'Subscription',
//           amount: Number(amountHeading),
//         },
//         Token: userData?.token,
//       });

//       if (response?.data?.order_id || response?.data?.checkout || response?.data?.payment_url) {
//         navigation.navigate('UniversalPayment', {
//           type: 'Bill',
//           orderData: response.data,
//         });
//       } else {
//         setAmountError(response?.message || 'Unable to create payment order.');
//       }
//     } catch (error) {
//       setAmountError('Unable to start payment right now.');
//     } finally {
//       setPayLoading(false);
//     }
//   };

//   const handleAskAi = async prompt => {
//     try {
//       setAiLoading(true);
//       const response = await askFinancialAi({
//         contextType: 'statement',
//         prompt,
//         filters,
//         token: userData?.token,
//       });

//       setAiAnswer(response?.data?.answer || 'No insight available yet.');
//       showAlert({
//         title: 'AI insight ready',
//         message: 'Your statement analysis is ready to review.',
//         tone: 'success',
//       });
//     } catch (error) {
//       showAlert({
//         title: 'AI unavailable',
//         message: 'Unable to fetch AI insight right now.',
//         tone: 'danger',
//       });
//     } finally {
//       setAiLoading(false);
//     }
//   };

//   const renderTrendItem = item => (
//     <View key={item.month} style={styles.trendCard}>
//       <Text style={styles.trendMonth}>{moment(item.month, 'YYYY-MM').format('MMM YY')}</Text>
//       <Text style={styles.trendPositive}>In {currency(item.credit_total)}</Text>
//       <Text style={styles.trendNegative}>Out {currency(item.debit_total)}</Text>
//     </View>
//   );

//   const renderTransaction = ({ item }) => {
//     const isCredit = Number(item.credit_amt) > 0;

//     return (
//       <Card style={styles.transactionCard}>
//         <View style={styles.transactionTop}>
//           <View>
//             <Text style={styles.transactionDate}>
//               {moment(item.voucher_date).format('DD MMM YYYY')}
//             </Text>
//             <Text style={styles.transactionVoucher}>Voucher #{item.voucher_no}</Text>
//           </View>
//           <View style={styles.amountBadgeWrap}>
//             <Icon
//               name={isCredit ? 'arrow-bottom-left' : 'arrow-top-right'}
//               size={16}
//               color={isCredit ? colors.success : colors.danger}
//             />
//             <Text
//               style={[
//                 styles.amountBadge,
//                 { color: isCredit ? colors.success : colors.danger },
//               ]}
//             >
//               {currency(isCredit ? item.credit_amt : item.debit_amt)}
//             </Text>
//           </View>
//         </View>

//         <Text style={styles.transactionTitle}>{item.particulars}</Text>
//         {!!item.narrations && <Text style={styles.transactionMeta}>{item.narrations}</Text>}
//       </Card>
//     );
//   };

//   return (
//     <View style={styles.screen}>
//       <Header
//         title="Subscription"
//         OpenDropDawn={() => setShowFilterModal(true)}
//         isMulti={true}
//         isDawnload={true}
//          type="Invoice"
//       >
//         {/* <View style={styles.rightControls}>
//           <AIFilter onApply={handleAskAi} loading={aiLoading} title="Ask AI" />
//         </View> */}
//       </Header>

//       <ScrollView
//         style={styles.scroll}
//         contentContainerStyle={styles.content}
//         refreshControl={
//           <RefreshControl
//             refreshing={isLoading}
//             onRefresh={refetch}
//             tintColor={colors.secondary}
//             colors={[colors.secondary]}
//           />
//         }
//       >
//         <View
//                    // colors={[colors.primary, colors.overlay]}
//          //           colors={resolvedMode === 'dark'
//          // ? ['#020617', '#0F172A', '#1E293B']
//          // : ['#1E293B', '#334155', '#475569']}
//          //           start={{ x: 0, y: 0 }}
//          //           end={{ x: 1, y: 1 }}
                   
//                    style={styles.heroCard}
//                  >
//           <View style={styles.heroTop}>
//             <View>
//               <Text style={styles.eyebrow}>Subscription Balance</Text>
//               <Text style={styles.heroValue}>{currency(summary.available_credit)}</Text>
//             </View>
//                 {(summary.pdf_exsist || summary.pdf) &&  <TouchableOpacity
//               style={styles.billButton}
//               activeOpacity={0.85}
//               onPress={() =>
//                { summary.pdf_exsist
//                   ? navigation.navigate('ViewBill') :
//                   summary.pdf ?
//                    navigation.navigate('PDFView', {
//                       url: summary.pdf,
//                       title: 'Statement',
//                     })
//                   : showAlert({
//                       title: 'Bill unavailable',
//                       message: 'No bill is available to view right now.',
//                       tone: 'warning',
//                     })}
//               }
//             >
//               <Text style={styles.billButtonText}>View Bill</Text>
//             </TouchableOpacity>}
//           </View>

//           <View style={styles.heroStats}>
//             <View style={styles.heroStat}>
//               <Text style={styles.heroLabel}>Last Bill Amount</Text>
//               <Text style={styles.heroAmount}>{currency(summary.bill_amount)}</Text>
//             </View>
         
//           </View>
//         </View>

//         <View style={styles.analyticsRow}>
//          <View style={styles.metricCard}>
//                <Text style={styles.metricLabel}>Payments may take a few minutes to reflect after a successful transaction.</Text>
//             </View>
//           {/* <View style={styles.metricCard}>
//             <Text style={styles.metricLabel}>Net Flow</Text>
//             <Text style={styles.metricValue}>{currency(cards.net_flow)}</Text>
//           </View>
//           <View style={styles.metricCard}>
//             <Text style={styles.metricLabel}>Credits</Text>
//             <Text style={styles.metricValue}>{currency(cards.credit_total)}</Text>
//           </View>
//           <View style={styles.metricCard}>
//             <Text style={styles.metricLabel}>Debits</Text>
//             <Text style={styles.metricValue}>{currency(cards.debit_total)}</Text>
//           </View> */}
//         </View>

//         <View style={styles.sectionCard}>
//           <Text style={styles.sectionTitle}>Payment Action</Text>
//           <View style={styles.payRow}>
//             <TextInput
//               style={[styles.amountInput, amountError ? styles.amountInputError : null]}
//               value={amountHeading}
//               onChangeText={value => {
//                 setAmountHeading(value);
//                 if (amountError) {
//                   setAmountError('');
//                 }
//               }}
//               placeholder="Enter payable amount"
//               placeholderTextColor={colors.placeholder}
//               keyboardType="decimal-pad"
//             />
//             <View style={{ width: 130 }}>
//               <NewButton text="Pay Now" loading={payLoading} onPress={payNowAction} />
//             </View>
//           </View>
//           {!!amountError && <Text style={styles.errorText}>{amountError}</Text>}
//         </View>

//         {/* <View style={styles.sectionCard}>
//           <Text style={styles.sectionTitle}>Highlights</Text>
//           <Text style={styles.infoLine}>
//             Largest credit: <Text style={styles.infoStrong}>{currency(highlights.largest_credit)}</Text>
//           </Text>
//           <Text style={styles.infoLine}>
//             Largest debit: <Text style={styles.infoStrong}>{currency(highlights.largest_debit)}</Text>
//           </Text>
//           <Text style={styles.infoLine}>
//             Average credit: <Text style={styles.infoStrong}>{currency(highlights.average_credit)}</Text>
//           </Text>
//           <Text style={styles.infoLine}>
//             Average debit: <Text style={styles.infoStrong}>{currency(highlights.average_debit)}</Text>
//           </Text>
//         </View> */}

//         {/* {aiAnswer ? (
//           <View style={styles.aiCard}>
//             <View style={styles.aiHeader}>
//               <Icon name="robot-outline" size={18} color={colors.primary} />
//               <Text style={styles.aiTitle}>AI Insight</Text>
//             </View>
//             <Text style={styles.aiText}>{aiAnswer}</Text>
//           </View>
//         ) : null} */}

//         {/* {trend.length ? (
//           <View style={styles.sectionCard}>
//             <Text style={styles.sectionTitle}>Monthly Transactions</Text>
//             <ScrollView horizontal showsHorizontalScrollIndicator={true}>
//               {trend.map(renderTrendItem)}
//             </ScrollView>
//           </View>
//         ) : null} */}

//         <View style={styles.sectionCard}>
//           <View style={styles.sectionHeader}>
//             <Text style={styles.sectionTitle}>Transaction History</Text>
//             <Text style={styles.sectionMeta}>{cards.activity_count || transactions.length} transactions</Text>
//           </View>

//           {activeFilterChips.length ? (
//             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
//               {activeFilterChips.map(chip => (
//                 <View key={chip} style={styles.filterChip}>
//                   <Text style={styles.filterChipText}>{chip}</Text>
//                 </View>
//               ))}
//             </ScrollView>
//           ) : null}

//           <FlatList
//             scrollEnabled={false}
//             data={transactions}
//             keyExtractor={(item, index) => `${item.voucher_no || 'txn'}-${index}`}
//             renderItem={renderTransaction}
//             ListEmptyComponent={
//               <Text style={styles.emptyText}>
//                 {isLoading ? 'Loading transactions...' : 'No transactions found for the selected filters.'}
//               </Text>
//             }
//           />
//         </View>
//       </ScrollView>

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

//       <UniversalModal
//         visible={showFilterModal}
//         setVisible={setShowFilterModal}
//         isFull={true}
//         title="Advanced Filters"
//       >
//         <View style={styles.modalSection}>
//           <Text style={styles.modalLabel}>Date Range</Text>
//           <DatePickerComponent
//             placeholder={draftFilters.startDate || 'Start date'}
//             stateDate={value => setDraftFilters(prev => ({ ...prev, startDate: value }))}
//           />
//           <DatePickerComponent
//             placeholder={draftFilters.endDate || 'End date'}
//             stateDate={value => setDraftFilters(prev => ({ ...prev, endDate: value }))}
//           />
//         </View>

//         <View style={styles.modalSection}>
//           <Text style={styles.modalLabel}>Transaction Type</Text>
//           <View style={styles.optionRow}>
//             {['credit', 'debit'].map(type => (
//               <TouchableOpacity
//                 key={type}
//                 style={[
//                   styles.optionChip,
//                   draftFilters.transactionType === type ? styles.optionChipActive : null,
//                 ]}
//                 onPress={() =>
//                   setDraftFilters(prev => ({
//                     ...prev,
//                     transactionType: prev.transactionType === type ? null : type,
//                   }))
//                 }
//               >
//                 <Text
//                   style={[
//                     styles.optionChipText,
//                     draftFilters.transactionType === type ? styles.optionChipTextActive : null,
//                   ]}
//                 >
//                   {type === 'credit' ? 'Credits' : 'Debits'}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>

//         <View style={styles.modalSection}>
//           <Text style={styles.modalLabel}>Search</Text>
//           <TextInput
//             style={styles.filterInput}
//             value={draftFilters.search}
//             onChangeText={value => setDraftFilters(prev => ({ ...prev, search: value }))}
//             placeholder="Search voucher, particulars, narration"
//             placeholderTextColor={colors.placeholder}
//           />
//         </View>

//         <View style={styles.modalSection}>
//           <Text style={styles.modalLabel}>Amount Range</Text>
//           <View style={styles.dualInputRow}>
//             <TextInput
//               style={[styles.filterInput, styles.dualInput]}
//               value={draftFilters.minAmount ? String(draftFilters.minAmount) : ''}
//               onChangeText={value =>
//                 setDraftFilters(prev => ({
//                   ...prev,
//                   minAmount: value ? Number(value) : null,
//                 }))
//               }
//               keyboardType="decimal-pad"
//               placeholder="Min"
//               placeholderTextColor={colors.placeholder}
//             />
//             <TextInput
//               style={[styles.filterInput, styles.dualInput]}
//               value={draftFilters.maxAmount ? String(draftFilters.maxAmount) : ''}
//               onChangeText={value =>
//                 setDraftFilters(prev => ({
//                   ...prev,
//                   maxAmount: value ? Number(value) : null,
//                 }))
//               }
//               keyboardType="decimal-pad"
//               placeholder="Max"
//               placeholderTextColor={colors.placeholder}
//             />
//           </View>
//         </View>

//         <View style={styles.modalActionRow}>
//           <TouchableOpacity style={styles.secondaryAction} onPress={resetFilters}>
//             <Text style={styles.secondaryActionText}>Reset</Text>
//           </TouchableOpacity>
//           <View style={{ flex: 1 }}>
//             <NewButton text="Apply Filters" onPress={applyFilters} />
//           </View>
//         </View>
//       </UniversalModal>
//     </View>
//   );
// };

// const createStyles = colors =>
//   StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: colors.background,
//     },
//     scroll: {
//       flex: 1,
//       backgroundColor: colors.background,
//     },
//     content: {
//       padding: 16,
//       paddingBottom: 36,
//       gap: 14,
//     },
//     heroCard: {
//       backgroundColor: colors.primary,
//       borderRadius: 24,
//       padding: 18,
//     },
//     heroTop: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       justifyContent: 'space-between',
//       marginBottom: 14,
//     },
//     eyebrow: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.normal,
//       fontSize: 12,
//     },
//     heroValue: {
//       color: colors.onPrimary,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 28,
//       marginTop: 4,
//     },
//     billButton: {
//       backgroundColor: colors.surface,
//       paddingHorizontal: 14,
//       paddingVertical: 10,
//       borderRadius: 14,
//     },
//     billButtonText: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 13,
//     },
//     heroStats: {
//       flexDirection: 'row',
//       gap: 12,
//     },
//     heroStat: {
//       flex: 1,
//       backgroundColor: colors.overlay,
//       borderRadius: 16,
//       padding: 12,
//     },
//     heroLabel: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.normal,
//       fontSize: 12,
//     },
//     heroAmount: {
//       color: colors.onPrimary,
//       fontFamily: FONT_FAMILY.bold,
//       marginTop: 6,
//       fontSize: 16,
//     },
//     analyticsRow: {
//       flexDirection: 'row',
//       gap: 10,
//     },
//     metricCard: {
//       flex: 1,
//       backgroundColor: colors.surface,
//       borderRadius: 18,
//       padding: 14,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     metricLabel: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.normal,
//       fontSize: 12,
//     },
//     metricValue: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 16,
//       marginTop: 8,
//     },
//     sectionCard: {
//       backgroundColor: colors.surface,
//       borderRadius: 20,
//       padding: 16,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     sectionTitle: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 16,
//       marginBottom: 12,
//     },
//     payRow: {
//       flexDirection: 'row',
//       gap: 10,
//       alignItems: 'center',
//     },
//     amountInput: {
//       flex: 1,
//       borderWidth: 1,
//       borderColor: colors.border,
//       borderRadius: 14,
//       paddingHorizontal: 14,
//       paddingVertical: 12,
//       color: colors.text,
//       fontFamily: FONT_FAMILY.normal,
//       backgroundColor: colors.background,
//     },
//     amountInputError: {
//       borderColor: colors.danger,
//     },
//     errorText: {
//       color: colors.danger,
//       fontFamily: FONT_FAMILY.normal,
//       fontSize: 12,
//       marginTop: 8,
//     },
//     infoLine: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.normal,
//       fontSize: 13,
//       marginBottom: 8,
//     },
//     infoStrong: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//     },
//     aiCard: {
//       backgroundColor: colors.surfaceAlt,
//       borderRadius: 18,
//       padding: 16,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     aiHeader: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 8,
//       marginBottom: 10,
//     },
//     aiTitle: {
//       color: colors.primary,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 15,
//     },
//     aiText: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.normal,
//       lineHeight: 20,
//     },
//     trendCard: {
//       width: 130,
//       marginRight: 10,
//       borderRadius: 16,
//       padding: 12,
//       backgroundColor: colors.background,
//     },
//     trendMonth: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//       marginBottom: 10,
//     },
//     trendPositive: {
//       color: colors.success,
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 12,
//       marginBottom: 6,
//     },
//     trendNegative: {
//       color: colors.danger,
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 12,
//     },
//     sectionHeader: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginBottom: 12,
//     },
//     sectionMeta: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.normal,
//       fontSize: 12,
//     },
//     filterChip: {
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       borderRadius: 999,
//       backgroundColor: colors.surfaceAlt,
//       marginRight: 8,
//     },
//     filterChipText: {
//       color: colors.primary,
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 12,
//     },
//     transactionCard: {
//       marginBottom: 10,
//       padding: 14,
//       backgroundColor: colors.background,
//       borderRadius: 16,
//     },
//     transactionTop: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-start',
//       marginBottom: 8,
//     },
//     transactionDate: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.normal,
//       fontSize: 12,
//     },
//     transactionVoucher: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 13,
//       marginTop: 4,
//     },
//     amountBadgeWrap: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 4,
//     },
//     amountBadge: {
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 14,
//     },
//     transactionTitle: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 14,
//       marginBottom: 4,
//     },
//     transactionMeta: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.normal,
//       lineHeight: 18,
//     },
//     emptyText: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.normal,
//       textAlign: 'center',
//       paddingVertical: 16,
//     },
//     modalSection: {
//       marginBottom: 16,
//     },
//     modalLabel: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//       marginBottom: 10,
//       fontSize: 14,
//     },
//     optionRow: {
//       flexDirection: 'row',
//       gap: 10,
//       flexWrap: 'wrap',
//     },
//     optionChip: {
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       borderRadius: 14,
//       borderWidth: 1,
//       borderColor: colors.border,
//       backgroundColor: colors.surface,
//     },
//     optionChipActive: {
//       backgroundColor: colors.primary,
//       borderColor: colors.primary,
//     },
//     optionChipText: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 13,
//     },
//     optionChipTextActive: {
//       color: colors.onPrimary,
//     },
//     filterInput: {
//       borderWidth: 1,
//       borderColor: colors.border,
//       borderRadius: 14,
//       paddingHorizontal: 14,
//       paddingVertical: 12,
//       color: colors.text,
//       fontFamily: FONT_FAMILY.normal,
//       backgroundColor: colors.surface,
//     },
//     dualInputRow: {
//       flexDirection: 'row',
//       gap: 10,
//     },
//     dualInput: {
//       flex: 1,
//     },
//     modalActionRow: {
//       flexDirection: 'row',
//       gap: 10,
//       alignItems: 'center',
//     },
//     secondaryAction: {
//       paddingHorizontal: 16,
//       paddingVertical: 12,
//       borderRadius: 14,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     secondaryActionText: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.semiBold,
//     },
//       rightControls: {
//       position: 'absolute',
//       right: 90,
//       top: 12,
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 10,
//     },
//   });

// export default ViewStatement;
