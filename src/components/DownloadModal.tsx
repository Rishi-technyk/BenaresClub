import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import moment from "moment";
import DatePickerComponent from "./DatePicker";
import RNFS from "react-native-fs";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSelector } from "react-redux";
import { generatePDF } from "react-native-html-to-pdf";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { javascriptPost, ApiResponse } from "../util/api";
import InvoiceStyle from "../Styles/InvoiceStyle";
import { ModalStyles } from "../Styles/ModalStyles";
import { Toast } from "react-native-toast-notifications";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { ENDPOINT } from "../util/constant";
import { RootState } from "../store/store";
import UniversalModal from "./UniversalModal";
import { useAppTheme } from "../theme/AppThemeProvider";
import { FONT_FAMILY } from "../util/colors";


interface DownloadModalProps {
  visible: boolean;
  setVisible: (state: boolean) => void;
  data: "Credit" | "wallet" | "member" | string; // Adjust if needed
}

interface NavigationRoutes {
  PDFView: { url: string; title: string };
}


const DownloadModal: React.FC<DownloadModalProps> = ({ visible, setVisible, data }) => {
  const [click, setClick] = useState<number | null>(null);
  const [loader, setLoader] = useState<boolean>(false);
  const [resetDate, setResetDate] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const {colors}=useAppTheme();
  const { user, token } = useSelector((state: RootState) => state.auth);

  const navigation = useNavigation<NavigationProp<NavigationRoutes>>();

  const arrData = [
    "Last 1 month",
    "Last 3 months",
    "Last 6 months",
    "Last 1 Year",
    "Select a duration",
  ];

  /* -----------------------------------------
     API CALL
  ----------------------------------------- */

  const apiCallDownload = async () => {
    let body: any = {};
    let path: any = {};

    path.ws_type =
      data === "Credit"
        ? ENDPOINT.invoice_transaction_download
        : ENDPOINT.transaction_download;

    body.member_id = user?.MemberID;
    body.pay_mode = data === "wallet" ? "" : "CREDIT";
    body.start_date = startDate;
    body.end_date = endDate;

    if (data !== "Credit") {
      body.pay_mode = data === "member" ? "" : "CREDIT";
    }

    try {
      const apiRequestObject = {
        path: path.ws_type,
        body: body,
        Token: token,
      };

      setLoader(true);

      const response: ApiResponse<string> = await javascriptPost(apiRequestObject);

      setClick(null);
      setVisible(false);
      setLoader(false);

      if (response.status === true) {
        onProceed(response.data);
      } else {
        Toast.show(response.message || "Something went wrong.", { type: "warning" });
      }
    } catch (err) {
      console.log(err);
      return { result: "FAILURE" };
    }
  };

  /* -----------------------------------------
     ON SELECT OPTION
  ----------------------------------------- */
  const onSelect = (ind: number) => {
    setStartDate("");
    setEndDate("");

    if (ind !== 4) {
      const monthNo = ind === 0 ? 1 : ind === 1 ? 3 : ind === 2 ? 6 : 12;

      const currDate = moment(new Date()).format("YYYY-MM-DD");
      const dateFrom = moment(currDate).subtract(monthNo, "months").format("YYYY-MM-DD");

      setEndDate(currDate);
      setStartDate(dateFrom);
    }

    setClick(ind);
  };

  /* -----------------------------------------
     FINAL PROCEED (Generate PDF)
  ----------------------------------------- */
  const onProceed = async (filePath: string) => {
    Toast.hideAll();

    try {
      const random = Date.now();
      const fileName = `Transaction_${user?.MemberID}_${data}_${random}.pdf`;

      const options = {
        html: filePath,
        fileName,
        directory: "Documents",
      };

      const pdf = await generatePDF(options);

      const basePath =
        Platform.OS === "ios" ? RNFS.LibraryDirectoryPath : RNFS.DownloadDirectoryPath;

      const destPath = `${basePath}/${fileName}`;

      await RNFS.copyFile(pdf.filePath, destPath);

      setLoader(false);
      setVisible(false);

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
    } catch (error: any) {
      setLoader(false);
      console.log(error);
      Toast.show("Error during file download or open", { type: "danger" });
    }
  };

  /* -----------------------------------------
     RENDER
  ----------------------------------------- */

  return (
    // <Modal
    //   transparent
    //   visible={visible}
    //   presentationStyle={Platform.OS === "ios" ? "pageSheet" : "overFullScreen"}
    //   onRequestClose={() => {
    //     setVisible(false);
    //     setClick(null);
    //   }}
    // >
    <UniversalModal
    title="Download Statement"
    visible={visible}
    setVisible={setVisible}
    isFull={false}
    >
    
          

          <FlatList
            data={arrData}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => onSelect(index)}
                  style={ModalStyles.listRow}
                >
                  <View style={{ flex: 0.1, justifyContent: "center" }}>
                    <MaterialCommunityIcons
                      name={
                        click === index
                          ? "checkbox-marked-circle"
                          : "checkbox-blank-circle-outline"
                      }
                      size={18}
                      color={click === index ? colors.secondary : colors.text}
                    />
                  </View>

                  <View style={{ flex: 0.8 }}>
                    <Text style={{color:colors.text,fontFamily:FONT_FAMILY.medium}}>{item}</Text>
                  </View>
                </TouchableOpacity>

                {index === 4 && click === 4 && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-around",
                    }}
                  >
                    {/* START DATE */}
                    <View>
                      <Text style={{color:colors.text,fontFamily:FONT_FAMILY.medium}}>Start Date</Text>
                      <DatePickerComponent
                        placeholder="Start Date"
                        setResetDate={resetDate}
                        stateDate={setStartDate}
                        maxDate={new Date()}
                      />
                    </View>

                    {/* END DATE */}
                    <View>
                      <Text style={{color:colors.text,fontFamily:FONT_FAMILY.medium}}>End Date</Text>
                      <DatePickerComponent
                        placeholder="End Date"
                        setResetDate={resetDate}
                        stateDate={setEndDate}
                        maxDate={new Date()}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}
          />

          {/* DOWNLOAD BUTTON */}
          {(click !== 4 || (click === 4 && startDate !== "" && endDate !== "")) &&
            click !== null && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={apiCallDownload}
                style={ModalStyles.submitContainer}
              >
                {loader && <ActivityIndicator color="white" style={{ marginRight: 20 }} />}

                <Text style={ModalStyles.confirmText}>Download</Text>
              </TouchableOpacity>
            )}
      {/* </ScrollView> */}
   </UniversalModal>
  );
};

