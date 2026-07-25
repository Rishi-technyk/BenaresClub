import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import RNFS from "react-native-fs";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Share from 'react-native-share';
import moment from 'moment';

import Header from '../components/Header';
import { RootState } from '../store/store';
import { useAppTheme } from '../theme/AppThemeProvider';
import { javascriptGet } from '../util/api';
import { FONT_FAMILY } from '../util/colors';
import { generatePDF } from 'react-native-html-to-pdf';
import { Toast } from 'react-native-toast-notifications';

type BillItem = {
  Amount?: number | string;
  GSTAmt?: number | string;
  Particulars?: string;
  Remarks?: string;
  SCAmt?: number | string;
  VATAmt?: number | string;
};

type BillResponse = {
  success?: boolean;
  bill?: Record<string, any>;
  items?: BillItem[];
  member?: Record<string, any>;
  settings?: Record<string, any>;
  url?:string;
  html:string;
};

const money = (value: unknown) => `₹ ${Number(value || 0).toFixed(2)}`;

const numberValue = (value: unknown) => Number(value || 0);

const ViewBill = ({navigation}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { token,user } = useSelector((state: RootState) => state.auth);

  const [loading, setLoading] = useState(true);
  const [billData, setBillData] = useState<BillResponse | null>(null);
console.log( billData?.html, '---------------------- billData.html ---------------------');
  const bill = billData?.bill || {};
  const member = billData?.member || {};
  const settings = billData?.settings || {};
  const items = useMemo(() => billData?.items || [], [billData?.items]);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          const amount = numberValue(item.Amount);
          const gst = numberValue(item.GSTAmt);
          const vat = numberValue(item.VATAmt);
          const serviceCharge = numberValue(item.SCAmt);

          acc.amount += amount;
          acc.gst += gst;
          acc.gross += amount + gst + vat + serviceCharge;
          return acc;
        },
        { amount: 0, gst: 0, gross: 0 },
      ),
    [items],
  );
  const getBill = useCallback(async () => {
    try {
      const response = await javascriptGet({
        path: 'member/financial/bill',
        Token: token,
      });
console.log( response, '---------------------- response ---------------------');
      const nextBillData = response as unknown as BillResponse;

      if (nextBillData?.success) {
        setBillData(nextBillData);
      }
    } catch (error) {
      console.log('Bill Error', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    getBill();
  }, [getBill]);

  const shareBill = async () => {
    if (!billData?.bill) {
      return;
    }

    try {
      await Share.open({
        message: billData.url ? `Check out my latest bill from ${settings.heading || 'the club'}: ${billData.url}` : undefined,
      });
    } catch (error) {}
  };

  // const downloadBill = () => {
  //  if(billData?.url){
  //   Linking.openURL(billData.url).catch(err => {
  //     console.log('Error opening bill URL', err);
  //   });
  //  }
  // };
const downloadBill = async () => {
  try {
     const random = Date.now();
 const fileName = `Bill_${user?.MemberID}_${random}.pdf`;
    const pdf = await generatePDF({
      html: billData.html,
     fileName,
      base64: false,
    });

 const basePath =
        Platform.OS === "ios" ? RNFS.LibraryDirectoryPath : RNFS.DownloadDirectoryPath;

      const destPath = `${basePath}/${fileName}`;

      await RNFS.copyFile(pdf.filePath, destPath);
  Alert.alert(
         "File Downloaded Successfully",
         "",
         [
           { text: "OK" },
           {
             text: "Open File",
             onPress: () => {
               RNFS.exists(destPath).then((exists) => {
                 if (exists) {
                   navigation.navigate("PDFView", {
                     url: destPath,
                     title: "Statement",
                   });
                 } else {
                   Toast.show("File not found", { type: "warning" });
                 }
               });
             },
           },
         ],
         { cancelable: false }
       );
  } catch (e) {
    console.log("PDF Error", e);
  }
};
  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Monthly Bill" />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Loading bill details</Text>
        </View>
      </View>
    );
  }

  if (!billData?.bill) {
    return (
      <View style={styles.container}>
        <Header title="Monthly Bill" />
        <View style={styles.emptyState}>
          <Icon name="alert" size={46} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Bill unavailable</Text>
          <Text style={styles.emptyText}>We could not load the latest bill details right now.</Text>
          <Pressable style={styles.retryButton} onPress={getBill}>
            <Icon name="refresh" size={18} color={colors.onPrimary} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Monthly Bill" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <View style={styles.clubRow}>
            {settings.logo ? (
              <Image source={{ uri: settings.logo }} style={styles.logo} />
            ) : (
              <View style={styles.logoFallback}>
                <Icon name="office-building-outline" size={24} color={colors.onPrimary} />
              </View>
            )}

            <View style={styles.clubCopy}>
              <Text style={styles.clubName} numberOfLines={2}>
                {settings.heading || 'Club Bill'}
              </Text>
              {settings.sub_heading ? (
                <Text style={styles.clubMeta} numberOfLines={1}>
                  {settings.sub_heading}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Bill Amount</Text>
            <Text style={styles.amountDue}>{money(bill.PayableAmt)}</Text>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaLabel}>Bill No</Text>
              <Text style={styles.heroMetaValue}>{bill.BillNo || 'N/A'}</Text>
            </View>
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaLabel}>Bill Date</Text>
              <Text style={styles.heroMetaValue}>
                {bill.BillDate ? moment(bill.BillDate).format('DD MMM YYYY') : 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.actionButton} onPress={downloadBill}>
              <Icon name="download-outline" size={19} color={colors.primary} />
              <Text style={styles.actionText}>Download</Text>
            </Pressable>
   
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Member Details</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{member.Status || 'Active'}</Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <InfoTile label="Membership No" value={member.membership_no} styles={styles} />
            <InfoTile label="Name" value={member.name} styles={styles} />
            <InfoTile label="Mobile" value={member.mobile} styles={styles} />
            <InfoTile label="Email" value={member.email} styles={styles} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bill</Text>
            <Text style={styles.sectionCount}>{items.length} items</Text>
          </View>

          {items.map((item, index) => {
            const gst = numberValue(item.GSTAmt);
            const gross =
              numberValue(item.Amount) +
              gst +
              numberValue(item.VATAmt) +
              numberValue(item.SCAmt);

            return (
              <View key={`${item.Particulars || 'bill-item'}-${index}`} style={styles.itemRow}>
                <View style={styles.itemIndex}>
                  <Text style={styles.itemIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.itemBody}>
                  <View style={styles.itemTopRow}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {item.Particulars || 'Bill item'}
                    </Text>
                    <Text style={[styles.itemAmount,{color:gross > 0 ? colors.success : colors.danger}]}>{money(gross)}</Text>
                  </View>

                  {item.Remarks ? (
                    <Text style={styles.itemRemark} numberOfLines={2}>
                      {item.Remarks}
                    </Text>
                  ) : null}

                  <View style={styles.itemBreakdown}>
                    <Text style={styles.breakdownText}>Base {money(item.Amount)}</Text>
                    <Text style={styles.breakdownText}>CGST {money(gst / 2)}</Text>
                    <Text style={styles.breakdownText}>SGST {money(gst / 2)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryList}>
            <SummaryRow label="Basic Amount" value={totals.amount} styles={styles} />
            <SummaryRow label="GST Total" value={totals.gst} styles={styles} />
            <SummaryRow label="Arrear Amount" value={bill.ArearAmt} styles={styles} />
            <SummaryRow label="Current Charges" value={bill.CurrentAmount} styles={styles} />
            <SummaryRow label="Round Off" value={bill.RoundOff} styles={styles} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Amount Due</Text>
              <Text style={styles.totalValue}>{money(bill.PayableAmt)}</Text>
            </View>
          </View>
        </View>

        {(settings.phone || settings.email) ? (
          <View style={styles.contactStrip}>
            {settings.phone ? (
              <View style={styles.contactItem}>
                <Icon name="phone-outline" size={16} color={colors.textMuted} />
                <Text style={styles.contactText}>{settings.phone}</Text>
              </View>
            ) : null}
            {settings.email ? (
              <View style={styles.contactItem}>
                <Icon name="email-outline" size={16} color={colors.textMuted} />
                <Text style={styles.contactText}>{settings.email}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const InfoTile = ({
  label,
  value,
  styles,
}: {
  label: string;
  value: unknown;
  styles: ReturnType<typeof createStyles>;
}) => (
  <View style={styles.infoTile}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={2}>
      {String(value || 'N/A')}
    </Text>
  </View>
);

const SummaryRow = ({
  label,
  value,
  styles,
}: {
  label: string;
  value: unknown;
  styles: ReturnType<typeof createStyles>;
}) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{money(value)}</Text>
  </View>
);

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
      gap: 14,
    },
    loader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    loaderText: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 13,
      marginTop: 12,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    emptyTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 20,
      marginTop: 14,
      marginBottom: 8,
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.regular,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      marginBottom: 16,
    },
    retryButton: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 18,
      borderRadius: 16,
      backgroundColor: colors.primary,
    },
    retryButtonText: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 14,
    },
    hero: {
      backgroundColor: colors.primary,
      borderRadius: 24,
      padding: 18,
    },
    clubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 22,
    },
    logo: {
      width: 54,
      height: 54,
      borderRadius: 16,
      backgroundColor: colors.surface,
    },
    logoFallback: {
      width: 54,
      height: 54,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.16)',
    },
    clubCopy: {
      flex: 1,
    },
    clubName: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 17,
      lineHeight: 23,
    },
    clubMeta: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
      opacity: 0.76,
      marginTop: 3,
    },
    amountBlock: {
      marginBottom: 18,
    },
    amountLabel: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 13,
      opacity: 0.78,
      marginBottom: 4,
    },
    amountDue: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 34,
      lineHeight: 40,
    },
    heroMetaRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    heroMeta: {
      flex: 1,
      borderRadius: 16,
      padding: 12,
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    heroMetaLabel: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11,
      opacity: 0.76,
      marginBottom: 4,
    },
    heroMetaValue: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flex: 1,
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 16,
      backgroundColor: colors.onPrimary,
    },
    actionText: {
      color: colors.primary,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 14,
    },
    sectionTitle: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 17,
    },
    sectionCount: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
    },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
    },
    statusText: {
      color: colors.success,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 12,
    },
    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    infoTile: {
      width: '48%',
      minHeight: 72,
      borderRadius: 16,
      padding: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoLabel: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11,
      marginBottom: 5,
    },
    infoValue: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 13,
      lineHeight: 18,
    },
    itemRow: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    itemIndex: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    itemIndexText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 12,
    },
    itemBody: {
      flex: 1,
    },
    itemTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    itemTitle: {
      flex: 1,
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 14,
      lineHeight: 20,
    },
    itemAmount: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 14,
    },
    itemRemark: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.regular,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 5,
    },
    itemBreakdown: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 9,
    },
    breakdownText: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 11,
      borderRadius: 999,
      backgroundColor: colors.background,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    summaryList: {
      marginTop: 4,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    summaryLabel: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 14,
    },
    summaryValue: {
      color: colors.text,
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 14,
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 16,
    },
    totalLabel: {
      color: colors.text,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 16,
    },
    totalValue: {
      color: colors.secondary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 20,
    },
    contactStrip: {
      borderRadius: 18,
      padding: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    contactText: {
      flex: 1,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
    },
  });

