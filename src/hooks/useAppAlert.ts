import { useCallback, useState } from 'react';
import type { AppAlertTone } from '../components/feedback/AppAlertModal';

type AlertOptions = {
  title: string;
  message: string;
  tone?: AppAlertTone;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimaryPress?: (() => void) | null;
  onSecondaryPress?: (() => void) | null;
};

const initialState = {
  visible: false,
  title: '',
  message: '',
  tone: 'info' as AppAlertTone,
  primaryLabel: 'Okay',
  secondaryLabel: undefined as string | undefined,
  onPrimaryPress: null as (() => void) | null,
  onSecondaryPress: null as (() => void) | null,
};

export const useAppAlert = () => {
  const [alertState, setAlertState] = useState(initialState);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertState({
      visible: true,
      title: options.title,
      message: options.message,
      tone: options.tone || 'info',
      primaryLabel: options.primaryLabel || 'Okay',
      secondaryLabel: options.secondaryLabel,
      onPrimaryPress: options.onPrimaryPress || null,
      onSecondaryPress: options.onSecondaryPress || null,
    });
  }, []);

  return {
    alertState,
    showAlert,
    hideAlert,
  };
};

export default useAppAlert;