export default DownloadModal;

// import {
//   ActivityIndicator,
//   Alert,
//   FlatList,
//   Image,
//   Modal,
//   Platform,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import React, { useState } from 'react';
// import moment from 'moment';
// import DatePickerComponent from './DatePicker';
// import RNFS from 'react-native-fs';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import { useSelector } from 'react-redux';
// import { generatePDF } from 'react-native-html-to-pdf';
// import { useNavigation } from '@react-navigation/native';
// import {javascriptPost} from '../util/api'
// import InvoiceStyle from '../Styles/InvoiceStyle';
// import { ModalStyles } from '../Styles/ModalStyles';
// import { Toast } from 'react-native-toast-notifications';
// import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
// import { ENDPOINT } from '../util/constant';

// const DownloadModal = ({ visible, setVisible, data }) => {
//   const [click, setClick] = useState(null);
//   const [loader, setLoader] = useState(false);
//   const [resetDate, setResetDate] = useState(false);
//   const [startDate, setStartDate] = useState('');
//   const [endDate, setEndDate] = useState('');
//   const { user,token } = useSelector(state => state.auth);
//   const navigation = useNavigation();
//   const arrData = [
//     'Last 1 month',
//     'Last 3 months',
//     'Last 6 months',
//     'Last 1 Year',
//     'Select a duration',
//   ];

//   const apiCallDownload = async () => {
//     let body = {};
//     let path = {};
//     path.ws_type =
//       data === 'Credit'
//         ? ENDPOINT.invoice_transaction_download
//         : ENDPOINT.transaction_download;
//     body.member_id = user?.MemberID;
//     body.pay_mode = data === 'wallet' ? '' : 'CREDIT';
//     body.start_date = startDate;
//     body.end_date = endDate;
//     if (data !== 'Credit') {
//       body.pay_mode = data === 'member' ? '' : 'CREDIT';
//     }

//     try {
//       const apiRequestObject = {
//         path: path.ws_type,
//         body: body,
//         Token: token,
//       };
//       console.log(apiRequestObject);
//       setLoader(true);
//       const response = await javascriptPost(apiRequestObject);
    
//       setClick(null);
//       setLoader(false);
//       if (response.status === true) {
//         onProceed(response.data);
//       } else {
//         Toast.show(response.message || 'Something went wrong.', {
//           type: 'warning',
//         });
//         return { result: 'FAILURE' };
//       }
//     } catch (err) {
//       console.log(err);
//       return { result: 'FAILURE' };
//     }
//   };
//   const onSelect = ind => {
//     if (ind !== 4) {
//       setStartDate('');
//       setEndDate('');
//       const monthNo = ind === 0 ? 1 : ind === 1 ? 3 : ind === 2 ? 6 : 12;
//       const currDate = moment(new Date()).format('YYYY-MM-DD');
//       setEndDate(currDate);
//       var dateFrom = moment(currDate)
//         .subtract(monthNo, 'months')
//         .format('YYYY-MM-DD');
//       setStartDate(dateFrom);

//       setClick(ind);
//     } else {
//       setStartDate('');
//       setEndDate('');
//       setClick(ind);
//     }
//   };
//  const onProceed = async (filePath) => {
//   Toast.hideAll();

//   try {
//     const random = Date.now();