export default ViewBill;

// import React, { useEffect, useState } from 'react';
// import {
//   ActivityIndicator,
//   Dimensions,
//   StyleSheet,
//   View,
// } from 'react-native';
// // import { WebView } from 'react-native-webview';
// import { NativeStackScreenProps } from '@react-navigation/native-stack';

// import Header from '../components/Header';
// import { AppStackParamList } from '../navigation/AppDrawer';
// import { useAppTheme } from '../theme/AppThemeProvider';
// import { javascriptGet } from '../util/api';
// import { useSelector } from 'react-redux';
// import { ScrollView } from 'react-native-gesture-handler';
// import RenderHTML from 'react-native-render-html'
// import { FONT_FAMILY } from '../util/colors';
// const { height, width } = Dimensions.get("window");
// type Props = NativeStackScreenProps<AppStackParamList, 'ViewBill'>;

// const ViewBill: React.FC<Props> = () => {
//   const { colors } = useAppTheme();

//   const [loading, setLoading] = useState(true);
//   const [html, setHtml] = useState('');
// const {token}=useSelector((state:any)=>state.auth)
//   const getBillData = async () => {
//     try {
//       const response = await javascriptGet({
//         path: 'member/financial/bill',
//         Token: token,
//       });
// ;
// if(response.success){
//       setHtml(response?.html ?? response?.data ?? '');
// }
//     } catch (error) {
//       console.log('Bill Error', error);
//     } finally {
//       setLoading(false);
//     }
//   };
// console.log( html, '---------------------- html ---------------------');
//   useEffect(() => {
//     getBillData();
//   }, []);

