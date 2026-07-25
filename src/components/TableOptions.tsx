import React, { useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  LayoutAnimation,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import NfcManager, { NfcTech } from "react-native-nfc-manager";
import { Modal } from "react-native-paper";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import LottieView from "lottie-react-native";
import { FONT_FAMILY, LIGHT_BLUE, SECONDARY_COLOR } from "../util/colors";
import { TextInput } from "react-native-gesture-handler";
import { Loginstyles } from "../Styles/LoginStyles";
import NewButton from "./Button";
import { javascriptPostLocal } from "../util/api";
import { DOMAIN } from "../util/constant";
import { Toast } from "react-native-toast-notifications";
import UniversalModal from "./UniversalModal";
import { navigationRef } from "../navigation/RootNavigation";


// ================================
// OPTIONS
// ================================
const getOptions = (
  formData,
  handleFormData,
  handleVerifyMember,
  handleSendOtp,
  otpSent,
  errors,
  loading,
  memberRef,
  otpRef,
  selectedMember
  
) => [
  {
    key: "otp",
    label:"Verify OTP",
    icon: DOMAIN.LOCAL + "icon/memberotp.webp",

    render: () => (
      <View>

        {/* MEMBER ID */}
        <TextInput
           ref={memberRef}
          maxLength={15}
          keyboardType="default"
          placeholder="Enter Member ID"
          value={formData.member_id}
          editable={!otpSent}
            returnKeyType={selectedMember ? "next" : "done"}
  blurOnSubmit={false}
  onSubmitEditing={() => {
    if (selectedMember) {
      handleSendOtp();
    } else {
      handleSendOtp();
    }
  }}
          onChangeText={(text) => handleFormData(text, "member_id")}
          style={[Loginstyles.textInput, { paddingVertical: 20 }]}
          placeholderTextColor="#363b5d"
        />
        {errors.member_id && (
          <Text style={styles.error}>{errors.member_id}</Text>
        )}

        {/* SEND OTP */}
        {!otpSent && (
          <View style={{ marginVertical: 20 }}>
            <NewButton
              loading={loading}
              text={selectedMember?"Send OTP":'Verify Member'}
              onPress={handleSendOtp}
            />
          </View>
        )}

        {/* VERIFY + RESEND */}
        {otpSent && (
          <>
            <TextInput
                ref={otpRef}
  returnKeyType="done"
  blurOnSubmit={false}
  onSubmitEditing={handleVerifyMember}
              maxLength={6}
              keyboardType="number-pad"
              placeholder="Enter OTP"
              value={formData.otp}
              onChangeText={(text) => handleFormData(text, "otp")}
              style={[Loginstyles.textInput, { paddingVertical: 20 }]}
              placeholderTextColor="#363b5d"
            />
            {errors.otp && (
              <Text style={styles.error}>{errors.otp}</Text>
            )}

            <View style={{ marginVertical: 10 }}>
              <NewButton
                loading={loading}
                text="Verify OTP"
                onPress={handleVerifyMember}
              />
            </View>

            <TouchableOpacity onPress={handleSendOtp}>
              <Text style={{ textAlign: "center", color: SECONDARY_COLOR }}>
                Resend OTP
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    ),
  },

  Platform.OS==='android'&&{
    key: "card",
    label: "Tap Card",
    icon: DOMAIN.LOCAL + "icon/tap.webp",
    render: () => (
      <View style={{ alignItems: "center", justifyContent: "center" }}>
       {loading ?<ActivityIndicator size={'large'} color={'green'}/>: <LottieView
          source={require("../screens/Animations/wave_animation.json")}
          autoPlay
          loop
          style={{ width: 220, height: 220, alignSelf: "center" ,}}
        />}
        <Text style={[styles.iconText, { fontFamily: FONT_FAMILY.normal }]}>
          Please tap a Membership Card.
        </Text>
      </View>
    ),
  },
];


// ================================
// MAIN COMPONENT
// ================================
const TableOptions = ({
  is_member,
  visible,
  onClose,
  tableData,
  handleGroupData,
  token,
}) => {
  const [formData, setFormData] = useState({
    member_id: "",
    otp: "",
  });

  const [otpSent, setOtpSent] = useState(false);
  const [memberData,setMemberData]=useState([]);
  const [errors, setErrors] = useState({});
  const [activeOption, setActiveOption] = useState(null);
  const [loading, setLoading] = useState(false);
const [selectedMember,setSelectedMember]=useState('')
  // const inputRef = [useRef(null), useRef(null)];
  const memberRef = useRef(null);
const otpRef = useRef(null);


  // ================================
  // FORM DATA
  // ================================
  const handleFormData = (value, type) => {
    setFormData((prev) => ({ ...prev, [type]: value }));
  };


  // ================================
  // SEND OTP
  // ================================
  const handleSendOtp = async () => {
    if (!formData.member_id.trim()) {
      setErrors({ member_id: "Member ID is required" });
      return;
    }

    setLoading(true);

    const apiObj = {
      path: "staff/send/member-otp",
      body: {
        member_id: formData.member_id,
        LocationCode: tableData.LocationCode,
        memberData:selectedMember
      },
      Token: token,
    };

    try {
      const res = await javascriptPostLocal(apiObj);
      console.log( res, '---------------------- res ---------------------');
      if (res.success) {

        if(res.otp_id){
 Toast.show("OTP Sent Successfully", { type: "success", duration: 2000 });
        setOtpSent(true);
        setErrors({});
        setFormData((prev) => ({ ...prev, otp_id: res.otp_id,member_id:res.member_id }));
    setTimeout(() => {
  otpRef.current?.focus();
}, 200);
        }
        else{
          setMemberData(res.data)
        }
       
      } else {
        Toast.show(res.message || "Failed to send OTP", { type: "danger", duration: 2000 });
      }
    } finally {
      setLoading(false);
    }
  };


  // ================================
  // VERIFY OTP
  // ================================
  const handleVerifyMember = async () => {
    if (!formData.otp.trim()) {
      setErrors({ otp: "OTP is required" });
      return;
    }

    setLoading(true);

    const apiObj = {
      path: "staff/verify/member",
      body: {
        member_id: formData.member_id,
        otp: formData.otp,
        LocationCode: tableData.LocationCode,
        TableCode: tableData.TableCode,
        otp_id: formData.otp_id,

      },
      Token: token,
    };

    try {
      const res = await javascriptPostLocal(apiObj);

      if (res.success) {
        Alert.alert("Verified", "Member verified successfully");
        handleGroupData(res.data);
        setOtpSent(false);
      } else {
        Alert.alert("Failed", res.message);
      }
    } finally {
      setLoading(false);
    }
  };


  // ================================
  // NFC CARD
  // ================================
  const handleTapCard = async () => {
    await NfcManager.start();

    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();

      if (!tag.id) {
        Alert.alert("Invalid Card", "Please tap a valid card");
        return;
      }

      setLoading(true);

      let nfc_serial = tag.id;

      const apiObj = {
        path: "staff/verify/nfc-card",
        body: {
          nfc_serial: nfc_serial
            .match(/.{2}/g)
            .reverse()
            .join("")
            .toUpperCase(),
          LocationCode: tableData.LocationCode,
          TableCode: tableData.TableCode,
        },
        Token: token,
      };

      const res = await javascriptPostLocal(apiObj);

      if (res.success) {
        Alert.alert("Verified", "Member verified successfully");
        handleGroupData(res.data);
      } else {
        Alert.alert("Failed", res.message);
      }
    } finally {
      setLoading(false);
      await NfcManager.cancelTechnologyRequest();
    }
  };


  const OPTIONS = getOptions(
    formData,
    handleFormData,
    handleVerifyMember,
    handleSendOtp,
    otpSent,
    errors,
    loading,
    memberRef,
    otpRef,
    selectedMember
  );


  // ================================
  // UI
  // ================================

  return (
    // <Modal
    //   visible={visible}
    //   transparent
    //   onDismiss={onClose}
    //   dismissable={true}
    //   contentContainerStyle={{ flex: 1, justifyContent: "flex-end" }}
    // >
    <UniversalModal
    visible={visible}
    setVisible={()=>navigationRef.current?.goBack()}
    isFull={true}
    title="Verify Member"
    >
      {memberData?.length &&memberData.map(item=>(
       
                   <Pressable
                     style={{
                      //  flex: 1,
                       marginLeft: 15,
                       backgroundColor:selectedMember.name==item.name?'#ddffbc':'#f0f0f0',
                       padding:10,
                       borderRadius:10,
                       marginBottom:10
                     }}
                    onPress={() => {
    setSelectedMember(item);

    setTimeout(() => {
        memberRef.current?.focus();
    },100);
}}
                   >
       
                     <Text style={styles.memberName}>
                       {item.name}
                     </Text>
       
                     <Text style={styles.memberId}>
                       {item.memberID}
                     </Text>
       
                     <Text style={styles.memberType}>
                       Type : {item.type}
                     </Text>
       
                     <Text style={styles.memberMobile}>
                       Mobile :
                       {" "}
                       ******{item.Mobile1?.slice(-4)}
                     </Text>
       
                   </Pressable>
      ))
      
      }
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          // justifyContent: "flex-end",
        }}
        enableOnAndroid
    extraScrollHeight={20}
  keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>

          <Text style={[styles.iconText, { textAlign: "center" }]}>
            Choose One For Order
          </Text>

          <Text
            style={[
              styles.iconText,
              { color: "grey", textAlign: "center", fontFamily: FONT_FAMILY.normal },
            ]}
          >
            {tableData?.location_name || ""} , {tableData?.table_name || ""}
          </Text>

          {!is_member && (
            <View style={styles.innercontainer}>
              {OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.button}
                  onPress={() => {
                    setActiveOption(opt.key);
                    if (opt.key === "card" && Platform.OS==='android') handleTapCard();

                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  }}
                >
                  <Image
                    source={{ uri: opt.icon }}
                    style={[
                      styles.icon,
                      {
                        backgroundColor:
                          activeOption === opt.key
                            ? SECONDARY_COLOR
                            : LIGHT_BLUE,
                      },
                    ]}
                  />
                  <Text style={styles.iconText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!is_member &&
            activeOption &&
            OPTIONS.find((o) => o.key === activeOption)?.render()}
        </View>
      </KeyboardAwareScrollView>
   </UniversalModal>
  );
};

export default TableOptions;


// ================================
// STYLES
// ================================
const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    margin: 10,
  },
  innercontainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 20,
  },
  icon: {
    height: 80,
    width: 80,
    marginBottom: 20,
    backgroundColor: LIGHT_BLUE,
    padding: 10,
    borderRadius: 10,
    alignSelf: "center",
  },
  iconText: {
    color: "black",
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
  },
  button: {},
  error: {
    color: "red",
    fontSize: 13,
    marginTop: 5,
    marginLeft: 5,
  },

  memberName: {
    color: "black",
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
  },

  memberId: {
    color: "grey",
    marginTop: 3,
    fontFamily: FONT_FAMILY.normal,
  },

  memberType: {
    color: "#1E88E5",
    marginTop: 5,
    fontFamily: FONT_FAMILY.semiBold,
  },

  memberMobile: {
    color: "grey",
    marginTop: 3,
    fontFamily: FONT_FAMILY.normal,
  },

  sendOtpButton: {
    backgroundColor: SECONDARY_COLOR,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
});