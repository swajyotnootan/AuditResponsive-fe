import { useCallback, useState } from 'react';

export function useUnsavedChanges() {
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  // Mark form as having unsaved changes
  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  // Mark form as clean after save
  const resetDirty = useCallback(() => {
    setIsDirty(false);
  }, []);

  // Ask whether the user wants to discard changes
  const confirmDiscard = useCallback(
    (onDiscard: () => void) => {
      console.log('confirmDiscard called');
      console.log('isDirty:', isDirty);

      // No changes → close immediately
      if (!isDirty) {
        console.log('NOT DIRTY → closing immediately');
        onDiscard();
        return;
      }

      // Changes exist → show custom confirmation modal
      console.log('DIRTY → showing discard modal');
      setShowDiscardModal(true);
    },
    [isDirty],
  );

  // User selected "Stay"
  const cancelDiscard = useCallback(() => {
    console.log('User selected Stay');
    setShowDiscardModal(false);
  }, []);

  // User selected "Discard"
  const discardChanges = useCallback(
    (onDiscard: () => void) => {
      console.log('User selected Discard');

      setShowDiscardModal(false);
      setIsDirty(false);

      // Wait one tick so the confirmation modal closes cleanly
      // before the parent modal is closed.
      setTimeout(() => {
        onDiscard();
      }, 0);
    },
    [],
  );

  return {
    isDirty,
    markDirty,
    resetDirty,
    showDiscardModal,
    confirmDiscard,
    cancelDiscard,
    discardChanges,
  };
}