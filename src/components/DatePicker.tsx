import React, { useState, useEffect } from "react";
import {  Text, TouchableOpacity, StyleSheet } from "react-native";
import DatePicker from "react-native-date-picker";
import moment from "moment";
import { FONT_FAMILY } from "../util/colors";
import { useAppTheme } from "../theme/AppThemeProvider";


interface DatePickerComponentProps {
  placeholder: string;
  setResetDate?: boolean;
  stateDate: (formattedDate: string) => void;
  minDate?: Date;
  maxDate?: Date;
}

const DatePickerComponent: React.FC<DatePickerComponentProps> = ({
  placeholder,
  setResetDate = false,
  stateDate,
  minDate,
  maxDate,
}) => {
  const [date, setDate] = useState<Date>(new Date());
  const [open, setOpen] = useState<boolean>(false);
  const [updateDate, setUpdateDate] = useState<boolean>(false);
  const { colors, resolvedMode } = useAppTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    if (setResetDate === true) {
      setUpdateDate(false);
    }
  }, [setResetDate]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setOpen(true)}
      style={styles.container}
    >
      <Text style={styles.text}>
        {updateDate ? moment(date).format("DD-MMMM-YYYY") : placeholder}
      </Text>

      <DatePicker
        modal
        mode="date"
        theme={resolvedMode}
        open={open}
        date={date}
        minimumDate={minDate}
        maximumDate={maxDate || undefined}
        onConfirm={(pickedDate) => {
          setOpen(false);
          setDate(pickedDate);
          setUpdateDate(true);
          stateDate(moment(pickedDate).format("YYYY-MM-DD"));
        }}
        onCancel={() => setOpen(false)}
      />
    </TouchableOpacity>
  );
};

export default DatePickerComponent;

/* -----------------------------------------
   Styles
----------------------------------------- */

const createStyles = (colors: {
  background: string;
  border: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
}) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderRadius: 14,
      backgroundColor: colors.surface,
      padding: 12,
      justifyContent: "center",
      paddingHorizontal: 12,
      margin: 10,
      borderColor: colors.border,
    },
    text: {
      color: colors.text,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 14,
    },
  });

// import React, { useState, useEffect } from "react";
// import { View, Text, TouchableOpacity } from "react-native";
// import DatePicker from "react-native-date-picker";
// import moment from "moment";
// import { FONT_FAMILY, LIGHT_BLUE } from "../util/colors";

// const DatePickerComponent = ({
//   placeholder,
//   setResetDate,
//   stateDate,
//   minDate,
//   maxDate,
// }) => {
//   const [date, setDate] = useState(new Date());
//   const [open, setOpen] = useState(false);
//   const [updateDate, setUpdateDate] = useState(false);
//   useEffect(() => {
//     if (setResetDate == true) {
//       setUpdateDate(false);
//     }
//   });
//   return (
//     <TouchableOpacity
//       activeOpacity={0.9}
//       onPress={() => setOpen(true)}
//       style={{
//         borderWidth: 0.5,
//         borderRadius: 10,
//         backgroundColor:LIGHT_BLUE,
//         padding: 12,
//         justifyContent: "center",
//         paddingHorizontal: 10,
//         margin:10,
//         borderColor: "black",
//       }}>
//       <Text
//         style={{
//           color: "black",
//           fontFamily: FONT_FAMILY.normal,
//         }}>
//         {updateDate ? moment(date).format("DD-MMMM-YYYY") : placeholder}
//       </Text>
//       <DatePicker
//         modal
//         mode={"date"}
//         open={open}
//         date={date}
//         minimumDate={minDate}
//         maximumDate={!maxDate ? maxDate: new Date()}
//         onConfirm={(date) => {
//           setOpen(false);
//           setDate(date);
//           setUpdateDate(true);
//           stateDate(moment(date).format("YYYY-MM-DD"));
//         }}
//         onCancel={() => {
//           setOpen(false);
//         }}
//       />
//     </TouchableOpacity>
//   );
// };

// export default DatePickerComponent;
