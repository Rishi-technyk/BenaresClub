import React from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Image,
  Platform,
  TouchableOpacity,
} from "react-native";
import {APP_NAME
} from '@env';
import Svg, { Path } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import DeviceInfo from "react-native-device-info";

import { FONT_FAMILY } from "../util/colors";
import { useAppTheme } from "../theme/AppThemeProvider";

// ----------------------- Types -----------------------

interface LoginScreenProps {
  title: string;
  children: React.ReactNode;
  forgotPasswordText?: boolean;
}

// ----------------------- Component -----------------------

const LoginScreen: React.FC<LoginScreenProps> = ({
  title,
  children,
  forgotPasswordText = false,
}) => {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const { width, height } = Dimensions.get("window");
  const isCompact = width < 380;
  const Version = DeviceInfo.getVersion();
  const styles = createStyles(colors);
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.primary }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {/* ---------------- SVG Background Shape ---------------- */}
          <Svg
            width={width}
            height={height}
            pointerEvents="none"
            viewBox={`0 0 ${width} ${height}`}
            style={{ position: "absolute" }}
          >
            <Path
              d={`M 0 ${height * 1.8}
              C ${width * 0.0} ${height * 0.1}, 
                ${width * 0.9} ${height * 0.90}, 
                ${width } ${height * 0.04}
              L ${width} ${height} 
              L 0 ${height} Z`}
              fill={colors.surfaceAlt}
            />
          </Svg>

          {/* ---------------- App Logo ---------------- */}
          <View style={styles.innerContainer}>
            <Image
              source={require("../../assets/images/Logo.png")}
              style={styles.logo}
            />
            <Text style={styles.headdingTitle}>{APP_NAME}</Text>
          </View>

          {/* ---------------- Title ---------------- */}
          <Text style={[styles.title, isCompact && styles.compactTitle]}>{title}</Text>

          {/* ---------------- Card Container ---------------- */}
          <View style={[styles.card, isCompact && styles.compactCard]}>
            {children}

            {!forgotPasswordText && (
              <TouchableOpacity
                style={styles.backToSignInButton}
                activeOpacity={0.8}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backToSignInText}>Go Back</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ---------------- Forgot Password Button ---------------- */}
          {forgotPasswordText && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.forgotButton}
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              <Text style={styles.forgotPasswordText}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          )}

          {/* ---------------- App Version ---------------- */}
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Version: {Version}</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

// ----------------------- Styles -----------------------

const createStyles = (colors: {
  background: string;
  border: string;
  placeholder: string;
  primary: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  onPrimary: string;
}) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingVertical: 24,
    },
    title: {
      fontSize: 28,
      marginBottom: 20,
      fontFamily: FONT_FAMILY.normal,
      color: colors.onPrimary,
    },
    compactTitle: {
      fontSize: 24,
      marginBottom: 16,
    },
    textInput: {
      color: colors.text,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
    },
  innerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  logo: {height: 30, width: 30, borderRadius: 20, resizeMode: 'cover'},
  headdingTitle: {
    color: colors.onPrimary,
    fontSize: 20,
    marginBottom: 5,
    marginLeft: 5,
    fontFamily: FONT_FAMILY.bold,
  },
  welcomeText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontFamily: FONT_FAMILY.normal,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 30,
    padding: 18,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  compactCard: {
    borderRadius: 24,
    padding: 14,
  },
  signInText: {
    fontSize: 20,
    color: colors.onPrimary,
    textAlign: 'left',
    marginLeft: 30,
    fontFamily: FONT_FAMILY.bold,
  },
  submitButton: {
    borderColor: colors.primary,
    borderWidth: 2,
    padding: 20,
    marginTop: 20,
    marginHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  buttonText: {
    color: colors.primary,
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
  },

  forgotPasswordText: {
    paddingBottom: 10,
    textAlign: 'center',
    paddingVertical: 20,
    fontFamily: FONT_FAMILY.bold,
    color: colors.text,
  },
  versionText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.light,
    color: colors.text,

  },
  dividor: {
    flex: 1,
    borderColor: colors.border,
    borderBottomWidth: 1,
    height: 0,
    margin: 10,
  },
  forgotButton: {
    marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  versionContainer: {marginBottom: 20, alignItems: 'center'},
  backToSignInButton: {
    // marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backToSignInText: {
    color: colors.placeholder,
    fontSize: 14,
    paddingVertical: 20,
    fontFamily: FONT_FAMILY.normal,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 16,
    paddingBottom: 10,
    fontFamily: FONT_FAMILY.normal,
  },
    input: {
    borderBottomWidth: 1,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    fontFamily:FONT_FAMILY.normal,
    color:colors.text,
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
  },
   bottomText:{
    color:colors.onPrimary,
    fontFamily:FONT_FAMILY.normal
  }
  });

export default LoginScreen;
