import React, { useState } from "react";
import Form8DetailView from "../../auditee/Form8DetailView"; // Adjust path if needed
import Form7DetailView from "./Form7DetailView"; // Adjust path if needed

export default function NCRViewManager({
  initialId,
  initialType = "form7",
  onClose, // ✅ 1. ADD THIS: Accept onClose from the parent dashboard
}: any) {
  const [viewState, setViewState] = useState({
    type: initialType,
    id: initialId,
    params: { id: initialId, type: initialType },
  });

  const handleNavigate = (type: string, params: any) => {
    setViewState({ type, id: params.id, params });
  };

  const handleClose = () => {
    // ✅ 2. UPDATE THIS: Call the parent's onClose to return to the Auditee Dashboard
    if (onClose) {
      onClose();
    }
  };

  if (viewState.type === "form8" || viewState.type === "ncr2") {
    return (
      <Form8DetailView
        initialParams={viewState.params}
        onClose={handleClose}
        onNavigateToForm7={(p: any) => handleNavigate("form7", p)}
      />
    );
  }

  return (
    <Form7DetailView
      initialParams={viewState.params}
      onClose={handleClose}
      onNavigateToForm8={(p: any) => handleNavigate("form8", p)}
    />
  );
}
