import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  FlatList,
  LayoutAnimation,
  BackHandler,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import RNPrint from "react-native-print"; // 👈 Import
import { Toast } from "react-native-toast-notifications";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { ENDPOINT } from "../../util/constant";
import { javascriptGetLocal, javascriptPostLocal } from "../../util/api";
import { DARK_BLUE, FONT_FAMILY, GREY_COLOR, LIGHT_BLUE, SECONDARY_COLOR } from "../../util/colors";
import UniversalModal from "../../components/UniversalModal";
import { RootStackParamList } from "../../navigation/AppDrawer";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Header from "../../components/Header";
type Props = NativeStackScreenProps<RootStackParamList, "KotReceipt">;
interface KOTItem {
  id: number;
  ItemName: string;
  Qty: number;
  Rate: number;
  DiscountPer: number;
  TaxPer: number;
  TaxType: string;
  is_updated?: boolean;
}

interface KOT {
  KOTNo: string;
  Items: KOTItem[];
}
type TaxRow = {
  label: string;
  amount: number;
};

const calculateTaxes = (KOTWiseData: any[]): TaxRow[] => {
  const taxMap: Record<string, number> = {};

  KOTWiseData.forEach((kot) => {
    kot.Items.forEach((item) => {
      const qty = Number(item.Qty) || 0;
      const rate = Number(item.Rate) || 0;
      const discount = Number(item.DiscountPer) || 0;
      const taxPer = Number(item.TaxPer) || 0;
      const taxType = (item.TaxType || "").toUpperCase();

      if (!taxType || taxPer === 0) return;

      const base = qty * rate;
      const discountAmt = base * (discount / 100);
      const taxable = base - discountAmt;
      const taxAmt = (taxable * taxPer) / 100;

      const key = `${taxType}_${taxPer}`;
      taxMap[key] = (taxMap[key] || 0) + taxAmt;
    });
  });

  const rows: TaxRow[] = [];

  Object.entries(taxMap).forEach(([key, amount]) => {
    const [type, perStr] = key.split("_");
    const per = Number(perStr);

    if (type === "GST") {
      rows.push(
        {
          label: `(+ ) CGST (${per / 2}%)`,
          amount: amount / 2,
        },
        {
          label: `(+ ) SGST (${per / 2}%)`,
          amount: amount / 2,
        }
      );
    } else {
      rows.push({
        label: `(+ ) ${type} (${per}%)`,
        amount,
      });
    }
  });

  return rows;
};

const KotReceipt :React.FC<Props> = ({ navigation, route }) => {
const [receiptData, setReceiptData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [modifyKOT, setModifyKOT] = useState<KOT | null>(null);
  const [remark, setRemark] = React.useState("");
  const [inoputError, setInputerror] = useState("");

  const { token, table, bill,isMember } = route.params;
  const [settleLoading, setSettleLoading] = useState(false);
  const [remarks, setRemarks] = useState([]);
  const queryClient = useQueryClient();
  const fetchReceipt = async () => {
    try {
     const response = await javascriptGetLocal({
        Token: token,
        path: isMember?`${ENDPOINT.get_member_kot_reciept}${bill.BillNo}/${table.LocationCode}/${bill.YearCode}`:`${ENDPOINT.get_kot_reciept}${bill.BillNo}/${table.LocationCode}/${bill.YearCode}`,
      });
      console.log( response, '---------------------- response ---------------------');
      if(response.status){

        setReceiptData(response.data);
     
      }
    } catch (err) {
      setError("Failed to fetch receipt data.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchReceipt();
   
  }, []);
  useEffect(() => {
    const backAction = () => {
      // Navigate to Home screen
        navigation.reset({
                  routes: [{ name: "Home" }],
                });
      return true; // Prevent default behavior (exit app)
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    // Cleanup the event listener on unmount
    return () => backHandler.remove();
  }, [navigation]);
  
  const handleSettleBill = async () => {
    if (!receiptData) return Alert.alert("No receipt data available to print");
    setSettleLoading(true);
    console.log('\x1b[32m%s\x1b[0m', `${ENDPOINT.complete_kot_order}${bill.BillNo}/${table.LocationCode}/${bill.YearCode}`, '---------------------- `${ENDPOINT.complete_kot_order}${bill.BillNo}/${table.LocationCode}/${bill.YearCode}` ---------------------');
    const completeOrder = await javascriptGetLocal({
      Token: token,
      path: `${ENDPOINT.complete_kot_order}${bill.BillNo}/${table.LocationCode}/${bill.YearCode}`,
    });
    setSettleLoading(false);
    if (completeOrder.status == true) {
      queryClient.invalidateQueries(["HomeDetails"]);
      fetchReceipt();
      LayoutAnimation.configureNext(
        LayoutAnimation.easeInEaseOut()
      )
      Toast.show(completeOrder.message, { type: "success" });
      // navigation.navigate("StaffHome");
    } else {
      Toast.show("Somthing went wroung.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e88e5" />
        <Text style={styles.loadingText}>Loading receipt...</Text>
      </View>
    );
  }

  if (error || !receiptData) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "No receipt found."}</Text>
      </View>
    );
  }

  const handleModifyKOT = async ( KOT) => {
    if (!remark) {
      setInputerror("Please Enter Remark.");
      return;
    }
const isVoid: boolean = KOT.Items.every(
  (item: any) => Number(item.Qty) === 0
);

     const hasUpdatedItems = KOT.Items.some((item) => item.is_updated === true);

  if (!isVoid && !hasUpdatedItems) {
    Alert.alert("No Changes Detected", "Please modify at least one item quantity before proceeding.");
    return;
  }

    Alert.alert(
      isVoid ? "Confirm Void" : "Confirm Modification",
      isVoid
        ? "Are you sure you want to void this KOT? This action cannot be undone."
        : "Are you sure you want to modify this KOT?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isVoid ? "Void" : "Modify",
          style: "destructive",
          onPress: async () => {
            const body = {
              KOTNo: KOT.KOTNo,
              LocationCode: table.LocationCode,
              YearCode: bill.YearCode,
              Remark:remark,
              items: KOT.Items.map((item) => ({
                id: item.id,
                Qty: isVoid ? 0 : Number(item.Qty),
              })),
            };
       setSettleLoading(true)
            try {
              const response = await javascriptPostLocal({
                Token: token,
                path: ENDPOINT.modifyKOT,
                body,
              });
             setSettleLoading(false)
             console.log( response, '---------------------- response ---------------------');
              if (response.status === true) {
                Toast.show(
                  response.message ||
                    (isVoid
                      ? "KOT voided successfully."
                      : "KOT modified successfully."),
                  {
                    type: "success",
                  }
                );
                setModifyKOT(undefined);
                queryClient.invalidateQueries(["HomeDetails"]);
                fetchReceipt();
                  setRemark('')
              } else {
                Toast.show(response.message || "Failed to modify KOT.", {
                  type: "danger",
                });
                setModifyKOT(undefined);
                setRemark('')
              }
            } catch (error) {
               setRemark('')
              Toast.show("Failed to modify KOT.", { type: "danger" });
            }
          },
        },
      ]
    );
  };
  
  const {
    ModeOfPayment,
    MemberID,
    SC_ID,
    MemberName,
    BillNo,
    BillDate,
    OpeningBalance,
    ClosingBalance,
    Status,
    Vendor,
    Location,
    TableName,
    WaiterName,
    CashierName,
    KOTWiseData,
    Summary,
    can_modify
    
  } = receiptData;
//   const handlePrint = async () => {
//     if (!receiptData) return Alert.alert("No receipt data available to print");

//     // 🔹 Prepare Discount
//     const totalDiscount = KOTWiseData.reduce((total, kot) => {
//       return (
//         total +
//         kot.Items.reduce(
//           (acc, val) =>
//             acc +
//             (parseFloat(val.Rate || 0) *
//               parseFloat(val.Qty) *
//               parseFloat(val.DiscountPer || 0)) /
//               100,
//           0
//         )
//       );
//     }, 0);

//     // 🔹 Prepare GST / Tax Section
//    // 🔹 Prepare Tax Section (MULTIPLE GST SLABS FIXED)
// let taxSectionHtml = "";

// // key format: GST_5, GST_18, VAT_18 etc.
// const taxMap: Record<string, number> = {};

// KOTWiseData.forEach((kot) => {
//   kot.Items.forEach((item) => {
//     const qty = Number(item.Qty) || 0;
//     const rate = Number(item.Rate) || 0;
//     const discount = Number(item.DiscountPer) || 0;
//     const taxPer = Number(item.TaxPer) || 0;
//     const taxType = (item.TaxType || "").toUpperCase();

//     if (!taxType || taxPer <= 0) return;

//     const base = qty * rate;
//     const discountAmt = (base * discount) / 100;
//     const taxable = base - discountAmt;
//     const taxAmt = (taxable * taxPer) / 100;

//     const key = `${taxType}_${taxPer}`;
//     taxMap[key] = (taxMap[key] || 0) + taxAmt;
//   });
// });

// // 🔹 Build HTML rows
// Object.entries(taxMap).forEach(([key, amount]) => {
//   const [type, perStr] = key.split("_");
//   const per = Number(perStr);

//   if (type === "GST") {
//     taxSectionHtml += `
//       <tr>
//         <td>(+) CGST (${(per / 2).toFixed(1)}%)</td>
//         <td class="right">${(amount / 2).toFixed(2)}</td>
//       </tr>
//       <tr>
//         <td>(+) SGST (${(per / 2).toFixed(1)}%)</td>
//         <td class="right">${(amount / 2).toFixed(2)}</td>
//       </tr>
//     `;
//   } else {
//     taxSectionHtml += `
//       <tr>
//         <td>(+) ${type} (${per.toFixed(1)}%)</td>
//         <td class="right">${amount.toFixed(2)}</td>
//       </tr>
//     `;
//   }
// });

// const KOTNos = KOTWiseData.map(kot => kot.KOTNo).join(", ");