//   return (
//     <View style={styles.container}>
//       <Header title="Bill" />

//       {loading ? (
//         <View style={styles.loader}>
//           <ActivityIndicator size="large" color={colors.primary} />
//         </View>
//       ) : (
//          <ScrollView style={{backgroundColor:'white'}}>
//               <RenderHTML
//                 source={{
//                   html: html,
//                 }}
                
//                 //  imagesMaxWidth={  40}
//                 enableUserAgentStyles={true}
//                         contentWidth={width - 40}
//                          baseStyle={{ 
//                           fontFamily: FONT_FAMILY.normal ,
//                         //   color:colors.text,
//                         textAlign:'auto',
//                           margin:20,
//                         flex:1
//                         }}
//                         tagsStyles={{
//           img: {
//             width: '20%',
//             // height: 'auto',
//             alignSelf: 'center',
//             resizeMode: 'contain',
//           },}}
//               />
//             </ScrollView>
//       )}
//     </View>
//   );
// };

// export default ViewBill;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   loader: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   webview: {
//     flex: 1,
//   },
// });
// import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import {
//   ActivityIndicator,
//   Image,
//   Linking,
//   Pressable,
//   ScrollView,
//   StyleSheet,
//   Text,
//   View,
// } from 'react-native';
// import { useSelector } from 'react-redux';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import Share from 'react-native-share';
// import moment from 'moment';

