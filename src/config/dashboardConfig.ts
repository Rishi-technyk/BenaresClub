import AsyncStorage from '@react-native-async-storage/async-storage';
import { javascriptGet } from '../util/api';
import { adminLoginDefault, dashboardDefault,drawerDefault } from './dashboardDefault';
import { Alert } from 'react-native';

const STORAGE_KEY = 'dashboard_config';
const DRAWER_KEY='drawer_menus'
const LOGIN_TABS='login_tabs'
export const getDashboardConfig = async () => {
  try {
    // 1️⃣ Load cached config first
    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    let localConfig = cached ? JSON.parse(cached) : null; // null if nothing cached

    // 2️⃣ Fetch latest from backend
    const response = await javascriptGet({ path: 'dashboard/config?type=member' });
  

    if (response?.status) {
      const serverConfig = response;

      // 3️⃣ Compare version
      if (!localConfig || serverConfig?.version > localConfig?.version) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serverConfig));
        return serverConfig;
      }
    }

    // 4️⃣ Return cached if available
    if (localConfig) return localConfig;

    // 5️⃣ Fallback to default if nothing cached
    return dashboardDefault;
  } catch (e) {
    console.error('Error fetching dashboard config:', e);

    // Return cached if exists, otherwise default
    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : dashboardDefault;
  }
};
export const getDrawerConfig = async () => {
  try {
    // 1️⃣ Load cached config first
    const cached = await AsyncStorage.getItem(DRAWER_KEY);
    let localConfig = cached ? JSON.parse(cached) : null;

    // 2️⃣ Fetch latest from backend
    const response = await javascriptGet({ path: 'drawer/config' });
 

    if (response?.status) {
      const serverConfig = response;

      // 3️⃣ Compare version
      if (!localConfig || serverConfig?.version > localConfig?.version) {
        await AsyncStorage.setItem(
          DRAWER_KEY,
          JSON.stringify(serverConfig)
        );
        return serverConfig;
      }
    }

    // 4️⃣ Return cached if available
    if (localConfig) return localConfig;

    // 5️⃣ Fallback to default if nothing cached
    return drawerDefault;

  } catch (e) {
    console.error('Error fetching drawer config:', e);

    // Return cached if exists, otherwise default
    const cached = await AsyncStorage.getItem(DRAWER_KEY);
    return cached ? JSON.parse(cached) : drawerDefault;
  }
};
export const getAdminLoginConfig = async () => {
  try {
    const cached = await AsyncStorage.getItem(LOGIN_TABS);
    let localConfig = cached ? JSON.parse(cached) : adminLoginDefault;

    // 2️⃣ Fetch latest from backend
    const response = await javascriptGet({ path: 'admin/login/config' });
console.log(response,"response response response response")

    if (response?.status) {
      const serverConfig = response;
  
      // 3️⃣ Compare version
      if (!localConfig || serverConfig?.version > localConfig?.version) {
        await AsyncStorage.setItem(
          LOGIN_TABS,
          JSON.stringify(serverConfig),
        );
     
        return serverConfig;
      }
    }

    return localConfig;
  } catch (e) {
    console.log('Drawer config error', e);
    Alert.alert('Drawer config error')
    return drawerDefault;
  }
};