// // 🔹 Prepare KOT Items Section
//     const kotItemsHtml = KOTWiseData.map(
//       (kot) => `
//       ${kot.Items.map(
//         (item) => `
//         <tr>
//           <td style="max-width:120px; white-space:normal; word-wrap:break-word;">
//             ${item.ItemName}
//           </td>
//           <td class="center">${parseFloat(item.Rate).toFixed(2)}</td>
//           <td class="center">${Number(item.Qty)}</td>
//           <td class="right">${(item.Rate * Number(item.Qty)).toFixed(2)}</td>
//         </tr>`
//       ).join("")}
//     `
//     ).join("");

//     // 🔹 Final HTML (POS Layout)
//     const html = `
//   <html>
//     <head>
//       <meta name="viewport" content="width=device width, initial-scale=1.0">
//       <style>
//   /* 🔥 MOST IMPORTANT FOR THERMAL */
//   @page {
//   margin: 20;
//   size: auto;
// }

// html, body {
//   margin: 0;
//   padding: 4px;
//   font-family: monospace;
//   font-size: 12px;
//   height: auto;
//   display: inline-block;
// }

// table {
//   width: 100%;
//   border-collapse: collapse;
// }

// td, th {
//   font-size: 12px;
//   padding: 2px 0;
// }

// .center { text-align: center; }
// .right  { text-align: right; }

// hr {
//   border: none;
//   border-top: 1px dashed #000;
//   margin: 4px 0;
// }

// </style>

//     </head>
//     <body>
//       <div class="center">
//         <b style="font-weight:bold; font-size:24px;">${
//           Vendor?.Name || ""
//         }</b><br/>
//         ${Vendor?.Address || ""}, ${Vendor?.City || ""} - ${
//       Vendor?.Pincode || ""
//     }<br/>
//         Phone: ${Vendor?.Phone || ""}<br/>
//         GSTIN NO: ${Vendor?.GSTNo || ""}<br/>
//       </div>
//       <hr/>
//  <table>
//         <tr><td class="center"  style="font-weight:bold; font-size:28px;">${
//           Location?.LocationName || ""
//         }</td></tr>
//       </table>
//        <hr/>
//       <table>
//         <tr><td  style="font-weight:bold;">Bill No</td><td class="left">${
//           BillNo || ""
//         }</td><td class="left"  style="font-weight:bold;">Bill Date</td><td class="left">${
//       moment(BillDate).format("DD-MMM-YY") || ""
//     }</td>
//         <tr></tr>
        
//   <td  style="font-weight:bold; white-space: nowrap;">Created At</td>
//  <td class="left" style="white-space: nowrap;">
//   ${moment(BillDate).format("DD-MMM-YY hh:mm A") || ""}
// </td>
// </tr>
//         <tr><td  style="font-weight:bold;">Cashier</td><td class="left">${
//           CashierName || "N/A"
//         }</td></tr>
//         <tr><td  style="font-weight:bold;">Waiter</td><td class="left">${
//           WaiterName || "N/A"
//         }</td><td  style="font-weight:bold;">Table No</td><td class="left">${
//       TableName || "N/A"
//     }</td></tr>
//         <tr><td  style="font-weight:bold;">C_ID/M_ID</td><td class="left">${
//           SC_ID || "N/A"
//         }/${
//           MemberID || "N/A"
//         }</td></tr>
//          <tr><td  style="font-weight:bold;">Member Name</td><td class="left">${
//           MemberName || "N/A"
//         }</td></tr>
//          <tr><td  style="font-weight:bold;">Pay Mode</td><td class="left">${
//            ModeOfPayment || "N/A"
//          }</td></tr>
//       </table>
     
//       <hr/>

//       <table>
//         <tr>
//           <th>ItemName</th>
//           <th class="center">Rate</th>
//           <th class="center">Qty</th>
//           <th class="right">Amount</th>
//         </tr>
//         ${kotItemsHtml}
//       </table>

//       <hr/>
//       <table>
//         <tr><td>Subtotal</td><td class="right">${
//           Summary?.SubTotal?.toFixed(2) || "0.00"
//         }</td></tr>
//         <tr><td>Discount</td><td class="right" style="color:red;">${totalDiscount.toFixed(
//           2
//         )}</td></tr>
//         ${taxSectionHtml}
//         ${
//           Summary?.ServiceChargeAmount > 0
//             ? `<tr><td>Service Charge (${
//                 Summary?.ServiceChargePercent
//               }%)</td><td class="right">${Summary?.ServiceChargeAmount.toFixed(
//                 2
//               )}</td></tr>`
//             : ""
//         }
//         <tr><td>Round Off</td><td class="right">${Summary?.RoundOff?.toFixed(
//           2
//         )}</td></tr>
//         <tr><td><b>BILL AMOUNT</b></td><td class="right"><b>${
//           Summary?.AmountAfterRoundOff?.toFixed(2) || "0.00"
//         }</b></td></tr>
        
//       </table>
//       <hr/>
// <table>
// <tr><td><b>Opening Balance</b></td><td class="right"><b>${
//       OpeningBalance || "0.00"
//     }</b></td></tr>
//         <tr><td><b>Closing Balance</b></td><td class="right"><b>${
//           ClosingBalance || "0.00"
//         }</b></td></tr>
// </table>

//       <hr/>
//       <b class="left" style="display:block; text-align:left; white-space:nowrap;">
//   Order No(s): ${KOTNos}
// </b>
    
   
//     <div class="center">Thank you for dining with us!</div>
// <div class="center">--- Powered by Technyk ---</div>
//     </body>
//   </html>`;

