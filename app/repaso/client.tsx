"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { type EvaluacionRepaso } from "./page";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemGroup,
  ItemSeparator,
} from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";

export default function PracticaList({ evaluations }: { evaluations: EvaluacionRepaso[] }) {
  if (evaluations.length === 0) {
    return (

      <div className="border border-dashed p-12 text-center rounded-lg">

        <p className="text-sm font-bold text-foreground">
          ¡Todo al día!
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          No tienes preguntas pendientes por repasar.
        </p>
      </div>
    );
  }

  return (
    <ItemGroup>

      <ItemSeparator />
      {evaluations.map((item, index) => {
        const correctCount = item.totalQuestions - item.preguntasCount;
        const data = [
          { name: "Resueltas", value: correctCount },
          { name: "Pendientes", value: item.preguntasCount },
        ];

        return (
          <React.Fragment key={item.id}>
            <Item>
              <ItemContent>
                <ItemTitle className="text-sm">{item.titulo}</ItemTitle>
                <ItemDescription className="space-x-2">
                  <Badge variant='outline'>
                    {item.totalQuestions} Preguntas Total
                  </Badge>
                  <Badge variant={'outline'} className="text-destructive">
                    Repasar {item.preguntasCount} 
                  </Badge>

                </ItemDescription>
              </ItemContent>

              <ItemActions>
                <div className="w-8 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={10}
                        outerRadius={14}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        <Cell fill="var(--primary)" />
                        <Cell fill="var(--muted)" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <Button asChild size="sm" variant="outline">
                  <Link href={`/repaso/${item.id}`}>Repasar</Link>
                </Button>
              </ItemActions>
            </Item>
            <ItemSeparator />
          </React.Fragment>
        );
      })}
    </ItemGroup>
  );
}
