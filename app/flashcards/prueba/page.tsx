'use client'

import * as React from "react"
import { Button } from '@/components/ui/button';

import { ArrowLeft } from 'lucide-react'

import { useFlashcard } from "@/providers/flashcard-provider";
import { Progress } from "@/components/ui/progress";
import FlipCard from "@/components/ui/flip-card";
import { notFound, useRouter } from "next/navigation";
import { fetchAuth } from "@/helpers/fetchers";



export default function CursoClient() {

    //selected 
    const [step, setStep] = React.useState<number>(0);
    const { flashcards } = useFlashcard();
    const router = useRouter();
    if (!flashcards || flashcards.length === 0) {
        router.back();
    }
    const postRegistro = (dificultad: string) => {
        const data = {
            preguntaId: flashcards[step].id,
            dificultad,
            id: flashcards[step].id,
        }
        fetchAuth('/flashcards', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    }

    const sortedFlashCards = [...flashcards].map((a) => {
        const nivelDificultad = a.dificultad == "DIFICIL" ? 1 : a.dificultad == "MEDIO" ? 2 : a.dificultad == "SENCILLO" ? 3 : 0;
        return { ...a, nivelDificultad };
    }).sort((a, b) => a.nivelDificultad - b.nivelDificultad);
    if (flashcards.length === 0) return notFound();
    return (
        <div className="p-4 container mx-auto py-10 space-y-8">
            <h1 className="text-3xl">FlashCards</h1>
            <div className="flex items-center justify-between">
                <Button onClick={() => router.back()} variant={'outline'}>
                    <ArrowLeft /> Salir
                </Button>
                <p className="text-2xl">
                    {`${step + 1}`} / <span className="text-primary">{flashcards.length}</span>
                </p>
            </div>
            <Progress value={(step + 1) * 100 / flashcards.length} />
            <div>
                <FlipCard front={<>
                    <h4 className="text-2xl text-center">
                        Anverso
                    </h4>
                    <p className="text-base text-center">
                        {
                            sortedFlashCards[step].enunciado
                        }
                    </p>
                    <p className="text-center text-foreground/70">
                        Toca para ver la respuesta
                    </p>
                </>} back={<>
                    <h4 className="text-2xl text-center">
                        Reverso
                    </h4>
                    <p className="text-base text-center">
                        {
                            sortedFlashCards[step].explicacion
                        }
                    </p>
                    <Button onClick={() => setStep(step + 1)}>
                        Siguiente
                    </Button>


                </>} />
            </div>
            <div className="grid grid-cols-4 gap-4 my-2 max-w-xl mx-auto">
                <Button onClick={() => postRegistro("OTRA")} variant={'ghost'} className="bg-red-600" >
                    Otra <span className="text-xs border border-white/50 px-0.5 rounded-lg">{"<1m"}</span>
                </Button>
                <Button onClick={() => postRegistro("DIFICIL")} variant={'ghost'} className="bg-amber-600">
                    Difícil <span className="text-xs border border-white/50 px-0.5 rounded-lg">{"6m"}</span>
                </Button>
                <Button onClick={() => postRegistro("BIEN")} variant={'ghost'} className="bg-green-600">
                    Bien <span className="text-xs border border-white/50 px-0.5 rounded-lg">{"10m"}</span>
                </Button>
                <Button onClick={() => postRegistro("FACIL")} variant={'ghost'} className="bg-cyan-600">
                    Fácil <span className="text-xs border border-white/50 px-0.5 rounded-lg">{"4d"}</span>
                </Button>
            </div>
        </div>
    )
}