//     try {
//       await RNPrint.print({ html, jobName: `Bill_${Date.now()}`, isLandscape: false, });
//     } catch (err) {
//       Alert.alert("Print Error", err.message);
//     }
//   };
const handlePrint = async (isPreview:boolean) => {
    if (!receiptData) return Alert.alert("No receipt data available to print");

    // 🔹 Prepare Discount
    const totalDiscount = KOTWiseData.reduce((total, kot) => {
      return (
        total +
        kot.Items.reduce(
          (acc, val) =>
            acc +
            (parseFloat(val.Rate || 0) *
              parseFloat(val.Qty) *
              parseFloat(val.DiscountPer || 0)) /
              100,
          0
        )
      );
    }, 0);

let taxSectionHtml = "";

// key format: GST_5, GST_18, VAT_18 etc.
const taxMap: Record<string, number> = {};

KOTWiseData.forEach((kot) => {
  kot.Items.forEach((item) => {
    const qty = Number(item.Qty) || 0;
    const rate = Number(item.Rate) || 0;
    const discount = Number(item.DiscountPer) || 0;
    const taxPer = Number(item.TaxPer) || 0;
    const taxType = (item.TaxType || "").toUpperCase();

    if (!taxType || taxPer <= 0) return;

    const base = qty * rate;
    const discountAmt = (base * discount) / 100;
    const taxable = base - discountAmt;
    const taxAmt = (taxable * taxPer) / 100;

    const key = `${taxType}_${taxPer}`;
    taxMap[key] = (taxMap[key] || 0) + taxAmt;
  });
});

// 🔹 Build HTML rows
Object.entries(taxMap).forEach(([key, amount]) => {
  const [type, perStr] = key.split("_");
  const per = Number(perStr);

  if (type === "GST") {
    taxSectionHtml += `
      <tr>
        <td>(+) CGST (${(per / 2).toFixed(1)}%)</td>
        <td class="right">${(amount / 2).toFixed(2)}</td>
      </tr>
      <tr>
        <td>(+) SGST (${(per / 2).toFixed(1)}%)</td>
        <td class="right">${(amount / 2).toFixed(2)}</td>
      </tr>
    `;
  } else {
    taxSectionHtml += `
      <tr>
        <td>(+) ${type} (${per.toFixed(1)}%)</td>
        <td class="right">${amount.toFixed(2)}</td>
      </tr>
    `;
  }
});

const KOTNos = KOTWiseData.map(kot => kot.KOTNo).join(", ");

// 🔹 Prepare KOT Items Section
 // 🔹 Merge items by ItemCode
const groupedItems: Record<string, any> = {};

KOTWiseData.forEach((kot) => {
  kot.Items.forEach((item) => {
    const key = item.ItemCode || item.ItemName; // fallback if no code

    if (groupedItems[key]) {
      groupedItems[key].Qty += Number(item.Qty);
    } else {
      groupedItems[key] = {
        ...item,
        Qty: Number(item.Qty),
      };
    }
  });
});

// 🔹 Convert to array
const mergedItems = Object.values(groupedItems);

// 🔹 Generate HTML
const kotItemsHtml = mergedItems.map(
  (item: any) => `
    <tr>
      <td style="max-width:120px; white-space:normal; word-wrap:break-word;">
        ${item.ItemName}
      </td>
      <td class="center">${parseFloat(item.Rate).toFixed(2)}</td>
      <td class="center">${item.Qty}</td>
      <td class="right">${(item.Rate * item.Qty).toFixed(2)}</td>
    </tr>
  `
).join("");

    // 🔹 Final HTML (POS Layout)
    const html = `
  <html>
    <head>
      <meta name="viewport" content="width=device width, initial-scale=1.0">
      <style>
  /* 🔥 MOST IMPORTANT FOR THERMAL */
 @page {
   margin: 10px 50px;
  
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  font-family: monospace;
  font-size: 12px;
}

/* 🔥 Important: force full width */
body {
  width: 100%;
}

table {
  width: 100%;
  border-collapse: collapse;
}

td, th {
  font-size: 24px;
  padding: 2px 0;
}

.center { text-align: center; font-size: 18px; }
.right  { text-align: right;font-size: 18px; }
.left   { text-align: left; font-size: 18px;}

hr {
  border: none;
  border-top: 1px dashed #000;
  margin: 4px 0;
}

</style>

    </head>
    <body>
      <div class="center">
        <b style="font-weight:bold; font-size:24px;">${
          Vendor?.Name || ""
        }</b><br/>
        ${Vendor?.Address || ""}, ${Vendor?.City || ""} - ${
      Vendor?.Pincode || ""
    }<br/>
        Phone: ${Vendor?.Phone || ""}<br/>
     ${
    Vendor?.GSTNo
      ? `GSTIN NO: ${Vendor.GSTNo}<br/>`
      : ""
  }
      </div>
      <hr/>
 <table>
        <tr><td class="center"  style="font-weight:bold; font-size:28px;">${
          Location?.LocationName || ""
        }</td></tr>
      </table>
       <hr/>
      <table>
        <tr><td  style="font-weight:bold;">Bill No</td><td class="left">${
          BillNo || ""
        }</td><td class="left"  style="font-weight:bold;">Bill Date</td><td class="left">${
      moment(BillDate).format("DD-MMM-YY") || ""
    }</td>
        <tr></tr>
        
  <td  style="font-weight:bold; white-space: nowrap;">Created At</td>
 <td class="left" style="white-space: nowrap;">
  ${moment(BillDate).format("DD-MMM-YY HH:mm") || ""}
</td>
</tr>
        <tr><td  style="font-weight:bold;">Cashier</td><td class="left">${
          CashierName || "N/A"
        }</td></tr>
        <tr><td  style="font-weight:bold;">Waiter</td><td class="left">${
          WaiterName || "N/A"
        }</td><td  style="font-weight:bold;">Table No</td><td class="left">${
      TableName || "N/A"
    }</td></tr>
        <tr><td  style="font-weight:bold;">C_ID/M_ID</td><td class="left">${
          SC_ID || "N/A"
        }/${
          MemberID || "N/A"
        }</td></tr>
         <tr><td  style="font-weight:bold;">Member Name</td><td class="left">${
          MemberName || "N/A"
        }</td></tr>
         <tr><td  style="font-weight:bold;">Pay Mode</td><td class="left">${
           ModeOfPayment || "N/A"
         }</td></tr>
      </table>
     
      <hr/>

      <table>
        <tr>
          <th>ItemName</th>
          <th class="center">Rate</th>
          <th class="center">Qty</th>
          <th class="right">Amount</th>
        </tr>
        ${kotItemsHtml}
      </table>

      <hr/>
      <table>
        <tr><td>Subtotal</td><td class="right">${
          Summary?.SubTotal?.toFixed(2) || "0.00"
        }</td></tr>
        <tr><td>Discount</td><td class="right" style="color:red;">${totalDiscount.toFixed(
          2
        )}</td></tr>
        ${taxSectionHtml}
        ${
          Summary?.ServiceChargeAmount > 0
            ? `<tr><td>Service Charge (${
                Summary?.ServiceChargePercent
              }%)</td><td class="right">${Summary?.ServiceChargeAmount.toFixed(
                2
              )}</td></tr>`
            : ""
        }
        <tr><td>Round Off</td><td class="right">${Summary?.RoundOff?.toFixed(
          2
        )}</td></tr>
        <tr><td><b>BILL AMOUNT</b></td><td class="right"><b>${
          Summary?.AmountAfterRoundOff?.toFixed(2) || "0.00"
        }</b></td></tr>
        
      </table>
      <hr/>

<table>
<tr><td><b>Opening Balance</b></td><td class="right"><b>${
  OpeningBalance || "0.00"
}</b></td></tr>
<tr><td><b>Closing Balance</b></td><td class="right"><b>${
  ClosingBalance || "0.00"
}</b></td></tr>
</table>
  <hr/>


    
      <b class="left" style="display:block; text-align:left; white-space:nowrap;">
  Order No(s): ${KOTNos}
</b>
    
   
    <div class="center">Thank you for dining with us!</div>
<div class="center">--- Powered by Technyk ---</div>
    </body>
  </html>`;

    try {
      await RNPrint.print({ html, jobName: `Bill_${Date.now()}`, isLandscape: false, });
    } catch (err) {
      Alert.alert("Print Error", err.message);
    }
  };
  
  const handleSetKOT = async (kot, isVoid) => {
    if (!remarks.length) {
      const remarks = await javascriptGetLocal({
        path: ENDPOINT.kot_remarks,
        Token: token,
      });
      setRemarks(remarks.data);
    }
    if (isVoid) {
      setModifyKOT(
        (kot.Items = kot.Items.map((item) => ({
          ...item,
          Qty: 0,
        }))),
      );
    }
    setModifyKOT(kot);
  };
  const taxRows = calculateTaxes(KOTWiseData);
  return (
    <>
    <Header toHome={true} title="Order Details"/>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ✅ Header */}
        <View style={styles.header}>
          <MaterialIcons name="dinner-dining" size={32} color="#1e88e5" />
          <Text style={styles.vendorName}>{Vendor?.Name}</Text>
          <Text style={styles.vendorAddress}>
            {Vendor?.Address}, {Vendor?.City}, {Vendor?.State} -{" "}
            {Vendor?.Pincode}
          </Text>
          <Text style={styles.vendorInfo}>📞 {Vendor?.Phone}</Text>
         {Vendor?.GSTNo && <Text style={styles.vendorInfo}>GST: {Vendor?.GSTNo}</Text>}
        </View>

        <View style={styles.divider} />

        {/* ✅ Bill Info */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <MaterialIcons
              name="credit-card"
              size={20}
              color="#333"
              style={styles.icon}
            />
            <Text style={styles.infoLabel}>BillNo</Text>
            <Text style={styles.kotTitle}>{BillNo}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons
              name="location-on"
              size={20}
              color="#333"
              style={styles.icon}
            />
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{Location?.LocationName}</Text>
          </View>

         {!isMember && <View style={styles.infoRow}>
            <MaterialIcons
              name="restaurant"
              size={20}
              color="#333"
              style={styles.icon}
            />
            <Text style={styles.infoLabel}>Table</Text>
            <Text style={styles.infoValue}>{TableName || "N/A"}</Text>
          </View>}

        {!isMember &&  <View style={styles.infoRow}>
            <MaterialIcons
              name="person-outline"
              size={20}
              color="#333"
              style={styles.icon}
            />
            <Text style={styles.infoLabel}>Waiter</Text>
            <Text style={styles.infoValue}>{WaiterName || "N/A"}</Text>
          </View>}

          {!isMember && <View style={styles.infoRow}>
            <MaterialIcons
              name="account-balance-wallet"
              size={20}
              color="#333"
              style={styles.icon}
            />
            <Text style={styles.infoLabel}>Cashier</Text>
            <Text style={styles.infoValue}>{CashierName || "N/A"}</Text>
          </View>}
           <View style={styles.infoRow}>
            <MaterialIcons
              name="access-time-filled"
              size={20}
              color="#333"
              style={styles.icon}
            />
            <Text style={styles.infoLabel}>Created At</Text>
            <Text style={styles.infoValue}>{moment(BillDate).format("DD-MMM-YY hh:mm A") || "N/A"}</Text>
          </View>
        </View>
        <View style={[styles.itemRow, { marginHorizontal: 10 }]}>
          <Text style={styles.itemName}>Item</Text>
          <Text style={styles.itemQty}>Qty</Text>
          <Text style={styles.itemRate}>Rate</Text>
          <Text style={[styles.itemAmount, { fontFamily: FONT_FAMILY.normal }]}>
            Amt
          </Text>
        </View>
        {/* ✅ KOT Sections */}
        {KOTWiseData?.map((kot, index) => (
          <View key={index} style={styles.kotCard}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={styles.kotTitle}>🧾 Order No: {kot.KOTNo}</Text>
              { !isMember && can_modify && (
                <Pressable onPress={() => handleSetKOT(kot,false)}>
                  <MaterialIcons
                    name="edit-document"
                    size={25}
                    color={DARK_BLUE}
                  />
                </Pressable>
              )}
            </View>

            {kot.Items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.ItemName}</Text>
                <Text style={styles.itemQty}>{Number(item.Qty)}</Text>
                <Text style={styles.itemRate}>{item.Rate}</Text>
                <Text style={styles.itemAmount}>
                  {(item.Rate * Number(item.Qty)).toFixed(2)}
                </Text>
              </View>
            ))}
            { !isMember && can_modify && (
              <Pressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  alignSelf: "flex-end",
                  borderWidth: 0.5,
                  padding: 3,
                  borderRadius: 4,
                  borderColor: "red",
                  marginTop: 5,
                }}
                onPress={() => handleSetKOT(kot, true)}
              >
                <MaterialIcons name="block" size={20} color="red" />
                <Text
                  style={{
                    color: "red",
                    marginLeft: 5,
                    fontFamily: FONT_FAMILY.normal,
                  }}
                >
                  Void KOT
                </Text>
              </Pressable>
            )}
          </View>
        ))}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryHeader}>Bill Summary</Text>

          {/* ✅ Subtotal */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {Summary?.SubTotal?.toFixed(2) || "0.00"}
            </Text>
          </View>

          {/* ✅ Discount */}
          <View style={styles.summaryRow}>
            <Text
              style={[styles.billText, { fontFamily: FONT_FAMILY.semiBold }]}
            >
              Discount
            </Text>
            <Text
              style={[
                styles.billText,
                {
                  textAlign: "right",
                  fontFamily: FONT_FAMILY.semiBold,
                  color: "red",
                  fontSize: 16,
                },
              ]}
            >
              -
              {KOTWiseData.reduce((total, kot) => {
                return (
                  total +
                  kot.Items.reduce(
                    (acc, val) =>
                      acc +
                      (parseFloat(val.Rate || 0) *
                        parseFloat(val.Qty) *
                        parseFloat(val.DiscountPer || 0)) /
                        100,
                    0
                  )
                );
              }, 0).toFixed(2)}
            </Text>
          </View>

          {/* ✅ Tax Section */}
          <View>
         

{taxRows.map((tax, index) => (
  <View key={index} style={styles.summaryRow}>
    <Text
      style={[
        styles.billText,
        { fontFamily: FONT_FAMILY.semiBold },
      ]}
    >
      {tax.label}
    </Text>
    <Text
      style={[
        styles.billText,
        {
          textAlign: "right",
          fontFamily: FONT_FAMILY.semiBold,
          fontSize: 16,
        },
      ]}
    >
      {tax.amount.toFixed(2)}
    </Text>
  </View>
))}

          </View>

          {/* ✅ Service Charge */}
          {Summary?.ServiceChargeAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Service Charge ({Summary?.ServiceChargePercent}%)
              </Text>
              <Text style={styles.summaryValue}>
                {Summary?.ServiceChargeAmount.toFixed(2)}
              </Text>
            </View>
          )}

          {/* ✅ Round Off */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Round Off</Text>
            <Text style={styles.summaryValue}>
              {Summary?.RoundOff.toFixed(2)}
            </Text>
          </View>

          {/* ✅ Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Amount Payable</Text>
            <Text style={styles.totalValue}>
              {Summary?.AmountAfterRoundOff?.toFixed(2)}
            </Text>
          </View>
        </View>
{ Status &&
     <View style={[styles.summaryCard]}>
        <View style={styles.summaryRow}>
      <Text style={styles.itemName}>Opening Balance</Text>
      <Text style={[styles.itemName,{fontFamily:FONT_FAMILY.semiBold,textAlign:'right'}]}>{OpeningBalance}</Text>
        </View>
        <View style={styles.summaryRow}>
      <Text style={styles.itemName}>Closing Balance</Text>
      
     <Text style={[styles.itemName,{fontFamily:FONT_FAMILY.semiBold,textAlign:'right'}]}>{ClosingBalance}</Text>
        </View>
      </View>}
        {/* ✅ Footer */}
        <Text style={styles.footerText}>Thank you for dining with us!</Text>
        <Text style={styles.powered}>Powered by Technyk</Text>
      
      </ScrollView>
    {!isMember &&  <View
        style={{
          margin: 20,
          justifyContent: "flex-end",
          flexDirection: "row",
          bottom: 0,
        }}
      >
      
        {!Status ? (
          <Pressable
          disabled={settleLoading}
            onPress={handleSettleBill}
            style={{
              backgroundColor: "#299c12ff",
              padding: 10,
              borderRadius: 7,
              elevation: 9,
              flexDirection: "row",
              // alignSelf:'flex-end'
              // justifyContent:'flex-end'
            }}
          >
            {settleLoading ? (
              <ActivityIndicator color={"white"} size={"small"} />
            ) : (
              <MaterialIcons
                name="card-membership"
                size={20}
                color="white"
                style={styles.icon}
              />
            )}
            <Text style={{ color: "white", fontFamily: FONT_FAMILY.semiBold }}>
              Settle Bill
            </Text>
          </Pressable>
        ):(  <Pressable
          onPress={handlePrint}
          style={{
            backgroundColor: "#1e88e5",
            padding: 10,
            borderRadius: 7,
            elevation: 9,
            flexDirection: "row",
          }}
        >
          <MaterialIcons
            name="print"
            size={20}
            color="white"
            style={styles.icon}
          />
          <Text style={{ color: "white", fontFamily: FONT_FAMILY.semiBold }}>
            Print Bill
          </Text>
        </Pressable>)}
      </View>}

      <UniversalModal
        title={"Modify KOT"}
        visible={!!modifyKOT}
        isFull={true}
        setVisible={() => {
          setModifyKOT(undefined);
        }}
      >
        <View style={{ flex: 1,padding:10 }}>
          <Text style={styles.kotTitle}>🧾 Order No: {modifyKOT?.KOTNo}</Text>

          <FlatList
            data={modifyKOT?.Items || []}
            renderItem={({ item, index }) => (
              <View key={index} style={{ flexDirection: "row", marginTop: 10 }}>
                <Text style={styles.itemName}>{item.ItemName}</Text>

                <View style={styles.qtyContainer}>
                  {/* ➤ Decrease Qty Button */}
                  <Pressable
                    onPress={() => {
                      if (Number(item.Qty) > 0) {
                        setModifyKOT((prev) => {
                          const updatedItems = prev.Items.map((i) =>
                            i.ItemName === item.ItemName
                              ? {
                                  ...i,
                                  Qty: Number(i.Qty) - 1,
                                  is_updated: true,
                                }
                              : i
                          );
                          return { ...prev, Items: updatedItems };
                        });
                      }
                    }}
                    style={[
                      styles.qtyButton,
                      { opacity: Number(item.Qty) > 0 ? 1 : 0.5 }, // disable if qty = 1
                    ]}
                  >
                    <Text style={styles.qtyText}>−</Text>
                  </Pressable>

                  {/* ➤ Current Qty */}
                  <Text style={styles.qtyNumber}>{Number(item.Qty)}</Text>

                  {/* ➤ Disable or Hide Add Button */}
                  <Pressable
                    disabled // 👈 disable the + button
                    style={[styles.qtyButton, { opacity: 0.3 }]} // faded to show disabled
                  >
                    <Text style={styles.qtyText}>+</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </View>
        <View style={{padding:10}}>

        <TextInput
          value={remark}
          onChangeText={(text) => {
            if (inoputError) {
              setInputerror("");
            }
            setRemark(text);
          }}
          style={{
            borderWidth: 1,
            borderColor: inoputError ? "red" : "black",
            borderRadius: 5,
            padding: 10,
            marginTop: 10,
            fontFamily: FONT_FAMILY.normal,
            color: "black",
          }}
          placeholder="Add Remark"
          placeholderTextColor={"grey"}
          keyboardType="default"
        />
        {inoputError && (
          <Text
            style={{
              fontSize: 14,
              color: "red",
              fontFamily: FONT_FAMILY.normal,
            }}
          >
            {inoputError}
          </Text>
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
          {remarks.map((item) => (
            <View>
              <Pressable
                onPress={() => {
                  setInputerror("");
                  setRemark((prev) => prev + item.Remarks + ", ");
                }}
                style={{
                  backgroundColor: LIGHT_BLUE,
                  padding: 5,
                  marginVertical: 2,
                  borderRadius: 4,
                  marginRight:5
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: "#1e293b",
                    fontFamily: FONT_FAMILY.normal,
                  }}
                >
                  {item.Remarks}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
        <Pressable
          style={[
            styles.qtyButton,
            {
              flexDirection:'row',
              borderColor: "green",
              borderWidth: 1,
              borderRadius: 5,
              alignSelf: "flex-end",
              margin: 10,
            },
          ]} // faded to show disabled
          onPress={() => handleModifyKOT( modifyKOT)}
        >

        {settleLoading && <ActivityIndicator  size={'small'} color={'green'} style={{marginRight:10}}/>}
          <Text style={styles.qtyText}>Modify</Text>
        </Pressable>
        </View>

      </UniversalModal>
    </>
  );
};

export default KotReceipt;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafc", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 8, fontSize: 16, color: "#555" },
  errorText: { color: "red", fontSize: 16 },

  header: { alignItems: "center", marginBottom: 16 },
  vendorName: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bold,
    color: "#1e293b",
    marginTop: 6,
    textAlign: "center",
  },
  vendorAddress: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    marginTop: 4,
    fontFamily: FONT_FAMILY.normal,
  },
  vendorInfo: { fontSize: 13, color: "#64748b", marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 10,
  },

  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  icon: {
    marginRight: 8,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
  },
  infoValue: {
    fontSize: 14,
    color: "#000",
    fontWeight: "500",
  },
  kotCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  kotTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: "#1e88e5",
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0.4,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 6,
  },
  itemName: {
    flex: 2,
    fontSize: 14,
    color: "#1e293b",
    fontFamily: FONT_FAMILY.normal,
  },
  itemQty: { width: 30, textAlign: "right", color: "#475569" },
  itemRate: { width: 80, textAlign: "right", color: "#475569" },
  itemAmount: {
    width: 100,
    textAlign: "right",
    fontWeight: "600",
    color: "#1e293b",
  },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryHeader: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    marginBottom: 6,
    color: "#1e293b",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3,
  },
  summaryLabel: { color: "#475569", fontSize: 14 },
  summaryValue: { color: "#1e293b", fontSize: 14, fontWeight: "500" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    marginTop: 8,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: { fontSize: 16, fontFamily: FONT_FAMILY.bold, color: "#000" },
  totalValue: { fontSize: 16, fontFamily: FONT_FAMILY.bold, color: "#1e88e5" },

  footerText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
    color: "#475569",
    fontFamily: FONT_FAMILY.normal,
  },
  powered: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
    color: "#94a3b8",
  },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "green",
    paddingHorizontal: 5,
  },
  qtyButton: { paddingHorizontal: 10, paddingVertical: 5 },
  qtyText: {
    fontSize: 16,
    color: "green",
    fontFamily: FONT_FAMILY.bold,
  },
  qtyNumber: {
    color: "black",
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
  },
  billText: {
    color: "black",
    fontFamily: FONT_FAMILY.normal,
    fontSize: 14,
  },
});

