"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Wifi, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  front: React.ReactNode;
  back: React.ReactNode;
}

export default function FlipCard({ front, back }: Props) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative w-full max-w-4xl mx-auto cursor-pointer"
      style={{ perspective: "1200px" }}
      onClick={() => setFlipped((f) => !f)}
      role="button"
    >
      <div
        className="relative w-full h-full transition-transform duration-700 ease-in-out"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ── FRONT ── */}
        <Card
          className=" inset-0  relative overflow-hidden shadow-2xl  p-6"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="absolute inset-0 bg-linear-to-br from-primary to-secondary" />
          <div className="absolute inset-0 bg-background/30" />
          <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-white/20 blur-md" />
          <div className="absolute -bottom-20 -left-14 w-64 h-64 rounded-full bg-white/10 blur-md" />

          <CardContent >
            {front}
          </CardContent>
        </Card>

        {/* ── BACK ── */}
        <Card
          className="absolute inset-0  overflow-hidden p-6"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="absolute inset-0 bg-linear-to-br from-secondary to-primary" />
          <div className="absolute inset-0 bg-background/30" />
          <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-background/40 blur-md" />
          <div className="absolute -bottom-20 -left-14 w-64 h-64 rounded-full bg-background/20 blur-md" />

          <div className="relative z-10 flex flex-col gap-4 h-full">

            <CardContent className="p-0 px-6 flex flex-col gap-3">
              {back}
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
}
