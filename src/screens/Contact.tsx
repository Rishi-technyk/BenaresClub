import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Keyboard,
  FlatList,
  Linking,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import NewButton from "../components/Button";
import Header from "../components/Header";
import { useToast } from "react-native-toast-notifications";
import { useSelector } from "react-redux";
import Icons from "react-native-vector-icons/MaterialIcons";
import { FONT_FAMILY } from "../util/colors";
import { ENDPOINT } from "../util/constant";
import { javascriptPost } from "../util/api";
import { RootState } from "../store/store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppTheme } from "../theme/AppThemeProvider";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type ContactItem = {
  id: number;
  icon: string;
  text: string;
  color?: string;
};

type InputField = {
  id: number;
  placeHolder: string;
  name: string;
  maxLength: number;
  keyboardType:
    | "default"
    | "email-address"
    | "phone-pad"
    | "number-pad"
    | "numeric";
  value: string;
};

type RootStackParamList = {
  Contact: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Contact">;

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

const Contact: React.FC<Props> = ({ navigation,route }) => {
  const toast = useToast();
  const token = useSelector((state: RootState) => state.auth?.token);
const { colors } = useAppTheme();
  const [loading, setLoading] = useState(false);

  /* ----------------------- CONTACT INFO ----------------------- */

  const Items: ContactItem[] = JSON.parse(route.params)
  /* ----------------------- FORM INPUTS ----------------------- */

  const [Inputs, setInputs] = useState<InputField[]>([
    {
      id: 1,
      name: "Name",
      placeHolder: "Enter Name",
      keyboardType: "default",
      value: "",
      maxLength: 50,
    },
    {
      id: 2,
      name: "Email",
      placeHolder: "Enter Email",
      keyboardType: "email-address",
      value: "",
      maxLength: 50,
    },
    {
      id: 3,
      name: "Phone",
      placeHolder: "Enter Phone",
      keyboardType: "phone-pad",
      value: "",
      maxLength: 10,
    },
    {
      id: 4,
      name: "Subject",
      placeHolder: "Enter Subject",
      keyboardType: "default",
      value: "",
      maxLength: 100,
    },
    {
      id: 5,
      name: "Message",
      placeHolder: "Write Message",
      keyboardType: "default",
      value: "",
      maxLength: 200,
    },
  ]);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChangeText = (text: string, id: number) => {
    setInputs((prev) =>
      prev.map((input) => (input.id === id ? { ...input, value: text } : input))
    );
  };

  const validateInputs = (): string | null => {
    const [name, email, phone, subject, message] = Inputs.map((i) =>
      i.value.trim()
    );

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name) return "Please enter your name.";
    if (!email || !emailRegex.test(email)) return "Please enter a valid email.";
    if (!phone || phone.length !== 10) return "Phone must be 10 digits.";
    if (!subject) return "Please enter a subject.";
    if (!message) return "Please enter a message.";

    return null;
  };

  /* ------------------------------------------------------------------ */
  /* SUBMIT (API CALL) */
  /* ------------------------------------------------------------------ */

  const handleSubmit = async () => {
    const error = validateInputs();
    if (error) {
      toast.show(error, { type: "danger" });
      return;
    }

    const body = {
      name: Inputs[0].value,
      email: Inputs[1].value,
      phone: Inputs[2].value,
      subject: Inputs[3].value,
      message: Inputs[4].value,
    };

    try {
      setLoading(true);

      const response = await javascriptPost({
        path: ENDPOINT.feedBack,
        body,
        Token: token,
      });
// console.log( response, '---------------------- response ---------------------');
      setLoading(false);
      if (response?.success) {
        toast.show("Your message has been sent!", { type: "success" });

        setInputs((prev) => prev.map((field) => ({ ...field, value: "" })));

        navigation.goBack();
      } else {
        toast.show(response?.message || "Failed to send. Try again.", {
          type: "danger",
        });
      }
    } catch (err) {
      console.error(err);
      toast.show("Something went wrong. Please try later.", { type: "danger" });
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* HANDLE CONTACT CLICK */
  /* ------------------------------------------------------------------ */

  const handleContactPress = (item: ContactItem) => {
    if (item.icon === "email") {
      const emailUrl = `mailto:${item.text}`;
      Linking.openURL(emailUrl).catch(() =>
        toast.show("Could not open email app.", { type: "warning" })
      );
    } else if (item.icon === "call") {
      const phone = item.text.replace(/[^\d]/g, "");
      const phoneUrl = `tel:+91${phone}`;
      Linking.openURL(phoneUrl).catch(() =>
        toast.show("Could not open phone dialer.", { type: "warning" })
      );
    }
  };

  /* ------------------------------------------------------------------ */
  /* UI */
  /* ------------------------------------------------------------------ */

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Contact Us" />

      <KeyboardAwareScrollView
        enableOnAndroid
        enableAutomaticScroll
        keyboardOpeningTime={0}
        extraScrollHeight={80}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20 }}
      >
        {/* ------- Contact Details ------- */}
        <FlatList
          data={Items}
          scrollEnabled={false}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: "row",
                margin: 10,
                alignItems: "center",
              }}
            >
              <Icons name={item.icon} size={20} color={colors.text} style={{ marginRight: 10 }} />
              <Text
                onPress={() => handleContactPress(item)}
                style={{
                  color: item.color ||colors.text,
                  fontFamily: FONT_FAMILY.normal,
                  flex: 1,
                  flexWrap: "wrap",
                }}
              >
                {item.text}
              </Text>
            </View>
          )}
        />

        {/* ------- Input Fields ------- */}
        {Inputs.map((item, index) => (
          <View key={item.id} style={{ marginBottom: 15 }}>
            <Text style={{ color: colors.text, fontFamily: FONT_FAMILY.normal }}>
              {item.name}
            </Text>
            <TextInput
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={{
                borderWidth: 0.3,
                borderRadius: 10,
               borderColor: colors.border,
    backgroundColor: colors.surface,
                padding: 10,
                marginTop: 5,
                fontFamily: FONT_FAMILY.normal,
                minHeight: item.id === 5 ? 150 : undefined,
                textAlignVertical: "top",
                color: colors.text,
              }}
              placeholder={item.placeHolder}
              placeholderTextColor="grey"
              keyboardType={item.keyboardType}
              maxLength={item.maxLength}
              value={item.value}
              onChangeText={(text) => handleChangeText(text, item.id)}
              returnKeyType={index === Inputs.length - 1 ? "done" : "next"}
              onSubmitEditing={(
                e: NativeSyntheticEvent<TextInputSubmitEditingEventData>
              ) => {
                if (index < Inputs.length - 1) {
                  inputRefs.current[index + 1]?.focus();
                } else {
                  Keyboard.dismiss();
                  handleSubmit();
                }
              }}
              blurOnSubmit={false}
            />
          </View>
        ))}

        <NewButton loading={loading} onPress={handleSubmit} text="Ask A Question" />
      </KeyboardAwareScrollView>
    </View>
  );
};

export default Contact;