// import Header from '../components/Header';
// import { RootState } from '../store/store';
// import { useAppTheme } from '../theme/AppThemeProvider';
// import { javascriptGet } from '../util/api';
// import { FONT_FAMILY } from '../util/colors';

// type BillItem = {
//   Amount?: number | string;
//   GSTAmt?: number | string;
//   Particulars?: string;
//   Remarks?: string;
//   SCAmt?: number | string;
//   VATAmt?: number | string;
// };

// type BillResponse = {
//   success?: boolean;
//   bill?: Record<string, any>;
//   items?: BillItem[];
//   member?: Record<string, any>;
//   settings?: Record<string, any>;
//   url?:string;
// };

// const money = (value: unknown) => `₹ ${Number(value || 0).toFixed(2)}`;

// const numberValue = (value: unknown) => Number(value || 0);

// const ViewBill = () => {
//   const { colors } = useAppTheme();
//   const styles = useMemo(() => createStyles(colors), [colors]);
//   const { token } = useSelector((state: RootState) => state.auth);

//   const [loading, setLoading] = useState(true);
//   const [billData, setBillData] = useState<BillResponse | null>(null);

//   const bill = billData?.bill || {};
//   const member = billData?.member || {};
//   const settings = billData?.settings || {};
//   const items = useMemo(() => billData?.items || [], [billData?.items]);

//   const totals = useMemo(
//     () =>
//       items.reduce(
//         (acc, item) => {
//           const amount = numberValue(item.Amount);
//           const gst = numberValue(item.GSTAmt);
//           const vat = numberValue(item.VATAmt);
//           const serviceCharge = numberValue(item.SCAmt);

//           acc.amount += amount;
//           acc.gst += gst;
//           acc.gross += amount + gst + vat + serviceCharge;
//           return acc;
//         },
//         { amount: 0, gst: 0, gross: 0 },
//       ),
//     [items],
//   );
//   const getBill = useCallback(async () => {
//     try {
//       const response = await javascriptGet({
//         path: 'member/financial/bill',
//         Token: token,
//       });

//       const nextBillData = response as unknown as BillResponse;

//       if (nextBillData?.success) {
//         setBillData(nextBillData);
//       }
//     } catch (error) {
//       console.log('Bill Error', error);
//     } finally {
//       setLoading(false);
//     }
//   }, [token]);

//   useEffect(() => {
//     getBill();
//   }, [getBill]);

//   const shareBill = async () => {
//     if (!billData?.bill) {
//       return;
//     }

//     try {
//       await Share.open({
//         message: billData.url ? `Check out my latest bill from ${settings.heading || 'the club'}: ${billData.url}` : undefined,
//       });
//     } catch (error) {}
//   };