// import React, { useEffect, useState } from "react";
// import {
//   StyleSheet,
//   Text,
//   View,
//   ActivityIndicator,
//   ScrollView,
//   Pressable,
//   Alert,
//   TextInput,
//   FlatList,
//   LayoutAnimation,
// } from "react-native";
// import MaterialIcons from "react-native-vector-icons/MaterialIcons";
// import RNPrint from "react-native-print"; // 👈 Import
// import { Toast } from "react-native-toast-notifications";
// import { useQueryClient } from "@tanstack/react-query";
// import moment from "moment";
// import { ENDPOINT } from "../../util/constant";
// import { javascriptGetLocal, javascriptPostLocal } from "../../util/api";
// import { DARK_BLUE, FONT_FAMILY, GREY_COLOR, LIGHT_BLUE, SECONDARY_COLOR } from "../../util/colors";
// import UniversalModal from "../../components/UniversalModal";
// import { RootStackParamList } from "../../navigation/AppDrawer";
// import { NativeStackScreenProps } from "@react-navigation/native-stack";
// import Header from "../../components/Header";
// type Props = NativeStackScreenProps<RootStackParamList, "KotReceipt">;
// interface KOTItem {
//   id: number;
//   ItemName: string;
//   Qty: number;
//   Rate: number;
//   DiscountPer: number;
//   TaxPer: number;
//   TaxType: string;
//   is_updated?: boolean;
// }

