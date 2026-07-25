import React, { useEffect } from "react";
import { Alert, Linking, Platform } from "react-native";
import DeviceInfo from "react-native-device-info";
import InAppUpdates, {
  IAUUpdateKind,
  StartUpdateOptions,
  NeedsUpdateResponse,
} from "sp-react-native-in-app-updates";

const InAppUpdate: React.FC = () => {
  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
     const Version = DeviceInfo.getVersion();
    const inAppUpdates = new InAppUpdates(false); // false = debug logs enabled

    try {
      const result: NeedsUpdateResponse = await inAppUpdates.checkNeedsUpdate({curVersion:Version});

      console.log("Update Check Result: ", result.shouldUpdate);

      if (result.shouldUpdate) {
        if (Platform.OS === "android") {
          const updateOptions: StartUpdateOptions = {
            updateType: IAUUpdateKind.IMMEDIATE, // or FLEXIBLE
          };

          // Start Android update
          inAppUpdates.startUpdate(updateOptions);
        } else {
          // iOS only shows store update alert
          Alert.alert(
            "Update Available",
            "A newer version of the app is available. Please update to continue.",
            [
              { text: "Later" },
              {
                text: "Update",
                onPress: () => Linking.openURL('https://apps.apple.com/in/app/lgcup/id6761984687'),
              },
            ]
          );
        }
      }
    } catch (error) {
      console.log("In-App Update error:", error);
    }
  };
// const checkForUpdates = async () => {
//     // enable debug mode ONLY in dev to simulate updates
//     const inAppUpdates = new InAppUpdates(true);
// console.log(inAppUpdates,'INapp')
//     try {
//       let result: NeedsUpdateResponse;

//       if (__DEV__) {
//         // 🔥 Fake update response for testing
//         result = await inAppUpdates.checkNeedsUpdate({
//           curVersion: "0.0.1",
//         });
//         console.log("🔧 Debug Fake Update Check Result:", result);
//       } else {
//         // 📌 Real production update check
//         result = await inAppUpdates.checkNeedsUpdate();
//         console.log("📡 Live Update Check Result:", result);
//       }

//       if (result.shouldUpdate) {
//         if (Platform.OS === "android") {
//           const updateOptions: StartUpdateOptions = {
//             updateType: IAUUpdateKind.IMMEDIATE, // or FLEXIBLE
//           };

//           console.log("⚡ Starting Android Update...");
//           inAppUpdates.startUpdate(updateOptions);
//         } else {
//           // iOS → redirect user to App Store
//           Alert.alert(
//             "Update Available",
//             "A new version is available. Please update your app.",
//             [
//               { text: "Cancel" },
//               {
//                 text: "Update",
//                 onPress: () => {
//                   console.log("⚡ Opening App Store...");
//                   inAppUpdates.startUpdate();
//                 },
//               },
//             ]
//           );
//         }
//       }
//     } catch (error) {
//       console.log("❌ In-App Update error:", error);
//     }
//   };

  return null;
};

export default InAppUpdate;