//   const downloadBill = () => {
//    if(billData?.url){
//     Linking.openURL(billData.url).catch(err => {
//       console.log('Error opening bill URL', err);
//     });
//    }
//   };

//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <Header title="Monthly Bill" />
//         <View style={styles.loader}>
//           <ActivityIndicator size="large" color={colors.primary} />
//           <Text style={styles.loaderText}>Loading bill details</Text>
//         </View>
//       </View>
//     );
//   }

//   if (!billData?.bill) {
//     return (
//       <View style={styles.container}>
//         <Header title="Monthly Bill" />
//         <View style={styles.emptyState}>
//           <Icon name="alert" size={46} color={colors.textMuted} />
//           <Text style={styles.emptyTitle}>Bill unavailable</Text>
//           <Text style={styles.emptyText}>We could not load the latest bill details right now.</Text>
//           <Pressable style={styles.retryButton} onPress={getBill}>
//             <Icon name="refresh" size={18} color={colors.onPrimary} />
//             <Text style={styles.retryButtonText}>Retry</Text>
//           </Pressable>
//         </View>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <Header title="Monthly Bill" />

//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={styles.content}
//       >
//         <View style={styles.hero}>
//           <View style={styles.clubRow}>
//             {settings.logo ? (
//               <Image source={{ uri: settings.logo }} style={styles.logo} />
//             ) : (
//               <View style={styles.logoFallback}>
//                 <Icon name="office-building-outline" size={24} color={colors.onPrimary} />
//               </View>
//             )}

//             <View style={styles.clubCopy}>
//               <Text style={styles.clubName} numberOfLines={2}>
//                 {settings.heading || 'Club Bill'}
//               </Text>
//               {settings.sub_heading ? (
//                 <Text style={styles.clubMeta} numberOfLines={1}>
//                   {settings.sub_heading}
//                 </Text>
//               ) : null}
//             </View>
//           </View>

//           <View style={styles.amountBlock}>
//             <Text style={styles.amountLabel}>Bill Amount</Text>
//             <Text style={styles.amountDue}>{money(bill.PayableAmt)}</Text>
//           </View>

//           <View style={styles.heroMetaRow}>
//             <View style={styles.heroMeta}>
//               <Text style={styles.heroMetaLabel}>Bill No</Text>
//               <Text style={styles.heroMetaValue}>{bill.BillNo || 'N/A'}</Text>
//             </View>
//             <View style={styles.heroMeta}>
//               <Text style={styles.heroMetaLabel}>Bill Date</Text>
//               <Text style={styles.heroMetaValue}>
//                 {bill.BillDate ? moment(bill.BillDate).format('DD MMM YYYY') : 'N/A'}
//               </Text>
//             </View>
//           </View>

//           <View style={styles.actionRow}>
//             <Pressable style={styles.actionButton} onPress={downloadBill}>
//               <Icon name="download-outline" size={19} color={colors.primary} />
//               <Text style={styles.actionText}>Download</Text>
//             </Pressable>
//             <Pressable style={styles.actionButton} onPress={shareBill}>
//               <Icon name="share-variant-outline" size={19} color={colors.primary} />
//               <Text style={styles.actionText}>Share</Text>
//             </Pressable>
//           </View>
//         </View>

//         <View style={styles.section}>
//           <View style={styles.sectionHeader}>
//             <Text style={styles.sectionTitle}>Member Details</Text>
//             <View style={styles.statusPill}>
//               <Text style={styles.statusText}>{member.Status || 'Active'}</Text>
//             </View>
//           </View>

//           <View style={styles.infoGrid}>
//             <InfoTile label="Membership No" value={member.membership_no} styles={styles} />
//             <InfoTile label="Name" value={member.name} styles={styles} />
//             <InfoTile label="Mobile" value={member.mobile} styles={styles} />
//             <InfoTile label="Email" value={member.email} styles={styles} />
//           </View>
//         </View>

//         <View style={styles.section}>
//           <View style={styles.sectionHeader}>
//             <Text style={styles.sectionTitle}>Bill</Text>
//             <Text style={styles.sectionCount}>{items.length} items</Text>
//           </View>

//           {items.map((item, index) => {
//             const gst = numberValue(item.GSTAmt);
//             const gross =
//               numberValue(item.Amount) +
//               gst +
//               numberValue(item.VATAmt) +
//               numberValue(item.SCAmt);

