import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import ShimmerPlaceholder from "react-native-shimmer-placeholder";
import LinearGradient from "react-native-linear-gradient";
import { useSelector } from "react-redux";
import Header from "../components/Header";
import { javascriptGet, javascriptPost } from "../util/api";
import { FONT_FAMILY } from "../util/colors";
import { useAppTheme } from "../theme/AppThemeProvider";

interface FeedbackCategory {
  id: number;
  name: string;
}

interface FeedbackType {
  id: number;
  name: string;
  categories: FeedbackCategory[];
}

interface RootState {
  auth: {
    token: string;
  };
}

const FeedbackScreen: React.FC = () => {
  const userData = useSelector((state: RootState) => state.auth);
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [feedbackTypes, setFeedbackTypes] = useState<FeedbackType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [description, setDescription] = useState<string>("");

  const loadFeedbackTypes = useCallback(async () => {
   
    try {
      const response = await javascriptGet({
        path: "member/feedback/types-with-categories",
        body: {},
        Token: userData?.token,
      });
      if (response?.status) {
        setFeedbackTypes(response.data);
        setSelectedType(response.data?.[0]?.id ?? null);
      } else {
        Alert.alert("Error", response?.message || "Unable to load feedback data");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load feedback data.");
    } finally {
      setLoading(false);
    }
  }, [userData?.token]);

  useEffect(() => {
    loadFeedbackTypes();
  }, [loadFeedbackTypes]);

  const submitFeedback = async () => {
    if (!selectedType) return Alert.alert("Validation", "Please select feedback type");
    if (!selectedCategory) return Alert.alert("Validation", "Please select category");
    if (!description.trim()) return Alert.alert("Validation", "Please enter description");

    try {
      setSubmitting(true);

      const response = await javascriptPost({
        path: "member/feedback/submit",
        body: {
          type_id: selectedType,
          category_id: selectedCategory,
          description,
        },
        Token: userData?.token,
      });

      if (response?.status) {
        Alert.alert("Thank You", response.message);
        setSelectedCategory(null);
        setDescription("");
      } else {
        Alert.alert("Error", response?.message || "Submission failed");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

 const categoriesForSelectedType = useMemo(() => {
  if (!selectedType) return [];

  return (
    feedbackTypes.find(t => t.id === selectedType)?.categories || []
  );
}, [selectedType, feedbackTypes]);
const feedbackTypeData = useMemo(
  () =>
    feedbackTypes?.map(t => ({
      label: t.name.toUpperCase(),
      value: t.id,
    })),
  [feedbackTypes]
);
  return (
    <View style={styles.screen}>
      <Header title="Submit Your Feedback" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Help us improve your club experience</Text>
          <Text style={styles.heroText}>
            Share an issue, suggestion, or appreciation. The more context you add,
            the faster the team can act on it.
          </Text>
        </View>

        <View style={styles.formCard}>
          {loading ? (
            <>
              <ShimmerPlaceholder LinearGradient={LinearGradient} style={styles.shimmer} />
              <ShimmerPlaceholder LinearGradient={LinearGradient} style={styles.shimmer} />
              <ShimmerPlaceholder LinearGradient={LinearGradient} style={styles.shimmerBig} />
              <ShimmerPlaceholder LinearGradient={LinearGradient} style={styles.shimmerBtn} />
            </>
          ) : (
            <>
              <Dropdown
                style={styles.dropdown}
                containerStyle={styles.dropdownMenu}
                data={feedbackTypeData}
                labelField="label"
                valueField="value"
                placeholder="Select Feedback Type"
                value={selectedType}
                itemTextStyle={styles.dropdownItemText}
                selectedTextStyle={styles.selectedText}
                placeholderStyle={styles.placeholder}
                activeColor={colors.surfaceAlt}
                onChange={item => {
                  setSelectedType(item.value);
                  setSelectedCategory(null);
                }}
              />

              <Dropdown
                style={styles.dropdown}
                containerStyle={styles.dropdownMenu}
                data={categoriesForSelectedType}
                labelField="name"
                valueField="id"
                placeholder="Select Category"
                value={selectedCategory}
                itemTextStyle={styles.dropdownItemText}
                selectedTextStyle={styles.selectedText}
                placeholderStyle={styles.placeholder}
                activeColor={colors.surfaceAlt}
                onChange={item => setSelectedCategory(item.id)}
              />

              <TextInput
                style={styles.input}
                placeholder="Describe the issue or idea..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={6}
                maxLength={250}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />

              <Text style={styles.charCount}>{description.length}/250</Text>

              <TouchableOpacity
                style={styles.btn}
                onPress={submitFeedback}
                disabled={submitting}
              >
                {submitting && (
                  <ActivityIndicator color={colors.onPrimary} style={styles.loader} />
                )}
                <Text style={styles.btnText}>Submit Feedback</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    heroCard: {
      borderRadius: 24,
      padding: 20,
      backgroundColor: colors.primary,
      marginBottom: 16,
    },
    heroTitle: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 20,
    },
    heroText: {
      marginTop: 8,
      color: colors.surfaceAlt,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 13,
      lineHeight: 20,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dropdown: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 14,
      marginBottom: 15,
    },
    dropdownMenu: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    dropdownItemText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.normal,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      color: colors.text,
      backgroundColor: colors.background,
      minHeight: 130,
      marginBottom: 8,
      fontFamily: FONT_FAMILY.normal,
    },
    btn: {
      backgroundColor: colors.background,
      padding: 15,
      borderRadius: 14,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 12,
      
    },
    btnText: {
      color: colors.onPrimary,
      fontFamily: FONT_FAMILY.bold,
      fontSize: 16,
    },
    loader: {
      marginRight: 8,
    },
    selectedText: {
      color: colors.text,
      fontFamily: FONT_FAMILY.normal,
    },
    placeholder: {
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
    },
    charCount: {
      alignSelf: "flex-end",
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 11,
    },
    shimmer: {
      height: 50,
      borderRadius: 10,
      marginBottom: 15,
    },
    shimmerBig: {
      height: 130,
      borderRadius: 10,
      marginBottom: 20,
    },
    shimmerBtn: {
      height: 50,
      borderRadius: 10,
    },
  });

export default FeedbackScreen;
