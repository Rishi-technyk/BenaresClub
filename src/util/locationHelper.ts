import { Platform, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';

const permission =
  Platform.OS === 'ios'
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

export const getCurrentLocation = async () => {
  let status = await check(permission);

  if (status !== RESULTS.GRANTED) {
    status = await request(permission);
  }

  if (status !== RESULTS.GRANTED) {
    Alert.alert(
      'Permission Required',
      'Location permission is required.',
    );
    return null;
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => resolve(position.coords),
      error => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      },
    );
  });
};