// interface KOT {
//   KOTNo: string;
//   Items: KOTItem[];
// }
// const KotReceipt :React.FC<Props> = ({ navigation, route }) => {
// const [receiptData, setReceiptData] = useState<any | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string|null>(null);
//   const [modifyKOT, setModifyKOT] = useState<KOT | null>(null);
//   const [remark, setRemark] = React.useState("");
//   const [inoputError, setInputerror] = useState("");
//   const { token, table, bill,isMember } = route.params;
//   const [settleLoading, setSettleLoading] = useState(false);
//   const [remarks, setRemarks] = useState([]);
//   const queryClient = useQueryClient();
//   const fetchReceipt = async () => {
//     try {
//      const response = await javascriptGetLocal({
//         Token: token,
//         path: isMember?`${ENDPOINT.get_member_kot_reciept}${bill.BillNo}/${table.LocationCode}/${bill.YearCode}`:`${ENDPOINT.get_kot_reciept}${bill.BillNo}/${table.LocationCode}/${bill.YearCode}`,
//       });
//       if(response.status){

//         setReceiptData(response.data);
//     //       if(route.params?.single_kot_service ){
//     //   handleSettleBill()
//     // }
//       }
//     } catch (err) {
//       setError("Failed to fetch receipt data.");
//     } finally {
//       setLoading(false);
//     }
//   };
//   useEffect(() => {
//     fetchReceipt();
   
//   }, []);
  
//   const handleSettleBill = async () => {
//     if (!receiptData) return Alert.alert("No receipt data available to print");
//     setSettleLoading(true);
//     console.log('\x1b[32m%s\x1b[0m', `${ENDPOINT.complete_kot_order}${bill.BillNo}/${table.LocationCode}/${bill.YearCode}`, '---------------------- `${ENDPOINT.complete_kot_order}${bill.BillNo}/${table.LocationCode}/${bill.YearCode}` ---------------------');
//     const completeOrder = await javascriptGetLocal({
//       Token: token,
//       path: `${ENDPOINT.complete_kot_order}${bill.BillNo}/${table.LocationCode}/${bill.YearCode}`,
//     });
//     setSettleLoading(false);
//     if (completeOrder.status == true) {
//       queryClient.invalidateQueries(["HomeDetails"]);
//       fetchReceipt();
//       LayoutAnimation.configureNext(
//         LayoutAnimation.easeInEaseOut()
//       )
//       Toast.show(completeOrder.message, { type: "success" });
//       // navigation.navigate("StaffHome");
//     } else {
//       Toast.show("Somthing went wroung.");
//     }
//   };

//   if (loading) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" color="#1e88e5" />
//         <Text style={styles.loadingText}>Loading receipt...</Text>
//       </View>
//     );
//   }

//   if (error || !receiptData) {
//     return (
//       <View style={styles.center}>
//         <Text style={styles.errorText}>{error || "No receipt found."}</Text>
//       </View>
//     );
//   }

//   const handleModifyKOT = async ( KOT) => {
//     if (!remark) {
//       setInputerror("Please Enter Remark.");
//       return;
//     }
// const isVoid: boolean = KOT.Items.every(
//   (item: any) => Number(item.Qty) === 0
// );

//      const hasUpdatedItems = KOT.Items.some((item) => item.is_updated === true);

//   if (!isVoid && !hasUpdatedItems) {
//     Alert.alert("No Changes Detected", "Please modify at least one item quantity before proceeding.");
//     return;
//   }

//     Alert.alert(
//       isVoid ? "Confirm Void" : "Confirm Modification",
//       isVoid
//         ? "Are you sure you want to void this KOT? This action cannot be undone."
//         : "Are you sure you want to modify this KOT?",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: isVoid ? "Void" : "Modify",
//           style: "destructive",
//           onPress: async () => {
//             const body = {
//               KOTNo: KOT.KOTNo,
//               LocationCode: table.LocationCode,
//               YearCode: bill.YearCode,
//               Remark:remark,
//               items: KOT.Items.map((item) => ({
//                 id: item.id,
//                 Qty: isVoid ? 0 : Number(item.Qty),
//               })),
//             };
//        setSettleLoading(true)
//             try {
//               const response = await javascriptPostLocal({
//                 Token: token,
//                 path: ENDPOINT.modifyKOT,
//                 body,
//               });
//              setSettleLoading(false)
//               if (response.status === true) {
//                 Toast.show(
//                   response.message ||
//                     (isVoid
//                       ? "KOT voided successfully."
//                       : "KOT modified successfully."),
//                   {
//                     type: "success",
//                   }
//                 );
//                 setModifyKOT(undefined);
//                 queryClient.invalidateQueries(["HomeDetails"]);
//                 fetchReceipt();
//                   setRemark('')
//               } else {
//                 Toast.show(response.message || "Failed to modify KOT.", {
//                   type: "danger",
//                 });
//                 setModifyKOT(undefined);
//                 setRemark('')
//               }
//             } catch (error) {
//                setRemark('')
//               Toast.show("Failed to modify KOT.", { type: "danger" });
//             }
//           },
//         },
//       ]
//     );
//   };
  
//   const {
//     ModeOfPayment,
//     MemberID,
//     SC_ID,
//     BillNo,
//     BillDate,
//     OpeningBalance,
//     ClosingBalance,
//     Status,
//     Vendor,
//     Location,
//     TableName,
//     WaiterName,
//     CashierName,
//     KOTWiseData,
//     Summary,
//     can_modify
    
//   } = receiptData;
//   const handlePrint = async () => {
//     if (!receiptData) return Alert.alert("No receipt data available to print");

//     // 🔹 Prepare Discount
//     const totalDiscount = KOTWiseData.reduce((total, kot) => {
//       return (
//         total +
//         kot.Items.reduce(
//           (acc, val) =>
//             acc +
//             (parseFloat(val.Rate || 0) *
//               parseFloat(val.Qty) *
//               parseFloat(val.DiscountPer || 0)) /
//               100,
//           0
//         )
//       );
//     }, 0);

//     // 🔹 Prepare GST / Tax Section
//     let taxSectionHtml = "";
//   // 🔹 Prepare Tax Section (matching the RN UI format)
// const allItems = KOTWiseData.flatMap((kot) => kot.Items);
// let GSTVal = 0;
// let GSTCount = 0;

// // Build tax details
// const taxDetails = allItems.reduce((acc, item) => {
//   const qty = parseFloat(item.Qty) || 0;
//   const rate = parseFloat(item.Rate) || 0;
//   const discount = parseFloat(item.DiscountPer) || 0;
//   const taxPer = parseFloat(item.TaxPer) || 0;
//   const taxType = (item.TaxType || "").toUpperCase();

//   if (taxType === "GST") {

   
//     GSTVal += taxPer; // accumulate GST %
//     GSTCount += 1;
//   }

//   const base = qty * rate;
//   const discountAmt = base * (discount / 100);
//   const taxable = base - discountAmt;
//   const taxAmt = (taxable * taxPer) / 100;

//   if (!acc[taxType])
//     acc[taxType] = { totalTax: 0, totalItems: 0, avgRate: 0 };

//   acc[taxType].totalTax += taxAmt;
//   acc[taxType].totalItems += 1;
//   acc[taxType].avgRate += taxPer;

//   return acc;
// }, {});

// // Average tax % per type
// Object.keys(taxDetails).forEach((type) => {
//   taxDetails[type].avgRate =
//     taxDetails[type].totalItems > 0
//       ? taxDetails[type].avgRate / taxDetails[type].totalItems
//       : 0;
// });

// const totalItems = allItems.length;
// const gstItems = taxDetails["GST"]?.totalItems || 0;
// const gstDominant = gstItems / totalItems >= 0.5;

// // 🔸 GST dominant case (show CGST + SGST)
// if (gstDominant) {
//   const gstTax = taxDetails["GST"]?.totalTax || 0;
//   const cgst = gstTax / 2;
//   const sgst = gstTax / 2;

// GSTVal = GSTCount > 0 ? GSTVal / GSTCount : 0;
//   taxSectionHtml = `
//     <tr><td>(+) CGST (${(GSTVal / 2).toFixed(2)}%)</td>
//         <td class="right">${cgst.toFixed(2)}</td></tr>
//     <tr><td>(+) SGST (${(GSTVal / 2).toFixed(2)}%)</td>
//         <td class="right">${sgst.toFixed(2)}</td></tr>
//     ${Object.entries(taxDetails)
//       .filter(([type]) => type !== "GST")
//       .map(
//         ([type, val]) =>
//           `<tr><td>(+) ${type} (${val.avgRate.toFixed(2)}%)</td>
//                <td class="right">${val.totalTax.toFixed(2)}</td></tr>`
//       )
//       .join("")}
//   `;
// } else {
//   // 🔸 Non-GST case
//   taxSectionHtml = Object.entries(taxDetails)
//     .map(
//       ([type, val]) =>
//         `<tr><td>(+) ${type} (${val.avgRate.toFixed(2)}%)</td>
//              <td class="right">${val.totalTax.toFixed(2)}</td></tr>`
//     )
//     .join("");
// }
// const KOTNos = KOTWiseData.map(kot => kot.KOTNo).join(", ");

// // 🔹 Prepare KOT Items Section
//     const kotItemsHtml = KOTWiseData.map(
//       (kot) => `
//       ${kot.Items.map(
//         (item) => `
//         <tr>
//           <td style="max-width:120px; white-space:normal; word-wrap:break-word;">
//             ${item.ItemName}
//           </td>
//           <td class="center">${parseFloat(item.Rate).toFixed(2)}</td>
//           <td class="center">${Number(item.Qty)}</td>
//           <td class="right">${(item.Rate * Number(item.Qty)).toFixed(2)}</td>
//         </tr>`
//       ).join("")}
//     `
//     ).join("");

