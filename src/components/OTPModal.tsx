import React, { useEffect, useState } from "react";
import {
  Image,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { useSelector } from "react-redux";

import NewButton from "./Button";
import UniversalModal from "./UniversalModal";
import { FONT_FAMILY, SECONDARY_COLOR } from "../util/colors";
import { ENDPOINT } from "../util/constant";
import { javascriptGet, ApiResponse } from "../util/api";
import { RootState } from "../store/store";
import { useAppTheme } from "../theme/AppThemeProvider";

/* ---------------------------------------------------------
   TYPES
--------------------------------------------------------- */

interface OTPModalProps {
  visible: boolean;
  setVisible: (value: boolean) => void;
  data?: any; // If data type exists, you can refine
}

interface OTPResponse {
  otp: string;
}

/* ---------------------------------------------------------
   COMPONENT
--------------------------------------------------------- */

const OTPModal: React.FC<OTPModalProps> = ({ visible, setVisible }) => {
  const [OTP, setOTP] = useState<string | number | undefined>();
  const [loader, setLoader] = useState<boolean>(false);
 const {colors}=useAppTheme();
  const token = useSelector((state: RootState) => state.auth?.token);



  /* ---------------------------------------------------------
     API CALL
  --------------------------------------------------------- */
  async function callAPI() {
    try {
      const apiRequestObject = {
        path: ENDPOINT.otp,
        body: {},
        Token: token,
      };

      setLoader(true);

      const response: ApiResponse<OTPResponse> = 
      await javascriptGet(
        apiRequestObject
      );

      setLoader(false);
      setOTP(response.data?.otp);

      return response;
    } catch (err) {
      setLoader(false);
      return { result: "FAILURE" };
    }
  }

  useEffect(() => {
    callAPI();
  }, []);
  
  return (
    <UniversalModal
      dismissable={true}
      statusBarTranslucent={true}
      visible={visible}
      title="OTP"
      
      setVisible={setVisible}
    >
      <View style={{ flex: 1 }}>
        {/* OTP VIEW */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Image
            resizeMode="contain"
            style={{ height: 100, marginBottom: 20 }}
            source={require("../../assets/images/OTPScreen.png")}
          />

          <Text
            style={{
              fontFamily: FONT_FAMILY.bold,
              fontSize: 30,
              letterSpacing: 20,
              color: colors.text,
            }}
          >
            {OTP}
          </Text>
        </View>

        {/* REFRESH BUTTON */}
        <View style={{ marginHorizontal: 20 }}>
          <NewButton text="Refresh OTP" onPress={callAPI} loading={loader} />
        </View>
      </View>
    </UniversalModal>
  );
};

export default React.memo(OTPModal);

/* ---------------------------------------------------------
   STYLES
--------------------------------------------------------- */