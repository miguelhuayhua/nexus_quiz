import { PreguntasGET } from "@/app/api/preguntas/get";
import React from "react";

type FlashcardContextType = {
    flashcards: PreguntasGET;
    setFlashcards: (flashcards: PreguntasGET) => void;
}

const FlashcardContext = React.createContext<FlashcardContextType>({
    flashcards: [],
    setFlashcards: () => { }
});
const FlashcardProvider = ({ children }: { children: React.ReactNode }) => {
    const [flashcards, setFlashcards] = React.useState<PreguntasGET>([]);

    return (
        <FlashcardContext.Provider value={{ flashcards, setFlashcards }}>
            {children}
        </FlashcardContext.Provider>
    );
}

const useFlashcard = () => {
    const context = React.useContext(FlashcardContext);
    if (!context) {
        throw new Error("useFlashcard debe usarse dentro de FlashcardProvider");
    }
    return context;
}

export { FlashcardProvider, useFlashcard };