//     // 🔹 Final HTML (POS Layout)
//     const html = `
//   <html>
//     <head>
//       <meta name="viewport" content="width=device width, initial-scale=1.0">
//       <style>
//         body {
//           font-family: monospace;
//           font-size: 26px;
//           width: device width; /* ✅ fits 58mm paper */
//           margin: 10px;
//           word-wrap: break-word;
//           text-align: center; /* ✅ center all layout */
//         }
//         table {
//           width: 100%;
//           border-collapse: collapse;
          
//           margin: 0 auto;
//           text-align: left;
//         }
//         td, th {
//           padding: 2px 0;
//           vertical-align: top;
//           font-size: 22px;
//           word-wrap: break-word;
//           overflow-wrap: break-word;
//         }
//         .center { text-align: center; }
//         .right { text-align: right; }
//         hr {
//           border: none;
//           border-top: 1px solid #000;
//           margin: 4px 0;
//         }
//         th {
//           text-align: left;
//           border-bottom: 1px solid #000;
//         }
//       </style>
//     </head>
//     <body>
//       <div class="center">
//         <b style="font-weight:bold; font-size:24px;">${
//           Vendor?.Name || ""
//         }</b><br/>
//         ${Vendor?.Address || ""}, ${Vendor?.City || ""} - ${
//       Vendor?.Pincode || ""
//     }<br/>
//         Phone: ${Vendor?.Phone || ""}<br/>
//         GSTIN NO: ${Vendor?.GSTNo || ""}<br/>
//       </div>
//       <hr/>
//  <table>
//         <tr><td class="center"  style="font-weight:bold; font-size:28px;">${
//           Location?.LocationName || ""
//         }</td></tr>
//       </table>
//        <hr/>
//       <table>
//         <tr><td  style="font-weight:bold;">Bill No</td><td class="left">${
//           BillNo || ""
//         }</td><td class="left"  style="font-weight:bold;">Bill Date</td><td class="left">${
//       moment(BillDate).format("DD-MMM-YY") || ""
//     }</td>
//         <tr></tr>
        
//   <td  style="font-weight:bold; white-space: nowrap;">Created At</td>
//  <td class="left" style="white-space: nowrap;">
//   ${moment(BillDate).format("DD-MMM-YY hh:mm A") || ""}
// </td>
// </tr>
//         <tr><td  style="font-weight:bold;">Cashier</td><td class="left">${
//           CashierName || "N/A"
//         }</td></tr>
//         <tr><td  style="font-weight:bold;">Waiter</td><td class="left">${
//           WaiterName || "N/A"
//         }</td><td  style="font-weight:bold;">Table No</td><td class="left">${
//       TableName || "N/A"
//     }</td></tr>
//         <tr><td  style="font-weight:bold;">C_ID/M_ID</td><td class="left">${
//           SC_ID || "N/A"
//         }/${
//           MemberID || "N/A"
//         }</td></tr>
//          <tr><td  style="font-weight:bold;">Pay Mode</td><td class="left">${
//            ModeOfPayment || "N/A"
//          }</td></tr>
//       </table>
     
//       <hr/>

//       <table>
//         <tr>
//           <th>ItemName</th>
//           <th class="center">Rate</th>
//           <th class="center">Qty</th>
//           <th class="right">Amount</th>
//         </tr>
//         ${kotItemsHtml}
//       </table>

//       <hr/>
//       <table>
//         <tr><td>Subtotal</td><td class="right">${
//           Summary?.SubTotal?.toFixed(2) || "0.00"
//         }</td></tr>
//         <tr><td>Discount</td><td class="right" style="color:red;">${totalDiscount.toFixed(
//           2
//         )}</td></tr>
//         ${taxSectionHtml}
//         ${
//           Summary?.ServiceChargeAmount > 0
//             ? `<tr><td>Service Charge (${
//                 Summary?.ServiceChargePercent
//               }%)</td><td class="right">${Summary?.ServiceChargeAmount.toFixed(
//                 2
//               )}</td></tr>`
//             : ""
//         }
//         <tr><td>Round Off</td><td class="right">${Summary?.RoundOff?.toFixed(
//           2
//         )}</td></tr>
//         <tr><td><b>BILL AMOUNT</b></td><td class="right"><b>${
//           Summary?.AmountAfterRoundOff?.toFixed(2) || "0.00"
//         }</b></td></tr>
        
//       </table>
//       <hr/>
// <table>
// <tr><td><b>Opening Balance</b></td><td class="right"><b>${
//       OpeningBalance || "0.00"
//     }</b></td></tr>
//         <tr><td><b>Closing Balance</b></td><td class="right"><b>${
//           ClosingBalance || "0.00"
//         }</b></td></tr>
// </table>

//       <hr/>
//       <b class="left" style="display:block; text-align:left; white-space:nowrap;">
//   Order No(s): ${KOTNos}
// </b>
    
   
//       <div class="center">
//         <p>Thank you for dining with us!</p>
//         <p>--- Powered by Technyk ---</p>
//       </div>
//     </body>
//   </html>`;

//     try {
//       await RNPrint.print({ html, jobName: `Bill_${Date.now()}` });
//     } catch (err) {
//       Alert.alert("Print Error", err.message);
//     }
//   };

  
//   const handleSetKOT = async (kot, isVoid) => {
//     if (!remarks.length) {
//       const remarks = await javascriptGetLocal({
//         path: ENDPOINT.kot_remarks,
//         Token: token,
//       });
//       setRemarks(remarks.data);
//     }
//     if (isVoid) {
//       setModifyKOT(
//         (kot.Items = kot.Items.map((item) => ({
//           ...item,
//           Qty: 0,
//         }))),
//       );
//     }
//     setModifyKOT(kot);
//   };

//   return (
//     <>
//     <Header toHome={true} title="Order Details"/>
//       <ScrollView
//         style={styles.container}
//         contentContainerStyle={{ paddingBottom: 100 }}
//         showsVerticalScrollIndicator={false}
//       >
//         {/* ✅ Header */}
//         <View style={styles.header}>
//           <MaterialIcons name="dinner-dining" size={32} color="#1e88e5" />
//           <Text style={styles.vendorName}>{Vendor?.Name}</Text>
//           <Text style={styles.vendorAddress}>
//             {Vendor?.Address}, {Vendor?.City}, {Vendor?.State} -{" "}
//             {Vendor?.Pincode}
//           </Text>
//           <Text style={styles.vendorInfo}>📞 {Vendor?.Phone}</Text>
//           <Text style={styles.vendorInfo}>GST: {Vendor?.GSTNo}</Text>
//         </View>

//         <View style={styles.divider} />

//         {/* ✅ Bill Info */}
//         <View style={styles.infoBox}>
//           <View style={styles.infoRow}>
//             <MaterialIcons
//               name="credit-card"
//               size={20}
//               color="#333"
//               style={styles.icon}
//             />
//             <Text style={styles.infoLabel}>BillNo</Text>
//             <Text style={styles.kotTitle}>{BillNo}</Text>
//           </View>
//           <View style={styles.infoRow}>
//             <MaterialIcons
//               name="location-on"
//               size={20}
//               color="#333"
//               style={styles.icon}
//             />
//             <Text style={styles.infoLabel}>Location</Text>
//             <Text style={styles.infoValue}>{Location?.LocationName}</Text>
//           </View>

//          {!isMember && <View style={styles.infoRow}>
//             <MaterialIcons
//               name="restaurant"
//               size={20}
//               color="#333"
//               style={styles.icon}
//             />
//             <Text style={styles.infoLabel}>Table</Text>
//             <Text style={styles.infoValue}>{TableName || "N/A"}</Text>
//           </View>}

//         {!isMember &&  <View style={styles.infoRow}>
//             <MaterialIcons
//               name="person-outline"
//               size={20}
//               color="#333"
//               style={styles.icon}
//             />
//             <Text style={styles.infoLabel}>Waiter</Text>
//             <Text style={styles.infoValue}>{WaiterName || "N/A"}</Text>
//           </View>}

//           {!isMember && <View style={styles.infoRow}>
//             <MaterialIcons
//               name="account-balance-wallet"
//               size={20}
//               color="#333"
//               style={styles.icon}
//             />
//             <Text style={styles.infoLabel}>Cashier</Text>
//             <Text style={styles.infoValue}>{CashierName || "N/A"}</Text>
//           </View>}
//            <View style={styles.infoRow}>
//             <MaterialIcons
//               name="access-time-filled"
//               size={20}
//               color="#333"
//               style={styles.icon}
//             />
//             <Text style={styles.infoLabel}>Created At</Text>
//             <Text style={styles.infoValue}>{moment(BillDate).format("DD-MMM-YY hh:mm A") || "N/A"}</Text>
//           </View>
//         </View>
//         <View style={[styles.itemRow, { marginHorizontal: 10 }]}>
//           <Text style={styles.itemName}>Item</Text>
//           <Text style={styles.itemQty}>Qty</Text>
//           <Text style={styles.itemRate}>Rate</Text>
//           <Text style={[styles.itemAmount, { fontFamily: FONT_FAMILY.normal }]}>
//             Amt
//           </Text>
//         </View>
//         {/* ✅ KOT Sections */}
//         {KOTWiseData?.map((kot, index) => (
//           <View key={index} style={styles.kotCard}>
//             <View
//               style={{ flexDirection: "row", justifyContent: "space-between" }}
//             >
//               <Text style={styles.kotTitle}>🧾 Order No: {kot.KOTNo}</Text>
//               { !isMember && can_modify && (
//                 <Pressable onPress={() => handleSetKOT(kot,false)}>
//                   <MaterialIcons
//                     name="edit-document"
//                     size={25}
//                     color={DARK_BLUE}
//                   />
//                 </Pressable>
//               )}
//             </View>