//             return (
//               <View key={`${item.Particulars || 'bill-item'}-${index}`} style={styles.itemRow}>
//                 <View style={styles.itemIndex}>
//                   <Text style={styles.itemIndexText}>{index + 1}</Text>
//                 </View>
//                 <View style={styles.itemBody}>
//                   <View style={styles.itemTopRow}>
//                     <Text style={styles.itemTitle} numberOfLines={2}>
//                       {item.Particulars || 'Bill item'}
//                     </Text>
//                     <Text style={[styles.itemAmount,{color:gross > 0 ? colors.success : colors.danger}]}>{money(gross)}</Text>
//                   </View>

//                   {item.Remarks ? (
//                     <Text style={styles.itemRemark} numberOfLines={2}>
//                       {item.Remarks}
//                     </Text>
//                   ) : null}

//                   <View style={styles.itemBreakdown}>
//                     <Text style={styles.breakdownText}>Base {money(item.Amount)}</Text>
//                     <Text style={styles.breakdownText}>CGST {money(gst / 2)}</Text>
//                     <Text style={styles.breakdownText}>SGST {money(gst / 2)}</Text>
//                   </View>
//                 </View>
//               </View>
//             );
//           })}
//         </View>

//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Summary</Text>
//           <View style={styles.summaryList}>
//             <SummaryRow label="Basic Amount" value={totals.amount} styles={styles} />
//             <SummaryRow label="GST Total" value={totals.gst} styles={styles} />
//             <SummaryRow label="Arrear Amount" value={bill.ArearAmt} styles={styles} />
//             <SummaryRow label="Current Charges" value={bill.CurrentAmount} styles={styles} />
//             <SummaryRow label="Round Off" value={bill.RoundOff} styles={styles} />
//             <View style={styles.totalRow}>
//               <Text style={styles.totalLabel}>Amount Due</Text>
//               <Text style={styles.totalValue}>{money(bill.PayableAmt)}</Text>
//             </View>
//           </View>
//         </View>

//         {(settings.phone || settings.email) ? (
//           <View style={styles.contactStrip}>
//             {settings.phone ? (
//               <View style={styles.contactItem}>
//                 <Icon name="phone-outline" size={16} color={colors.textMuted} />
//                 <Text style={styles.contactText}>{settings.phone}</Text>
//               </View>
//             ) : null}
//             {settings.email ? (
//               <View style={styles.contactItem}>
//                 <Icon name="email-outline" size={16} color={colors.textMuted} />
//                 <Text style={styles.contactText}>{settings.email}</Text>
//               </View>
//             ) : null}
//           </View>
//         ) : null}
//       </ScrollView>
//     </View>
//   );
// };

// const InfoTile = ({
//   label,
//   value,
//   styles,
// }: {
//   label: string;
//   value: unknown;
//   styles: ReturnType<typeof createStyles>;
// }) => (
//   <View style={styles.infoTile}>
//     <Text style={styles.infoLabel}>{label}</Text>
//     <Text style={styles.infoValue} numberOfLines={2}>
//       {String(value || 'N/A')}
//     </Text>
//   </View>
// );

// const SummaryRow = ({
//   label,
//   value,
//   styles,
// }: {
//   label: string;
//   value: unknown;
//   styles: ReturnType<typeof createStyles>;
// }) => (
//   <View style={styles.summaryRow}>
//     <Text style={styles.summaryLabel}>{label}</Text>
//     <Text style={styles.summaryValue}>{money(value)}</Text>
//   </View>
// );

