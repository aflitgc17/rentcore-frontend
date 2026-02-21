"use client";

import { createContext, useContext, useState } from "react";

interface PendingContextType {
  pendingCount: number;
  setPendingCount: React.Dispatch<React.SetStateAction<number>>;
}

const PendingRequestContext = createContext<PendingContextType | null>(null);

export const PendingRequestProvider = ({ children }: { children: React.ReactNode }) => {
  const [pendingCount, setPendingCount] = useState(0);

  return (
    <PendingRequestContext.Provider value={{ pendingCount, setPendingCount }}>
      {children}
    </PendingRequestContext.Provider>
  );
};

export const usePendingRequest = () => {
  const ctx = useContext(PendingRequestContext);
  if (!ctx) throw new Error("PendingRequestProvider 안에서 써야 함");
  return ctx;
};
