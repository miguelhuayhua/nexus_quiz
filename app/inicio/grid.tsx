"use client";

import * as React from "react";
import {
    Sortable,
    SortableContent,
    SortableItem,
    SortableOverlay,
} from "@/components/ui/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityLineChart, AreaRadarChart, FlashCardsActivity } from "./charts";
import { FlashCardsType } from "./page";

interface Props {
    weekDays: { label: string; active: boolean; isToday: boolean }[];
    radarData: any;
    activityData: any;
    hasPro: boolean;
    lineData: any;
    flashcard: FlashCardsType
}

export function GridChart({ weekDays, radarData, hasPro, flashcard, lineData }: Props) {

    const components = [
        <Card className="col-span-4 lg:col-span-2 h-auto">
            <CardHeader>
                <CardTitle>
                    Actividad semanal
                </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
                <div className="flex items-center justify-between gap-1">
                    {weekDays.map((day, idx) => (
                        <div
                            key={idx}
                            className="flex flex-col items-center gap-1.5"
                        >
                            <div
                                className={`size-8 rounded-full border-2 transition-colors ${day.active
                                    ? "border-primary bg-primary/20"
                                    : "border-muted bg-muted/40"
                                    } ${day.isToday
                                        ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                                        : ""
                                    } flex items-center justify-center`}
                            >
                                {day.active && (
                                    <div className="size-2.5 rounded-full bg-primary" />
                                )}
                            </div>
                            <span
                                className={`text-xs ${day.isToday
                                    ? "font-semibold text-primary"
                                    : "text-muted-foreground"
                                    }`}
                            >
                                {day.label}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>,
        <Card className="col-span-4 lg:col-span-2 ">
            <CardHeader>
                <CardTitle>
                    Actividad FlashCards
                </CardTitle>
            </CardHeader>
            <CardContent>
                <FlashCardsActivity data={flashcard} />
            </CardContent>
        </Card>,
        <Card className="col-span-4 lg:col-span-4">
            <CardHeader>
                <CardTitle>Progreso por Área</CardTitle>
            </CardHeader>
            <CardContent>
                <AreaRadarChart data={radarData} />
            </CardContent>
        </Card>,
        <Card className="col-span-4">

            <CardContent>
                <ActivityLineChart data={lineData} />

            </CardContent>
        </Card>
    ]

    const [sortableValue, setSortableValue] = React.useState<number[]>([0, 1, 2, 3]);
    React.useEffect(() => {
        const storage = localStorage.getItem("dashboard_layout");

        if (storage) {
            try {
                setSortableValue(JSON.parse(storage));
            } catch {
                console.error("dashboard_layout inválido");
            }
        }
    }, []);
    return (
        <>

            <Sortable
                value={sortableValue}
                onValueChange={(value) => {
                    setSortableValue(value)
                    localStorage.setItem("dashboard_layout", JSON.stringify(value))
                }}
                orientation="mixed"

            >
                <SortableContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {sortableValue.map((item) => (
                        <SortableItem key={item} value={item} asChild asHandle>
                            {components[item]}
                        </SortableItem>
                    ))}

                </SortableContent>
                <SortableOverlay>
                    <div className="size-full rounded-md bg-primary/10" />
                </SortableOverlay>
            </Sortable>
        </>

    );
}