// const createStyles = (colors: any) =>
//   StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: colors.background,
//     },
//     content: {
//       padding: 16,
//       paddingBottom: 32,
//       gap: 14,
//     },
//     loader: {
//       flex: 1,
//       alignItems: 'center',
//       justifyContent: 'center',
//       paddingHorizontal: 24,
//     },
//     loaderText: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.medium,
//       fontSize: 13,
//       marginTop: 12,
//     },
//     emptyState: {
//       flex: 1,
//       alignItems: 'center',
//       justifyContent: 'center',
//       paddingHorizontal: 24,
//     },
//     emptyTitle: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 20,
//       marginTop: 14,
//       marginBottom: 8,
//     },
//     emptyText: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.regular,
//       fontSize: 14,
//       lineHeight: 21,
//       textAlign: 'center',
//       marginBottom: 16,
//     },
//     retryButton: {
//       minHeight: 46,
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 8,
//       paddingHorizontal: 18,
//       borderRadius: 16,
//       backgroundColor: colors.primary,
//     },
//     retryButtonText: {
//       color: colors.onPrimary,
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 14,
//     },
//     hero: {
//       backgroundColor: colors.primary,
//       borderRadius: 24,
//       padding: 18,
//     },
//     clubRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//       marginBottom: 22,
//     },
//     logo: {
//       width: 54,
//       height: 54,
//       borderRadius: 16,
//       backgroundColor: colors.surface,
//     },
//     logoFallback: {
//       width: 54,
//       height: 54,
//       borderRadius: 16,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: 'rgba(255,255,255,0.16)',
//     },
//     clubCopy: {
//       flex: 1,
//     },
//     clubName: {
//       color: colors.onPrimary,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 17,
//       lineHeight: 23,
//     },
//     clubMeta: {
//       color: colors.onPrimary,
//       fontFamily: FONT_FAMILY.medium,
//       fontSize: 12,
//       opacity: 0.76,
//       marginTop: 3,
//     },
//     amountBlock: {
//       marginBottom: 18,
//     },
//     amountLabel: {
//       color: colors.onPrimary,
//       fontFamily: FONT_FAMILY.medium,
//       fontSize: 13,
//       opacity: 0.78,
//       marginBottom: 4,
//     },
//     amountDue: {
//       color: colors.onPrimary,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 34,
//       lineHeight: 40,
//     },
//     heroMetaRow: {
//       flexDirection: 'row',
//       gap: 10,
//       marginBottom: 16,
//     },
//     heroMeta: {
//       flex: 1,
//       borderRadius: 16,
//       padding: 12,
//       backgroundColor: 'rgba(255,255,255,0.14)',
//     },
//     heroMetaLabel: {
//       color: colors.onPrimary,
//       fontFamily: FONT_FAMILY.medium,
//       fontSize: 11,
//       opacity: 0.76,
//       marginBottom: 4,
//     },
//     heroMetaValue: {
//       color: colors.onPrimary,
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 13,
//     },
//     actionRow: {
//       flexDirection: 'row',
//       gap: 10,
//     },
//     actionButton: {
//       flex: 1,
//       minHeight: 46,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'center',
//       gap: 8,
//       borderRadius: 16,
//       backgroundColor: colors.onPrimary,
//     },
//     actionText: {
//       color: colors.primary,
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 13,
//     },
//     section: {
//       backgroundColor: colors.surface,
//       borderRadius: 20,
//       borderWidth: 1,
//       borderColor: colors.border,
//       padding: 16,
//     },
//     sectionHeader: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       gap: 12,
//       marginBottom: 14,
//     },
//     sectionTitle: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 17,
//     },
//     sectionCount: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.medium,
//       fontSize: 12,
//     },
//     statusPill: {
//       paddingHorizontal: 10,
//       paddingVertical: 6,
//       borderRadius: 999,
//       backgroundColor: colors.surfaceAlt,
//     },
//     statusText: {
//       color: colors.success,
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 12,
//     },
//     infoGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 10,
//     },
//     infoTile: {
//       width: '48%',
//       minHeight: 72,
//       borderRadius: 16,
//       padding: 12,
//       backgroundColor: colors.background,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     infoLabel: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.medium,
//       fontSize: 11,
//       marginBottom: 5,
//     },
//     infoValue: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 13,
//       lineHeight: 18,
//     },
//     itemRow: {
//       flexDirection: 'row',
//       gap: 12,
//       paddingVertical: 14,
//       borderTopWidth: 1,
//       borderTopColor: colors.border,
//     },
//     itemIndex: {
//       width: 30,
//       height: 30,
//       borderRadius: 10,
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: colors.surfaceAlt,
//     },
//     itemIndexText: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 12,
//     },
//     itemBody: {
//       flex: 1,
//     },
//     itemTopRow: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       gap: 10,
//     },
//     itemTitle: {
//       flex: 1,
//       color: colors.text,
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 14,
//       lineHeight: 20,
//     },
//     itemAmount: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 14,
//     },
//     itemRemark: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.regular,
//       fontSize: 12,
//       lineHeight: 17,
//       marginTop: 5,
//     },
//     itemBreakdown: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//       marginTop: 9,
//     },
//     breakdownText: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.medium,
//       fontSize: 11,
//       borderRadius: 999,
//       backgroundColor: colors.background,
//       paddingHorizontal: 9,
//       paddingVertical: 5,
//     },
//     summaryList: {
//       marginTop: 4,
//     },
//     summaryRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingVertical: 11,
//       borderBottomWidth: 1,
//       borderBottomColor: colors.border,
//     },
//     summaryLabel: {
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.medium,
//       fontSize: 14,
//     },
//     summaryValue: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.semiBold,
//       fontSize: 14,
//     },
//     totalRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingTop: 16,
//     },
//     totalLabel: {
//       color: colors.text,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 16,
//     },
//     totalValue: {
//       color: colors.secondary,
//       fontFamily: FONT_FAMILY.bold,
//       fontSize: 20,
//     },
//     contactStrip: {
//       borderRadius: 18,
//       padding: 14,
//       backgroundColor: colors.surface,
//       borderWidth: 1,
//       borderColor: colors.border,
//       gap: 8,
//     },
//     contactItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 8,
//     },
//     contactText: {
//       flex: 1,
//       color: colors.textMuted,
//       fontFamily: FONT_FAMILY.medium,
//       fontSize: 12,
//     },
//   });

