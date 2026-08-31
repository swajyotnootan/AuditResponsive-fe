import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

export function useUnsavedChanges() {
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const resetDirty = useCallback(() => {
    setIsDirty(false);
  }, []);

  const confirmDiscard = useCallback(
    (onDiscard: () => void) => {
      if (!isDirty) {
        onDiscard();
        return;
      }

      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          {
            text: 'Stay',
            style: 'cancel',
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setIsDirty(false);
              onDiscard();
            },
          },
        ],
      );
    },
    [isDirty],
  );

  return {
    isDirty,
    markDirty,
    resetDirty,
    confirmDiscard,
  };
}