//     const fileName = `Transaction_${user?.MemberID}_${data}_${random}.pdf`;

//     const options = {
//       html: filePath,
//       fileName,
//       directory: 'Documents',
//     };

//     // Convert HTML → Temporary PDF
//     const pdf = await generatePDF(options);

//     const basePath = Platform.OS === 'ios'
//       ? RNFS.LibraryDirectoryPath
//       : RNFS.DownloadDirectoryPath;

//     const destPath = `${basePath}/${fileName}`;

//     // Move file to permanent location
//     await RNFS.copyFile(pdf.filePath, destPath);

//     setLoader(false);
//     setVisible(false);

//     Alert.alert(
//       'File Downloaded Successfully',
//       '',
//       [
//         {
//           text: 'OK',
//         },
//         {
//           text: 'Open File',
//           onPress: () => {
//             RNFS.exists(destPath)
//               .then(exists => {
//                 if (exists) {
//                   navigation.navigate('PDFView', {
//                     url: destPath,
//                     title: 'Statement',
//                   });
//                 } else {
//                   Toast.show('File not found', { type: 'warning' });
//                 }
//               })
//               .catch(err => {
//                 Toast.show(err.message || 'Error opening file', {
//                   type: 'danger',
//                 });
//               });
//           },
//         },
//       ],
//       { cancelable: false },
//     );
//   } catch (error) {
//     setLoader(false);
//     console.log(error);
//     Toast.show('Error during file download or open', { type: 'danger' });
//   }
// };

//   return (
//     <Modal
//       transparent={true}
//       dismissableBackButton={true}
//       onRequestClose={() => {
//         setVisible(false), setClick(null);
//       }}
//       statusBarTranslucent={true}
//       presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
//       dismissable={true}
//       visible={visible}
//     >
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={ModalStyles.modal}
//       >
//         <View style={ModalStyles.innerModalCont}>
//           <View style={InvoiceStyle.headingContainer}>
//             <Text style={InvoiceStyle.headingText}>Download Statment</Text>
//             <Icon
//               onPress={() => {
//                 setVisible(false), setClick(null);
//               }}
//               name="close"
//               size={25}
//               style={ModalStyles.cancelText}
//             />
//           </View>
//           <FlatList
//             showsVerticalScrollIndicator={false}
//             data={arrData}
//             renderItem={({ item, index }) => {
//               return (
//                 <View>
//                   <TouchableOpacity
//                     onPress={() => onSelect(index)}
//                     activeOpacity={0.7}
//                     style={ModalStyles.listRow}
//                   >
//                     <View
//                       style={{
//                         flex: 0.1,
//                         justifyContent: 'center',
//                         alignItems: 'flex-start',
//                       }}
//                     >
//                       <MaterialCommunityIcons
//                         name={
//                           click === index
//                             ? 'checkbox-marked-circle'
//                             : 'checkbox-blank-circle-outline'
//                         }
//                         size={18}
//                         color={click === index ? 'black' : 'grey'}
//                       />
//                     </View>
//                     <View
//                       style={{
//                         flex: 0.8,
//                         alignItems: 'flex-start',
//                         justifyContent: 'center',
//                       }}
//                     >
//                       <Text style={ModalStyles.downloadText}>{item}</Text>
//                     </View>
//                   </TouchableOpacity>
//                   {index === 4 && click === 4 ? (
//                     <View
//                       style={{
//                         flexDirection: 'row',
//                         alignItems: 'center',
//                         justifyContent: 'space-around',
//                       }}
//                     >
//                       <View style={{}}>
//                         <Text style={ModalStyles.headerStyle}>
//                           {'Start Date'}
//                         </Text>
//                         <DatePickerComponent
//                           placeholder={'Start Date'}
//                           setResetDate={resetDate}
//                           stateDate={setStartDate}
//                           maxDate={new Date()}
//                         />
//                       </View>
//                       <View>
//                         <Text style={ModalStyles.headerStyle}>
//                           {'End Date'}
//                         </Text>
//                         <DatePickerComponent
//                           placeholder={'End Date'}
//                           setResetDate={resetDate}
//                           stateDate={setEndDate}
//                           maxDate={new Date()}
//                         />
//                       </View>
//                     </View>
//                   ) : null}
//                 </View>
//               );
//             }}
//           />
//           {(click !== 4 ||
//             (click == 4 && startDate !== '' && endDate !== '')) &&
//             click !== null && (
//               <TouchableOpacity
//                 onPress={apiCallDownload}
//                 activeOpacity={0.9}
//                 style={ModalStyles.submitContainer}
//               >
//                 {loader && (
//                   <ActivityIndicator
//                     style={{ marginRight: 20 }}
//                     color={'white'}
//                   />
//                 )}

//                 <Text style={ModalStyles.confirmText}>Download</Text>
//               </TouchableOpacity>
//             )}
//         </View>
//       </ScrollView>
//     </Modal>
//   );
// };

// export default DownloadModal;