// export default ViewBill;

// // import React, { useEffect, useState } from 'react';
// // import {
// //   ActivityIndicator,
// //   Dimensions,
// //   StyleSheet,
// //   View,
// // } from 'react-native';
// // // import { WebView } from 'react-native-webview';
// // import { NativeStackScreenProps } from '@react-navigation/native-stack';

// // import Header from '../components/Header';
// // import { AppStackParamList } from '../navigation/AppDrawer';
// // import { useAppTheme } from '../theme/AppThemeProvider';
// // import { javascriptGet } from '../util/api';
// // import { useSelector } from 'react-redux';
// // import { ScrollView } from 'react-native-gesture-handler';
// // import RenderHTML from 'react-native-render-html'
// // import { FONT_FAMILY } from '../util/colors';
// // const { height, width } = Dimensions.get("window");
// // type Props = NativeStackScreenProps<AppStackParamList, 'ViewBill'>;

// // const ViewBill: React.FC<Props> = () => {
// //   const { colors } = useAppTheme();

// //   const [loading, setLoading] = useState(true);
// //   const [html, setHtml] = useState('');
// // const {token}=useSelector((state:any)=>state.auth)
// //   const getBillData = async () => {
// //     try {
// //       const response = await javascriptGet({
// //         path: 'member/financial/bill',
// //         Token: token,
// //       });
// // ;
// // if(response.success){
// //       setHtml(response?.html ?? response?.data ?? '');
// // }
// //     } catch (error) {
// //       console.log('Bill Error', error);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };
// // console.log( html, '---------------------- html ---------------------');
// //   useEffect(() => {
// //     getBillData();
// //   }, []);

// //   return (
// //     <View style={styles.container}>
// //       <Header title="Bill" />

// //       {loading ? (
// //         <View style={styles.loader}>
// //           <ActivityIndicator size="large" color={colors.primary} />
// //         </View>
// //       ) : (
// //          <ScrollView style={{backgroundColor:'white'}}>
// //               <RenderHTML
// //                 source={{
// //                   html: html,
// //                 }}
                
// //                 //  imagesMaxWidth={  40}
// //                 enableUserAgentStyles={true}
// //                         contentWidth={width - 40}
// //                          baseStyle={{ 
// //                           fontFamily: FONT_FAMILY.normal ,
// //                         //   color:colors.text,
// //                         textAlign:'auto',
// //                           margin:20,
// //                         flex:1
// //                         }}
// //                         tagsStyles={{
// //           img: {
// //             width: '20%',
// //             // height: 'auto',
// //             alignSelf: 'center',
// //             resizeMode: 'contain',
// //           },}}
// //               />
// //             </ScrollView>
// //       )}
// //     </View>
// //   );
// // };

// // export default ViewBill;

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //   },
// //   loader: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //   },
// //   webview: {
// //     flex: 1,
// //   },
// // });