// components/context/PlantFilterContext.tsx
import React, { createContext, ReactNode, useContext, useState } from "react";

interface PlantFilterContextType {
  selectedPlantId: string | null;
  setSelectedPlantId: (id: string | null) => void;
  isFiltered: boolean;
  clearFilter: () => void;
}

const PlantFilterContext = createContext<PlantFilterContextType | undefined>(
  undefined,
);

export const PlantFilterProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);

  return (
    <PlantFilterContext.Provider
      value={{
        selectedPlantId,
        setSelectedPlantId,
        isFiltered: selectedPlantId !== null,
        clearFilter: () => setSelectedPlantId(null),
      }}
    >
      {children}
    </PlantFilterContext.Provider>
  );
};

export const usePlantFilter = (): PlantFilterContextType => {
  const ctx = useContext(PlantFilterContext);
  if (!ctx) {
    throw new Error("usePlantFilter must be used within a PlantFilterProvider");
  }
  return ctx;
};
