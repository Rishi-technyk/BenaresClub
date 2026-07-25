import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable
} from "react-native";
import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import { javascriptGet } from "../../util/api";
import { ENDPOINT,  } from "../../util/constant";
import { useSelector } from "react-redux";
import { DARK_BLUE,FONT_FAMILY } from "../../util/colors";
import QRScanModal from "../../components/QRScanModal";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { ActivityIndicator, Modal } from "react-native-paper";
import { RootState } from "../../store/store";
import { AppStackParamList } from "../../navigation/AppDrawer";
import { NativeStackScreenProps } from "@react-navigation/native-stack";


type Props=NativeStackScreenProps<AppStackParamList,'TicketValidation'>;

const TicketValidation:React.FC<Props> = ({navigation,route}) => {
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({
    visible: false,
  });
  const {data}=route.params;
  console.log( data, '---------------------- data ---------------------');
  const [error, seterror] = useState("");
  const [member, setMember] = useState("");
  const userData = useSelector((state :RootState) => state.auth);
  const [selectedTab, setSelectedTab] = useState(null);
  const [settings, setSettings] = useState<null | []>(null);
  const fetchSettings = async () => {
    const apiObj = {
      path: ENDPOINT.admin_event_setting,
      Token: userData?.token,
      body: {},
    };
    const res = await javascriptGet(apiObj);

    if (res?.status) {
      setSettings(res.locations);
      setSelectedTab(res.locations[0]);
      setLoading(false);
    }
  };
  
  const verifyMember = async () => {
    setLoading(true);
    const response = await javascriptGet({
      path: `event/verify-ticket/${data}?search=${member}`,
      Token: userData?.token,
      body: {},
    });
    setLoading(false);
    console.log( response, '---------------------- response ---------------------');
    if (response.success) {
     
      setMember(response.data);
      navigation.navigate("ValidateMemberTickets", { bookingIDs: response.data,id:data });
      seterror("");
      setModal({ visible: false });
    } else {
      seterror(response.message || "Invalid Member ID");
    }
  };
  const role = userData?.user?.role;
  useEffect(() => {
    fetchSettings();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: "#f6f6f8" }}>
  
      <Header title={"Ticket Validation"} />
      <View>
        <View style={styles.segment}>
          {settings?.map((item) => (
            <Pressable
              onPress={() => setSelectedTab(item)}
              style={[
                styles.segmentBtn,
                ,
                selectedTab?.id == item.id && styles.activeSeg,
              ]}
            >
              <Text style={styles.segText}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ flexDirection:'row',flexWrap:'wrap',justifyContent:'center'}}>
        {selectedTab &&
          selectedTab?.data?.map((item) => (
            <View
              style={{
                backgroundColor: '#135bec',
                borderRadius: 10,
                margin: 10,
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
            >
              <TouchableOpacity
                onPress={() => setModal(item)}
                style={{ alignItems: "center" }}
              >
                <Image
                  source={{
                    uri: `https://club26.org/mobileAPI/icons/${item.icon}`,
                  }}
                  height={100}
                  width={100}
                />
                <Text
                  style={{
                    color: "white",

                    fontFamily: FONT_FAMILY.bold,
                  }}
                >
                  {item?.title}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
      </View>

      {modal?.type === "QR" && (
        <QRScanModal
          visible={modal.visible}
          data={selectedTab.name}
          onClose={() => setModal({ visible: false })}
          role={role}

        />
      )}
      {modal?.type === "Member" && (
        <Modal onDismiss={() => setModal({ visible: false })} visible={modal.visible}>
          <KeyboardAwareScrollView>
            <View
              style={{
                backgroundColor: "white",
                margin: 10,
                borderRadius: 10,
                padding: 20,
                justifyContent: "flex-start",
              }}
            >
              <Text
                style={{
                  color: "black",
                  fontFamily: FONT_FAMILY.semiBold,
                  marginBottom: 10,
                }}
              >
                Verify Booking
              </Text>
              <TextInput
                style={{
                  backgroundColor: "#f0f0f0",
                  padding: 10,
                  color: "black",
                  borderWidth: error ? 1 : 0,
                  borderColor: error && "red",
                }}
                placeholderTextColor={"grey"}
                placeholder="Enter Name or Mobile Number"
                value={member}
              keyboardType="default"
                onSubmitEditing={verifyMember}
                onChangeText={(val) => {
                  setMember(val);
                  if (error) {
                    seterror("");
                  }
                }}
                // error={true}
              />
              {error && (
                <Text
                  style={{
                    color: "red",
                    fontFamily: FONT_FAMILY.light,
                    marginBottom: 10,
                  }}
                >
                  {error}
                </Text>
              )}
              <Pressable
                onPress={verifyMember}
                style={{
                  backgroundColor: DARK_BLUE,
                  padding: 10,
                  borderRadius: 7,
                  marginTop: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {loading && (
                  <ActivityIndicator
                    color={"white"}
                    style={{ marginRight: 10 }}
                  />
                )}
                <Text
                  style={{
                    color: "white",
                    fontFamily: FONT_FAMILY.normal,
                  }}
                >
                  Verify
                </Text>
              </Pressable>
            </View>
          </KeyboardAwareScrollView>
        </Modal>
      )}
    </View>
  );
};

export default TicketValidation;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f8",
    padding: 16,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderRadius: 10,
    marginBottom: 16,
    maxHeight: 50,
    margin: 10,
    justifyContent: "center",
  },

  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  activeSeg: {
    backgroundColor: "#fff",
  },
  segText: {
    fontFamily: FONT_FAMILY.bold,
    color: "#135bec",
  },
});