//             {kot.Items.map((item, idx) => (
//               <View key={idx} style={styles.itemRow}>
//                 <Text style={styles.itemName}>{item.ItemName}</Text>
//                 <Text style={styles.itemQty}>{Number(item.Qty)}</Text>
//                 <Text style={styles.itemRate}>{item.Rate}</Text>
//                 <Text style={styles.itemAmount}>
//                   {(item.Rate * Number(item.Qty)).toFixed(2)}
//                 </Text>
//               </View>
//             ))}
//             { !isMember && can_modify && (
//               <Pressable
//                 style={{
//                   flexDirection: "row",
//                   alignItems: "center",
//                   alignSelf: "flex-end",
//                   borderWidth: 0.5,
//                   padding: 3,
//                   borderRadius: 4,
//                   borderColor: "red",
//                   marginTop: 5,
//                 }}
//                 onPress={() => handleSetKOT(kot, true)}
//               >
//                 <MaterialIcons name="block" size={20} color="red" />
//                 <Text
//                   style={{
//                     color: "red",
//                     marginLeft: 5,
//                     fontFamily: FONT_FAMILY.normal,
//                   }}
//                 >
//                   Void KOT
//                 </Text>
//               </Pressable>
//             )}
//           </View>
//         ))}

//         <View style={styles.summaryCard}>
//           <Text style={styles.summaryHeader}>Bill Summary</Text>

//           {/* ✅ Subtotal */}
//           <View style={styles.summaryRow}>
//             <Text style={styles.summaryLabel}>Subtotal</Text>
//             <Text style={styles.summaryValue}>
//               {Summary?.SubTotal?.toFixed(2) || "0.00"}
//             </Text>
//           </View>

//           {/* ✅ Discount */}
//           <View style={styles.summaryRow}>
//             <Text
//               style={[styles.billText, { fontFamily: FONT_FAMILY.semiBold }]}
//             >
//               Discount
//             </Text>
//             <Text
//               style={[
//                 styles.billText,
//                 {
//                   textAlign: "right",
//                   fontFamily: FONT_FAMILY.semiBold,
//                   color: "red",
//                   fontSize: 16,
//                 },
//               ]}
//             >
//               -
//               {KOTWiseData.reduce((total, kot) => {
//                 return (
//                   total +
//                   kot.Items.reduce(
//                     (acc, val) =>
//                       acc +
//                       (parseFloat(val.Rate || 0) *
//                         parseFloat(val.Qty) *
//                         parseFloat(val.DiscountPer || 0)) /
//                         100,
//                     0
//                   )
//                 );
//               }, 0).toFixed(2)}
//             </Text>
//           </View>

//           {/* ✅ Tax Section */}
//           <View>
//             {(() => {
//               const allItems = KOTWiseData.flatMap((kot) => kot.Items);
//               let GSTVal=0;
//               let GSTCount=0;
//               const taxDetails = allItems.reduce((acc, item) => {
//                 const qty = parseFloat(item.Qty) || 0;
//                 const rate = parseFloat(item.Rate) || 0;
//                 const discount = parseFloat(item.DiscountPer) || 0;
//                 const taxPer = parseFloat(item.TaxPer) || 0;
//                 const taxType = (item.TaxType || "").toUpperCase();

                
//                 if(item.TaxType=='GST'){
//                     GSTVal+=parseFloat(item.TaxPer)
//                     console.log( item.TaxPer, '---------------------- item.TexPer ---------------------');
//                     GSTCount+=1
//                 }

//                 const base = qty * rate;
//                 const discountAmt = base * (discount / 100);
//                 const taxable = base - discountAmt;
//                 const taxAmt = (taxable * taxPer) / 100;

//                 if (!acc[taxType])
//                   acc[taxType] = { totalTax: 0, totalItems: 0, avgRate: 0 };

//                 acc[taxType].totalTax += taxAmt;
//                 acc[taxType].totalItems += 1;
//                 acc[taxType].avgRate += taxPer;

//                 return acc;
//               }, {});
             
//               // Average tax % per type
//               Object.keys(taxDetails).forEach((type) => {
//                 taxDetails[type].avgRate =
//                   taxDetails[type].totalItems > 0
//                     ? taxDetails[type].avgRate / taxDetails[type].totalItems
//                     : 0;
//               });

//               const totalItems = allItems.length;
//               const gstItems = taxDetails["GST"]?.totalItems || 0;
//               const gstDominant = gstItems / totalItems >= 0.5;

//               if (gstDominant) {
//                 const gstTax = taxDetails["GST"]?.totalTax || 0;
//                 const cgst = gstTax / 2;
//                 const sgst = gstTax / 2;
                
//                  GSTVal=GSTVal/GSTCount
//                 return (
//                   <>
//                     {/* CGST */}
//                     <View style={styles.summaryRow}>
//                       <Text
//                         style={[
//                           styles.billText,
//                           { fontFamily: FONT_FAMILY.semiBold },
//                         ]}
//                       >
//                         (+) CGST ({GSTVal/2}%)
//                       </Text>
//                       <Text
//                         style={[
//                           styles.billText,
//                           {
//                             textAlign: "right",
//                             fontFamily: FONT_FAMILY.semiBold,
//                             fontSize: 16,
//                           },
//                         ]}
//                       >
//                         {cgst.toFixed(2)}
//                       </Text>
//                     </View>

//                     {/* SGST */}
//                     <View style={styles.summaryRow}>
//                       <Text
//                         style={[
//                           styles.billText,
//                           { fontFamily: FONT_FAMILY.semiBold },
//                         ]}
//                       >
//                         (+) SGST ({GSTVal/2}%)
//                       </Text>
//                       <Text
//                         style={[
//                           styles.billText,
//                           {
//                             textAlign: "right",
//                             fontFamily: FONT_FAMILY.semiBold,
//                             fontSize: 16,
//                           },
//                         ]}
//                       >
//                         {sgst.toFixed(2)}
//                       </Text>
//                     </View>

//                     {/* Other Tax Types */}
//                     {Object.entries(taxDetails)
//                       .filter(([type]) => type !== "GST")
//                       .map(([type, val]) => (
//                         <View key={type} style={styles.summaryRow}>
//                           <Text
//                             style={[
//                               styles.billText,
//                               { fontFamily: FONT_FAMILY.semiBold },
//                             ]}
//                           >
//                             (+) {type} ({val.avgRate.toFixed(2)}%)
//                           </Text>
//                           <Text
//                             style={[
//                               styles.billText,
//                               {
//                                 textAlign: "right",
//                                 fontFamily: FONT_FAMILY.semiBold,
//                                 fontSize: 16,
//                               },
//                             ]}
//                           >
//                             {val.totalTax.toFixed(2)}
//                           </Text>
//                         </View>
//                       ))}
//                   </>
//                 );
//               }

//               // Non-GST Case
//               return Object.entries(taxDetails).map(([type, val]) => (
//                 <View key={type} style={styles.summaryRow}>
//                   <Text
//                     style={[
//                       styles.billText,
//                       { fontFamily: FONT_FAMILY.semiBold },
//                     ]}
//                   >
//                     (+) {type} ({val.avgRate.toFixed(2)}%)
//                   </Text>
//                   <Text
//                     style={[
//                       styles.billText,
//                       {
//                         textAlign: "right",
//                         fontFamily: FONT_FAMILY.semiBold,
//                         fontSize: 16,
//                       },
//                     ]}
//                   >
//                     {val.totalTax.toFixed(2)}
//                   </Text>
//                 </View>
//               ));
//             })()}
//           </View>

//           {/* ✅ Service Charge */}
//           {Summary?.ServiceChargeAmount > 0 && (
//             <View style={styles.summaryRow}>
//               <Text style={styles.summaryLabel}>
//                 Service Charge ({Summary?.ServiceChargePercent}%)
//               </Text>
//               <Text style={styles.summaryValue}>
//                 {Summary?.ServiceChargeAmount.toFixed(2)}
//               </Text>
//             </View>
//           )}

//           {/* ✅ Round Off */}
//           <View style={styles.summaryRow}>
//             <Text style={styles.summaryLabel}>Round Off</Text>
//             <Text style={styles.summaryValue}>
//               {Summary?.RoundOff.toFixed(2)}
//             </Text>
//           </View>

//           {/* ✅ Total */}
//           <View style={styles.totalRow}>
//             <Text style={styles.totalLabel}>Amount Payable</Text>
//             <Text style={styles.totalValue}>
//               {Summary?.AmountAfterRoundOff?.toFixed(2)}
//             </Text>
//           </View>
//         </View>
// { Status &&
//      <View style={[styles.summaryCard]}>
//         <View style={styles.summaryRow}>
//       <Text style={styles.itemName}>Opening Balance</Text>
//       <Text style={[styles.itemName,{fontFamily:FONT_FAMILY.semiBold,textAlign:'right'}]}>{OpeningBalance}</Text>
//         </View>
//         <View style={styles.summaryRow}>
//       <Text style={styles.itemName}>Closing Balance</Text>
      
//      <Text style={[styles.itemName,{fontFamily:FONT_FAMILY.semiBold,textAlign:'right'}]}>{ClosingBalance}</Text>
//         </View>
//       </View>}
//         {/* ✅ Footer */}
//         <Text style={styles.footerText}>Thank you for dining with us!</Text>
//         <Text style={styles.powered}>Powered by Technyk</Text>
      
//       </ScrollView>
//     {!isMember &&  <View
//         style={{
//           margin: 20,
//           justifyContent: "flex-end",
//           flexDirection: "row",
//           bottom: 0,
//         }}
//       >
      
//         {!Status ? (
//           <Pressable
//             onPress={handleSettleBill}
//             style={{
//               backgroundColor: "#299c12ff",
//               padding: 10,
//               borderRadius: 7,
//               elevation: 9,
//               flexDirection: "row",
//               // alignSelf:'flex-end'
//               // justifyContent:'flex-end'
//             }}
//           >
//             {settleLoading ? (
//               <ActivityIndicator color={"white"} size={"small"} />
//             ) : (
//               <MaterialIcons
//                 name="card-membership"
//                 size={20}
//                 color="white"
//                 style={styles.icon}
//               />
//             )}
//             <Text style={{ color: "white", fontFamily: FONT_FAMILY.semiBold }}>
//               Settle Bill
//             </Text>
//           </Pressable>
//         ):(  <Pressable
//           onPress={handlePrint}
//           style={{
//             backgroundColor: "#1e88e5",
//             padding: 10,
//             borderRadius: 7,
//             elevation: 9,
//             flexDirection: "row",
//           }}
//         >
//           <MaterialIcons
//             name="print"
//             size={20}
//             color="white"
//             style={styles.icon}
//           />
//           <Text style={{ color: "white", fontFamily: FONT_FAMILY.semiBold }}>
//             Print Bill
//           </Text>
//         </Pressable>)}
//       </View>}

