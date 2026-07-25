import React, { useState } from 'react';
import {
  StyleSheet,
  StatusBar,
  Platform,
  UIManager,
  TouchableOpacity,
  Text as RNText,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import BaseContainer from './src/BaseContainer';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store/store';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from 'react-native-toast-notifications';
import Icon from 'react-native-vector-icons/Ionicons';
import { navigationRef } from './src/navigation/RootNavigation';
import { GestureHandlerRootView, TextInput } from 'react-native-gesture-handler';
import { AppThemeProvider, useAppTheme } from './src/theme/AppThemeProvider';
import SplashOverlay from './src/components/SplashOverlay';

const client = new QueryClient();

const ApplicationShell: React.FC = () => {
  const { colors, navigationTheme, paperTheme, resolvedMode } = useAppTheme();
  const [showSplash, setShowSplash] = useState(true);
  const gestureStyle = React.useMemo(
    () => [appStyles.flexOne, { backgroundColor: colors.background }],
    [colors.background],
  );
  const safeAreaStyle = React.useMemo(
    () => [appStyles.flexOne, { backgroundColor: colors.primary }],
    [colors.primary],
  );

  const customTextProps = {
    style: {
      fontFamily: 'OpenSans-Regular',
    },
  };
  // Enable layout animation on Android
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  // Default TextInput styles
  const customTextInputProps = {
    style: {
      fontFamily: 'OpenSans-Regular',
      fontSize: 14,
    },
    placeholderTextColor: colors.placeholder,
  };

  // Override default props for Text (RNText because Text from SVG can't be styled globally)
  (RNText as any).defaultProps = {
    ...(RNText as any).defaultProps,
    ...customTextProps,
  };

  // Override default props for TextInput
  (TextInput as any).defaultProps = {
    ...(TextInput as any).defaultProps,
    ...customTextInputProps,
  };

  // TouchableOpacity defaults
  (TouchableOpacity as any).defaultProps = {
    ...(TouchableOpacity as any).defaultProps,
    activeOpacity: 0.9,
  };

  return (
    <>
      <StatusBar
        backgroundColor={colors.background}
               barStyle={'light-content' }
      />

      <ToastProvider
        placement="top"
        duration={2000}
        animationType="zoom-in"
        animationDuration={300}
        offset={50}
        successColor={colors.success}
        dangerColor={colors.danger}
        style={appStyles.toast}
        successIcon={
          <Icon
            name="checkmark-done-circle-outline"
            size={20}
            color={colors.onPrimary}
          />
        }
      >
        <QueryClientProvider client={client}>
          <NavigationContainer ref={navigationRef} theme={navigationTheme}>
            <SafeAreaProvider>
              <GestureHandlerRootView style={gestureStyle}>
                <SafeAreaView
                  style={safeAreaStyle}
                  edges={Platform.OS === 'android' ? ['top', 'bottom'] : ['top']}
                >
                  <PaperProvider theme={paperTheme}>
                    <BaseContainer />
                  </PaperProvider>
                </SafeAreaView>
                <SplashOverlay visible={showSplash} onFinish={() => setShowSplash(false)} />
              </GestureHandlerRootView>
            </SafeAreaProvider>
          </NavigationContainer>
        </QueryClientProvider>
      </ToastProvider>
    </>
  );
};

const Application: React.FC = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <AppThemeProvider>
        <ApplicationShell />
      </AppThemeProvider>
    </PersistGate>
  </Provider>
);

export default Application;

const appStyles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  toast: {
    borderRadius: 30,
  },
});


// 407
// 9452144444
// import React from 'react';
// import {
//   StatusBar,
//   Platform,
//   UIManager,
//   TouchableOpacity,
//   Text as RNText,
// } from 'react-native';
// import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
// import BaseContainer from './src/BaseContainer';
// import { Provider } from 'react-redux';
// import { PersistGate } from 'redux-persist/integration/react';
// import { store, persistor } from './src/store/store';
// import { NavigationContainer } from '@react-navigation/native';
// import { PaperProvider } from 'react-native-paper';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { DARK_BLUE, LIGHT_GREEN } from './src/util/colors';
// import { ToastProvider } from 'react-native-toast-notifications';
// import Icon from 'react-native-vector-icons/Ionicons';
// import { navigationRef } from './src/navigation/RootNavigation';
// import { GestureHandlerRootView, TextInput } from 'react-native-gesture-handler';

// const client = new QueryClient();

// const Application: React.FC = () => {
//   const customTextProps = {
//     style: {
//       fontFamily: 'OpenSans-Regular',
//     },
//   };
//   // Enable layout animation on Android
//   if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
//     UIManager.setLayoutAnimationEnabledExperimental(true);
//   }

//   // Default TextInput styles
//   const customTextInputProps = {
//     style: {
//       fontFamily: 'OpenSans-Regular',
//       fontSize: 14,
//     },
//     placeholderTextColor: 'grey',
//   };

//   // Override default props for Text (RNText because Text from SVG can't be styled globally)
//   (RNText as any).defaultProps = {
//     ...(RNText as any).defaultProps,
//     ...customTextProps,
//   };

//   // Override default props for TextInput
//   (TextInput as any).defaultProps = {
//     ...(TextInput as any).defaultProps,
//     ...customTextInputProps,
//   };

//   // TouchableOpacity defaults
//   (TouchableOpacity as any).defaultProps = {
//     ...(TouchableOpacity as any).defaultProps,
//     activeOpacity: 0.9,
//   };

//   return (
//     <Provider store={store}>
//       <PersistGate loading={null} persistor={persistor}>
//         <StatusBar backgroundColor={DARK_BLUE} barStyle="light-content" />

//         <ToastProvider
//           placement="top"
//           duration={2000}
//           animationType="zoom-in"
//           animationDuration={300}
//           offset={50}
//           successColor={'rgba(120, 202, 20, 0.78)'}
//           dangerColor={'red'}
//           style={{ borderRadius: 30 }}
//           successIcon={
//             <Icon name="checkmark-done-circle-outline" size={20} color={LIGHT_GREEN} />
//           }
//         >
//           <QueryClientProvider client={client}>
//             <NavigationContainer ref={navigationRef}>
//               <SafeAreaProvider>
//                  <GestureHandlerRootView>
//                 <SafeAreaView
//                   style={{ flex: 1, backgroundColor: DARK_BLUE }}
//                   edges={Platform.OS === 'android' ?['top',  'bottom' ]:['top']}
//                 >
//                   <PaperProvider>
//                     <BaseContainer />
//                   </PaperProvider>
//                 </SafeAreaView>
//                 </GestureHandlerRootView>
//               </SafeAreaProvider>
//             </NavigationContainer>
//           </QueryClientProvider>
//         </ToastProvider>
//       </PersistGate>
//     </Provider>
//   );
// };

// export default Application;

// // 4321123
// //temp@1234