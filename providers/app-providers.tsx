"use client";

import * as React from "react";
import { FlashcardProvider } from "./flashcard-provider";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <FlashcardProvider>
      {children}
    </FlashcardProvider>
  );
}