//       <UniversalModal
//         title={"Modify KOT"}
//         visible={!!modifyKOT}
//         isFull={true}
//         setVisible={() => {
//           setModifyKOT(undefined);
//         }}
//       >
//         <View style={{ flex: 1,padding:10 }}>
//           <Text style={styles.kotTitle}>🧾 Order No: {modifyKOT?.KOTNo}</Text>

//           <FlatList
//             data={modifyKOT?.Items || []}
//             renderItem={({ item, index }) => (
//               <View key={index} style={{ flexDirection: "row", marginTop: 10 }}>
//                 <Text style={styles.itemName}>{item.ItemName}</Text>

//                 <View style={styles.qtyContainer}>
//                   {/* ➤ Decrease Qty Button */}
//                   <Pressable
//                     onPress={() => {
//                       if (Number(item.Qty) > 0) {
//                         setModifyKOT((prev) => {
//                           const updatedItems = prev.Items.map((i) =>
//                             i.ItemName === item.ItemName
//                               ? {
//                                   ...i,
//                                   Qty: Number(i.Qty) - 1,
//                                   is_updated: true,
//                                 }
//                               : i
//                           );
//                           return { ...prev, Items: updatedItems };
//                         });
//                       }
//                     }}
//                     style={[
//                       styles.qtyButton,
//                       { opacity: Number(item.Qty) > 0 ? 1 : 0.5 }, // disable if qty = 1
//                     ]}
//                   >
//                     <Text style={styles.qtyText}>−</Text>
//                   </Pressable>

//                   {/* ➤ Current Qty */}
//                   <Text style={styles.qtyNumber}>{Number(item.Qty)}</Text>

//                   {/* ➤ Disable or Hide Add Button */}
//                   <Pressable
//                     disabled // 👈 disable the + button
//                     style={[styles.qtyButton, { opacity: 0.3 }]} // faded to show disabled
//                   >
//                     <Text style={styles.qtyText}>+</Text>
//                   </Pressable>
//                 </View>
//               </View>
//             )}
//           />
//         </View>
//         <View style={{padding:10}}>

//         <TextInput
//           value={remark}
//           onChangeText={(text) => {
//             if (inoputError) {
//               setInputerror("");
//             }
//             setRemark(text);
//           }}
//           style={{
//             borderWidth: 1,
//             borderColor: inoputError ? "red" : "black",
//             borderRadius: 5,
//             padding: 10,
//             marginTop: 10,
//             fontFamily: FONT_FAMILY.normal,
//             color: "black",
//           }}
//           placeholder="Add Remark"
//           placeholderTextColor={"grey"}
//           keyboardType="default"
//         />
//         {inoputError && (
//           <Text
//             style={{
//               fontSize: 14,
//               color: "red",
//               fontFamily: FONT_FAMILY.normal,
//             }}
//           >
//             {inoputError}
//           </Text>
//         )}
//         <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
//           {remarks.map((item) => (
//             <View>
//               <Pressable
//                 onPress={() => {
//                   setInputerror("");
//                   setRemark((prev) => prev + item.Remarks + ", ");
//                 }}
//                 style={{
//                   backgroundColor: LIGHT_BLUE,
//                   padding: 5,
//                   marginVertical: 2,
//                   borderRadius: 4,
//                   marginRight:5
//                 }}
//               >
//                 <Text
//                   style={{
//                     fontSize: 14,
//                     color: "#1e293b",
//                     fontFamily: FONT_FAMILY.normal,
//                   }}
//                 >
//                   {item.Remarks}
//                 </Text>
//               </Pressable>
//             </View>
//           ))}
//         </View>
//         <Pressable
//           style={[
//             styles.qtyButton,
//             {
//               flexDirection:'row',
//               borderColor: "green",
//               borderWidth: 1,
//               borderRadius: 5,
//               alignSelf: "flex-end",
//               margin: 10,
//             },
//           ]} // faded to show disabled
//           onPress={() => handleModifyKOT( modifyKOT)}
//         >

//         {settleLoading && <ActivityIndicator  size={'small'} color={'green'} style={{marginRight:10}}/>}
//           <Text style={styles.qtyText}>Modify</Text>
//         </Pressable>
//         </View>

//       </UniversalModal>
//     </>
//   );
// };

// export default KotReceipt;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#f9fafc", padding: 16 },
//   center: { flex: 1, justifyContent: "center", alignItems: "center" },
//   loadingText: { marginTop: 8, fontSize: 16, color: "#555" },
//   errorText: { color: "red", fontSize: 16 },

//   header: { alignItems: "center", marginBottom: 16 },
//   vendorName: {
//     fontSize: 20,
//     fontFamily: FONT_FAMILY.bold,
//     color: "#1e293b",
//     marginTop: 6,
//     textAlign: "center",
//   },
//   vendorAddress: {
//     fontSize: 14,
//     color: "#475569",
//     textAlign: "center",
//     marginTop: 4,
//     fontFamily: FONT_FAMILY.normal,
//   },
//   vendorInfo: { fontSize: 13, color: "#64748b", marginTop: 2 },
//   divider: {
//     height: 1,
//     backgroundColor: "#e2e8f0",
//     marginVertical: 10,
//   },

//   infoBox: {
//     backgroundColor: "#fff",
//     borderRadius: 10,
//     padding: 12,
//     marginVertical: 10,
//     elevation: 2,
//   },
//   infoRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginVertical: 4,
//   },
//   icon: {
//     marginRight: 8,
//   },
//   infoLabel: {
//     flex: 1,
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#444",
//   },
//   infoValue: {
//     fontSize: 14,
//     color: "#000",
//     fontWeight: "500",
//   },
//   kotCard: {
//     flex: 1,
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 12,
//     marginBottom: 10,
//     shadowColor: "#000",
//     shadowOpacity: 0.05,
//     shadowRadius: 3,
//     elevation: 2,
//   },
//   kotTitle: {
//     fontSize: 15,
//     fontFamily: FONT_FAMILY.bold,
//     color: "#1e88e5",
//     marginBottom: 6,
//   },
//   itemRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     borderBottomWidth: 0.4,
//     borderBottomColor: "#e2e8f0",
//     paddingVertical: 6,
//   },
//   itemName: {
//     flex: 2,
//     fontSize: 14,
//     color: "#1e293b",
//     fontFamily: FONT_FAMILY.normal,
//   },
//   itemQty: { width: 30, textAlign: "right", color: "#475569" },
//   itemRate: { width: 80, textAlign: "right", color: "#475569" },
//   itemAmount: {
//     width: 100,
//     textAlign: "right",
//     fontWeight: "600",
//     color: "#1e293b",
//   },

//   summaryCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 14,
//     marginTop: 16,
//     shadowColor: "#000",
//     shadowOpacity: 0.05,
//     shadowRadius: 3,
//     elevation: 3,
//   },
//   summaryHeader: {
//     fontSize: 16,
//     fontFamily: FONT_FAMILY.bold,
//     marginBottom: 6,
//     color: "#1e293b",
//   },
//   summaryRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginVertical: 3,
//   },
//   summaryLabel: { color: "#475569", fontSize: 14 },
//   summaryValue: { color: "#1e293b", fontSize: 14, fontWeight: "500" },
//   totalRow: {
//     borderTopWidth: 1,
//     borderTopColor: "#e2e8f0",
//     marginTop: 8,
//     paddingTop: 6,
//     flexDirection: "row",
//     justifyContent: "space-between",
//   },
//   totalLabel: { fontSize: 16, fontFamily: FONT_FAMILY.bold, color: "#000" },
//   totalValue: { fontSize: 16, fontFamily: FONT_FAMILY.bold, color: "#1e88e5" },

//   footerText: {
//     textAlign: "center",
//     marginTop: 20,
//     fontSize: 14,
//     color: "#475569",
//     fontFamily: FONT_FAMILY.normal,
//   },
//   powered: {
//     textAlign: "center",
//     fontSize: 12,
//     marginTop: 4,
//     color: "#94a3b8",
//   },
//   qtyContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "white",
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: "green",
//     paddingHorizontal: 5,
//   },
//   qtyButton: { paddingHorizontal: 10, paddingVertical: 5 },
//   qtyText: {
//     fontSize: 16,
//     color: "green",
//     fontFamily: FONT_FAMILY.bold,
//   },
//   qtyNumber: {
//     color: "black",
//     fontFamily: FONT_FAMILY.bold,
//     fontSize: 16,
//   },
//   billText: {
//     color: "black",
//     fontFamily: FONT_FAMILY.normal,
//     fontSize: 14,
//   },
// });



// OLD STYLES
// <style>
//         body {
//           font-family: monospace;
//           font-size: 26px;
//           width: device width; /* ✅ fits 58mm paper */
//           margin: 10px;
//           word-wrap: break-word;
//           text-align: center; /* ✅ center all layout */
//         }
//         table {
//           width: 100%;
//           border-collapse: collapse;
          
//           margin: 0 auto;
//           text-align: left;
//         }
//         td, th {
//           padding: 2px 0;
//           vertical-align: top;
//           font-size: 22px;
//           word-wrap: break-word;
//           overflow-wrap: break-word;
//         }
//         .center { text-align: center; }
//         .right { text-align: right; }
//         hr {
//           border: none;
//           border-top: 1px solid #000;
//           margin: 4px 0;
//         }
//         th {
//           text-align: left;
//           border-bottom: 1px solid #000;
//         }
//       </style>