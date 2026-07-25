import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Toast } from "react-native-toast-notifications";
import { useNavigation, useRoute } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { javascriptPostLocal } from "../../util/api";
import { FONT_FAMILY, SECONDARY_COLOR } from "../../util/colors";
import { useSelector } from "react-redux";
import NfcManager, {
    NfcTech,
} from "react-native-nfc-manager";

const MemberVerificationScreen = () => {

  const navigation = useNavigation();
  const route = useRoute();
const {token}=useSelector(state=>state.auth)
  const {
    
    tableData
  } = route.params;

  /*
  |--------------------------------------------------------------------------
  | STEP
  |--------------------------------------------------------------------------
  | 1 -> Search Member
  | 2 -> Select Family Member
  | 3 -> Verify OTP
  |--------------------------------------------------------------------------
  */
const [step, setStep] = useState(1);
const [members, setMembers] = useState([]);
const [selectedMember, setSelectedMember] = useState(null);

  const [loading, setLoading] = useState(false);





  const otpRef = useRef();

const [formData, setFormData] = useState({
  member_id: "",
  otp: "",
  otp_id: "",
});

  const [errors, setErrors] = useState({});

  const handleFormData = (value, type) => {
    setFormData(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | Search Member
  |--------------------------------------------------------------------------
  */

  const handleTapCard = async () => {

  await NfcManager.start();

  try {

    await NfcManager.requestTechnology(
      NfcTech.Ndef
    );

    const tag = await NfcManager.getTag();

    if (!tag?.id) {

      Alert.alert(
        "Invalid Card",
        "Please tap a valid card"
      );

      return;
    }

    setLoading(true);

    const nfc_serial =
      tag.id
        .match(/.{2}/g)
        ?.reverse()
        .join("")
        .toUpperCase();

    const apiObj = {

      path: "staff/verify/nfc-card",

      body: {

        nfc_serial,

        LocationCode: tableData.LocationCode,

        TableCode: tableData.TableCode,

      },

      Token: token,

    };

    const res = await javascriptPostLocal(apiObj);

    if (res.success) {

      navigation.navigate(
        "TableOrder",
        {
          group: res.data,
        }
      );

    } else {

      Alert.alert(
        "Failed",
        res.message
      );

    }

  }
  finally {

    setLoading(false);

    await NfcManager.cancelTechnologyRequest();

  }

};

const handleSearchMember = async () => {

  if (!formData.member_id.trim()) {

    setErrors({
      member_id: "Member ID is required"
    });

    return;
  }

  setLoading(true);

  try {

    const apiObj = {

      path: "staff/member/list",

      body: {

        member_id: formData.member_id,

      },

      Token: token,

    };

    const res = await javascriptPostLocal(apiObj);

    if (res.success) {

      setMembers(res.data);

      setStep(2);

      setErrors({});

    }
    else {

      Toast.show(
        res.message,
        {
          type: "danger"
        }
      );

    }

  }
  finally {

    setLoading(false);

  }

};

  /*
  |--------------------------------------------------------------------------
  | Send OTP
  |--------------------------------------------------------------------------
  */

//   const handleSendOtp = async member => {

//     setLoading(true);

//     try {

//       const apiObj = {

//         path: "staff/send/member-otp",

//         body: {

//           member_id: member.memberID,

//         },

//         Token: token,

//       };

//       const res = await javascriptPostLocal(apiObj);

//       if (res.success) {

//         setSelectedMember(member);

//         setFormData(prev => ({
//           ...prev,
//           otp_id: res.otp_id,
//         }));

//         setStep(3);

//         Toast.show(
//           "OTP sent successfully",
//           {
//             type: "success",
//           }
//         );

//       } else {

//         Toast.show(
//           res.message,
//           {
//             type: "danger",
//           }
//         );

//       }

//     } finally {

//       setLoading(false);

//     }

//   };
const handleSendOtp = async member => {

  setLoading(true);

  try {

    const apiObj = {

      path: "staff/send/member-otp",

      body: {

        member_id: member.memberID,
        LocationCode: tableData.LocationCode,

      },

      Token: token,

    };

    const res = await javascriptPostLocal(apiObj);

    if (res.success) {

      setSelectedMember(member);

      setFormData(prev => ({
        ...prev,
        otp_id: res.otp_id,
      }));

      setStep(3);

    }

  }
  finally {

    setLoading(false);

  }

};
  /*
  |--------------------------------------------------------------------------
  | Verify OTP
  |--------------------------------------------------------------------------
  */

  const handleVerifyOtp = async () => {

    if (!formData.otp.trim()) {

      setErrors({
        otp: "OTP is required",
      });

      return;

    }

    setLoading(true);

    try {

      const apiObj = {

        path: "staff/verify/member",

        body: {

          member_id: selectedMember.memberID,

          otp: formData.otp,

          otp_id: formData.otp_id,

          LocationCode: tableData.LocationCode,

          TableCode: tableData.TableCode,

        },

        Token: token,

      };

      const res = await javascriptPostLocal(apiObj);

      if (res.success) {

        navigation.navigate("TableOrder", {

          group: res.data,

        });

      } else {

        Alert.alert(
          "Failed",
          res.message
        );

      }

    } finally {

      setLoading(false);

    }
    

  };

  return (
<View style={styles.container}>

  {/* HEADER */}

  <View style={styles.header}>
    <Text style={styles.headerTitle}>
      Member Verification
    </Text>

    <Text style={styles.headerSubTitle}>
      {tableData?.location_name} , {tableData?.table_name}
    </Text>
  </View>

  {/* STEP 1 */}

  {step === 1 && (

    <View style={styles.card}>

      <Text style={styles.title}>
        Enter Member ID
      </Text>

      <TextInput
        placeholder="Member ID"
        value={formData.member_id}
        onChangeText={(txt) =>
          handleFormData(txt, "member_id")
        }
        style={styles.input}
      />

      {!!errors.member_id && (
        <Text style={styles.error}>
          {errors.member_id}
        </Text>
      )}

      <TouchableOpacity
        style={styles.button}
        disabled={loading}
        onPress={handleSearchMember}
      >
        {loading ?

          <ActivityIndicator color={"white"} />

          :

          <Text style={styles.buttonText}>
            Search Member
          </Text>

        }
      </TouchableOpacity>

    </View>

  )}

<TouchableOpacity
    style={styles.nfcButton}
    onPress={handleTapCard}
>
    <MaterialCommunityIcons
        name="nfc"
        size={24}
        color="white"
    />

    <Text style={styles.buttonText}>
        Tap NFC Card
    </Text>

</TouchableOpacity>
  {/* STEP 2 */}

  {step === 2 && (

    <FlatList

      data={members}

      contentContainerStyle={{
        paddingBottom: 40,
      }}

      keyExtractor={(item) => item.memberID}

      renderItem={({ item }) => (

        <View style={styles.memberCard}>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >

            <View style={styles.avatar}>

              <MaterialCommunityIcons
                name="account"
                size={40}
                color="#fff"
              />

            </View>

            <View
              style={{
                flex: 1,
                marginLeft: 15,
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

            </View>

          </View>

          <TouchableOpacity
            disabled={loading}
            style={styles.sendOtpButton}
            onPress={() => handleSendOtp(item)}
          >

            {loading ?

              <ActivityIndicator color={"white"} />

              :

              <Text style={styles.sendOtpText}>
                Send OTP
              </Text>

            }

          </TouchableOpacity>

        </View>

      )}

    />

  )}

  {/* STEP 3 */}

  {step === 3 && (

    <View style={styles.card}>

      <View style={styles.selectedCard}>

        <View style={styles.avatar}>

          <MaterialCommunityIcons
            name="account"
            size={40}
            color="#fff"
          />

        </View>

        <View
          style={{
            marginLeft: 15,
            flex: 1,
          }}
        >

          <Text style={styles.memberName}>
            {selectedMember?.name}
          </Text>

          <Text style={styles.memberId}>
            {selectedMember?.memberID}
          </Text>

          <Text style={styles.memberMobile}>
            ******{selectedMember?.Mobile1?.slice(-4)}
          </Text>

        </View>

      </View>

      <TextInput
        ref={otpRef}
        placeholder="Enter OTP"
        keyboardType="number-pad"
        maxLength={6}
        value={formData.otp}
        onChangeText={(txt) =>
          handleFormData(txt, "otp")
        }
        style={styles.input}
      />

      {!!errors.otp && (
        <Text style={styles.error}>
          {errors.otp}
        </Text>
      )}

      <TouchableOpacity
        style={styles.button}
        disabled={loading}
        onPress={handleVerifyOtp}
      >

        {loading ?

          <ActivityIndicator color={"white"} />

          :

          <Text style={styles.buttonText}>
            Verify OTP
          </Text>

        }

      </TouchableOpacity>

      <TouchableOpacity
        style={{
          marginTop: 20,
          alignSelf: "center",
        }}
        onPress={() => handleSendOtp(selectedMember)}
      >

        <Text
          style={{
            color: SECONDARY_COLOR,
            fontWeight: "700",
          }}
        >
          Resend OTP
        </Text>

      </TouchableOpacity>

    </View>

  )}

</View>
);
}

export default MemberVerificationScreen;

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },

  header: {
    backgroundColor: SECONDARY_COLOR,
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },

  headerTitle: {
    color: "white",
    fontSize: 22,
    fontFamily: FONT_FAMILY.bold,
  },

  headerSubTitle: {
    color: "#e5e5e5",
    marginTop: 5,
    fontFamily: FONT_FAMILY.normal,
  },

  card: {
    backgroundColor: "white",
    margin: 15,
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },

  title: {
    color: "black",
    fontSize: 18,
    marginBottom: 20,
    fontFamily: FONT_FAMILY.bold,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    color: "black",
    fontFamily: FONT_FAMILY.normal,
    backgroundColor: "white",
  },

  button: {
    backgroundColor: SECONDARY_COLOR,
    marginTop: 20,
    height: 55,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
  },

  error: {
    color: "red",
    marginTop: 5,
    fontFamily: FONT_FAMILY.normal,
  },

  memberCard: {
    backgroundColor: "white",
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 20,
    padding: 18,
    elevation: 4,
  },

  avatar: {
    height: 60,
    width: 60,
    borderRadius: 30,
    backgroundColor: SECONDARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
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

  sendOtpText: {
    color: "white",
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
  },

  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    padding: 15,
    borderRadius: 15,
    marginBottom: 25,
  },

});