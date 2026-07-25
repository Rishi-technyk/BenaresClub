import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Avatar, Card } from 'react-native-paper';
import { launchImageLibrary } from 'react-native-image-picker';
import { Toast } from 'react-native-toast-notifications';

import Header from '../components/Header';
import BookingHeroCard from '../components/booking/BookingHeroCard';
import EmptyStateCard from '../components/booking/EmptyStateCard';
import AppAlertModal from '../components/feedback/AppAlertModal';
import { useAppAlert } from '../hooks/useAppAlert';
import { DOMAIN } from '../util/constant';
import { javascriptGet } from '../util/api';
import { FONT_FAMILY } from '../util/colors';
import { RootState } from '../store/store';
import { useAppTheme } from '../theme/AppThemeProvider';
import { loginSuccess } from '../store/slices/authSlice';

const Profile: React.FC = () => {
  const dispatch = useDispatch();
  const storedUser = useSelector((state: RootState) => state?.auth?.user);
  const token = useSelector((state: RootState) => state?.auth?.token);
  const { colors } = useAppTheme();
  const { alertState, showAlert, hideAlert } = useAppAlert();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [profile, setProfile] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchProfile = useCallback(async (isRefresh = false) => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await javascriptGet({
        path: 'member/profile',
        Token: token,
      });
console.log( response, '---------------------- response ---------------------');
      if (response?.status && response?.data) {
        setProfile(response.data);
        dispatch(
          loginSuccess({
            user: response.data,
            token,
          }),
        );
        return;
      }

      showAlert({
        title: 'Profile unavailable',
        message: response?.message || 'Unable to fetch the latest profile right now.',
        tone: 'warning',
      });
    } catch (error) {
      showAlert({
        title: 'Profile unavailable',
        message: 'A network issue interrupted the profile refresh.',
        tone: 'danger',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch, showAlert, token]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile]),
  );

  const updateProfilePicture = useCallback(
    async (imageUri: string) => {
      if (!token) {
        return;
      }

      const apiUrl = `${DOMAIN.BASE}member/upload-profile`;
      const formData = new FormData();
      formData.append('profile_image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);

      try {
        setUploadingImage(true);
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const result = await response.json();
        if (result?.status) {
          Toast.show(result.message || 'Profile picture updated successfully!', {
            type: 'success',
          });
          await fetchProfile(true);
          return;
        }

        showAlert({
          title: 'Upload failed',
          message: result?.message || 'Unable to update the profile picture.',
          tone: 'danger',
        });
      } catch (error) {
        showAlert({
          title: 'Upload failed',
          message: 'Something went wrong while uploading the profile picture.',
          tone: 'danger',
        });
      } finally {
        setUploadingImage(false);
      }
    },
    [fetchProfile, showAlert, token],
  );

  const openImagePicker = useCallback(() => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 1,
      },
      response => {
        if (response?.didCancel || response?.errorCode) {
          return;
        }

        const imageUri = response?.assets?.[0]?.uri;
        if (imageUri) {
          updateProfilePicture(imageUri);
        }
      },
    );
  }, [updateProfilePicture]);

  const profileData = profile || null;
  const profileImageUri = profileData?.profile_image
    ? `${DOMAIN.API_IMAGE_URL}${profileData.profile_image}`
    : 'https://randomuser.me/api/portraits/men/1.jpg';

  const infoCards = useMemo(
    () => [
      { id: 'member', name: 'Member ID', detail: profileData?.MemberID || 'N/A' },
      { id: 'status', name: 'Status', detail: profileData?.Status || 'N/A' },
      { id: 'cid', name: 'C ID', detail: profileData?.SC_ID || 'N/A' },
      { id: 'dob', name: 'DOB', detail: profileData?.DOB || 'N/A' },
      { id: 'mobile', name: 'Mobile', detail: profileData?.Mobile || 'N/A' },
      { id: 'category', name: 'Category', detail: profileData?.Catg_Name || 'N/A' },
      { id: 'email', name: 'Email', detail: profileData?.Email || 'N/A' },
      { id: 'gender', name: 'Gender', detail: profileData?.Gender || 'N/A' },
    ],
    [profileData],
  );

  const renderInfoCard = ({ item }: { item: { id: string; name: string; detail: string } }) => (
    <Card style={styles.infoCard}>
      <Card.Title title={item.name} titleStyle={styles.titleText} />
      <Card.Title
        title={item.detail}
        titleStyle={styles.headerText}
        titleNumberOfLines={3}
      />
    </Card>
  );

  if (loading && !profileData) {
    return (
      <View style={styles.container}>
        <Header title="Profile" />
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Fetching latest profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Profile" />

      {!profileData ? (
        <EmptyStateCard
          title="Profile unavailable"
          description="We couldn't load the latest profile details from the backend."
        />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchProfile(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
         
          <TouchableOpacity onPress={openImagePicker} style={styles.profileHero}>
            <Avatar.Image
              size={104}
              source={{ uri: profileImageUri }}
              style={styles.avatar}
            />
            <Text style={styles.displayName}>{profileData?.DisplayName || 'User'}</Text>
            <Text style={styles.memberCode}>{profileData?.SC_ID || 'Member profile'}</Text>
            <Text style={styles.refreshMeta}>
              {uploadingImage ? 'Uploading image...' : 'Tap photo to update'}
            </Text>
          </TouchableOpacity>

          <FlatList
            data={infoCards}
            numColumns={2}
            renderItem={renderInfoCard}
            scrollEnabled={false}
            contentContainerStyle={styles.infoGrid}
            columnWrapperStyle={styles.columnWrapper}
            keyExtractor={item => item.id}
          />
        </ScrollView>
      )}

      <AppAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        tone={alertState.tone}
        primaryLabel={alertState.primaryLabel}
        secondaryLabel={alertState.secondaryLabel}
        onPrimaryPress={() => {
          alertState.onPrimaryPress?.();
          hideAlert();
        }}
        onSecondaryPress={() => {
          alertState.onSecondaryPress?.();
          hideAlert();
        }}
        onDismiss={hideAlert}
      />
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerText: {
      flex: 1,
      fontSize: 15,
      fontFamily: FONT_FAMILY.bold,
      color: colors.text,
    },
    profileHero: {
      margin: 16,
      padding: 20,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    avatar: {
      backgroundColor: colors.surfaceAlt,
      marginBottom: 14,
    },
    displayName: {
      fontFamily: FONT_FAMILY.semiBold,
      fontSize: 22,
      color: colors.text,
    },
    memberCode: {
      marginTop: 6,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 13,
    },
    refreshMeta: {
      marginTop: 8,
      color: colors.primary,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 12,
    },
    infoGrid: {
      paddingHorizontal: 16,
      paddingBottom: 28,
    },
    columnWrapper: {
      justifyContent: 'space-between',
    },
    infoCard: {
      width: '48.5%',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      justifyContent: 'space-between',
      marginBottom: 12,
      borderRadius: 18,
    },
    titleText: {
      fontFamily: FONT_FAMILY.normal,
      color: colors.textMuted,
    },
    loaderWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    loaderText: {
      marginTop: 14,
      color: colors.textMuted,
      fontFamily: FONT_FAMILY.medium,
      fontSize: 14,
    },
  });

export default Profile;
