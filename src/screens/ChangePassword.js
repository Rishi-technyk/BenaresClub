import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import AuthScreenLayout from "../components/AuthScreenLayout.tsx";
import { FONT_FAMILY } from "../util/colors.tsx";
import Icon from "react-native-vector-icons/Ionicons";
import Button2 from "../components/Button2.tsx";
import { javascriptPost } from "../util/api.tsx";
import { logout } from "../store/slices/authSlice.tsx";
import { Toast } from "react-native-toast-notifications";
import { useDispatch, useSelector } from "react-redux";
import { ENDPOINT } from "../util/constant.ts";
import { useAppTheme } from "../theme/AppThemeProvider.tsx";

const ChangePassword = (navigation) => {
    const dispatch=useDispatch()
    const Token=useSelector(state=>state?.auth?.token)
    const { colors } = useAppTheme();
    const styles = createStyles(colors);
 
  const [passwords, setPasswords] = useState({
    old_password: "",
    new_pass: "",
    conf_new_pass: "",
  });
const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState({
    old: false,
    new: false,
    conf: false,
  });

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  const handleChange = (key, value) => {
    setPasswords({ ...passwords, [key]: value });

    // Reset error live
    setErrors({ ...errors, [key]: "" });
  };

  const validate = () => {
    let valid = true;
    let tempErrors = {};

    if (!passwords.old_password) {
      tempErrors.old_password = "Old password is required";
      valid = false;
    }

    if (!passwords.new_pass) {
      tempErrors.new_pass = "New password is required";
      valid = false;
    } else if (!passwordRegex.test(passwords.new_pass)) {
      tempErrors.new_pass =
        "Must include uppercase, lowercase, number, special char & be 8+ characters";
      valid = false;
    }

    if (!passwords.conf_new_pass) {
      tempErrors.conf_new_pass = "Confirm password is required";
      valid = false;
    } else if (passwords.new_pass !== passwords.conf_new_pass) {
      tempErrors.conf_new_pass = "Passwords do not match";
      valid = false;
    }

    setErrors(tempErrors);
    return valid;
  };

  const handleSubmit = async() => {
    if (!validate()) return;

  setLoading(true);
       const apiRequestObject = {
            path:ENDPOINT.change_password,
            body:  {
        password: passwords.new_pass,
        old_password: passwords.old_password,
        conf_password: passwords.conf_new_pass,
      },
            Token:Token
        }
        const response = await javascriptPost(apiRequestObject);
     
    if (response.status) {
          
          setLoading(false);
          Toast.show(response.message, {
            type: "success",
          });

                dispatch(logout());
                navigation.reset({
                  routes: [{ name: "LoginScreen" }],
                });
        } else {
          setLoading(false);
          Toast.show(response.message, {
            type: "danger",
          });
        }
  };

  return (
    <AuthScreenLayout title="Change Password">
    
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="Old Password"
          placeholderTextColor={colors.placeholder}
          secureTextEntry={!show.old}
          style={[styles.input]}
          value={passwords.old_password}
          onChangeText={(val) => handleChange("old_password", val)}
        />
        <TouchableOpacity onPress={() => setShow({ ...show, old: !show.old })}>
          <Icon
            name={show.old ? "eye-off" : "eye"}
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>
      {errors.old_password && (
        <Text style={styles.error}>{errors.old_password}</Text>
      )}

      {/* New Password */}
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="New Password"
          placeholderTextColor={colors.placeholder}
          secureTextEntry={!show.new}
          style={[styles.input]}
          value={passwords.new_pass}
          onChangeText={(val) => handleChange("new_pass", val)}
        />
        <TouchableOpacity onPress={() => setShow({ ...show, new: !show.new })}>
          <Icon
            name={show.new ? "eye-off" : "eye"}
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>
      {errors.new_pass && (
        <Text style={styles.error}>{errors.new_pass}</Text>
      )}

      {/* Confirm Password */}
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor={colors.placeholder}
          secureTextEntry={!show.conf}
          style={[styles.input]}
          value={passwords.conf_new_pass}
          onChangeText={(val) => handleChange("conf_new_pass", val)}
        />
        <TouchableOpacity
          onPress={() => setShow({ ...show, conf: !show.conf })}
        >
          <Icon
            name={show.conf ? "eye-off" : "eye"}
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>
      {errors.conf_new_pass && (
        <Text style={styles.error}>{errors.conf_new_pass}</Text>
      )}

      {/* Submit Button */}
      <Button2 loading={loading} onPress={handleSubmit} text={'Change Password'}/>
    </AuthScreenLayout>
  );
};

export default ChangePassword;

const createStyles = (colors) =>
  StyleSheet.create({
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderColor: colors.border,
      borderWidth: 1,
      marginTop: 10,
      paddingHorizontal: 10,
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.primary,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    input: {
      flex: 1,
      color: colors.text,
      fontFamily: FONT_FAMILY.normal,
      paddingVertical: Platform.OS === "ios" ? 15 : 10,
    },
    error: {
      color: colors.danger,
      fontSize: 12,
      marginTop: 3,
      marginLeft: 2,
      fontFamily: FONT_FAMILY.light,
    },
  });
