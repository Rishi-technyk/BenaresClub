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
        {updateDate ? moment(date).format("DD-MMM-YYYY") : placeholder}
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
  border: string;
  surface: string;
  text: string;
}) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderRadius: 14,
      backgroundColor: colors.surface,
      padding: 13,
      justifyContent: "center",
      paddingHorizontal: 12,
      borderColor: colors.border,
    },
    text: {
      color: colors.text,
      fontFamily: FONT_FAMILY.normal,
      fontSize: 14,
    },
  });
