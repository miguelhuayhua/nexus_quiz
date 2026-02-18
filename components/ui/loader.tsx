"use client";
import { ReactNode, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoaderProps {
  children?: ReactNode;
  className?: string;
  variant?: "default" | "cube" | "dual-ring" | "magnetic-dots";
  size?: number;
}

export function Loader({
  children,
  className = "",
  variant = "default",
  size,
}: LoaderProps) {
  const finalSize = useMemo(() => size ?? 24, [size]);

  return (
    <div className={cn("flex gap-2", className)}>
      <div
        className="relative flex items-center justify-center"
        style={{
          height: finalSize,
          width: finalSize,
        }}
      >
        {variant === "default" && (
          <>
            <div className="absolute inset-0 rounded-full border-t-[1.5px] border-b-[1.5px] border-foreground" />
            <motion.div
              className="absolute inset-0 rounded-full border-t-[1.5px] border-b-[1.5px] border-foreground"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
          </>
        )}

        {variant === "cube" && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pt-1"
            animate={{ rotateY: [0, 360] }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: [0.6, 0.05, -0.01, 0.9], // Custom bezier for slow start, fast spin
            }}
          >
            <img
              src="/X.png"
              alt="Loading..."
              className="h-full w-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
            />
          </motion.div>
        )}

        {variant === "dual-ring" && (
          <>
            <div className="absolute inset-0 rounded-full border-[1.5px] border-white/30 shadow-[0_0_4px_rgba(0,0,0,0.3)] dark:shadow-[0_0_4px_rgba(255,255,255,0.3)]" />
            <motion.div
              className="absolute inset-0 rounded-full border-t-[1.5px] border-white border-b-transparent shadow-[0_0_6px_rgba(0,0,0,0.5)] dark:shadow-[0_0_6px_rgba(255,255,255,0.7)]"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
          </>
        )}

        {variant === "magnetic-dots" && (
          <div className="relative flex items-center justify-center h-full w-full">
            <motion.div
              className="absolute rounded-full bg-black dark:bg-white"
              style={{
                height: finalSize / 3,
                width: finalSize / 3,
              }}
              animate={{ x: [-(finalSize / 3), 0, -(finalSize / 3)] }}
              transition={{
                repeat: Infinity,
                duration: 1.2,
                ease: "easeInOut",
                times: [0, 0.5, 1],
              }}
            />
            <motion.div
              className="absolute rounded-full bg-black dark:bg-white"
              style={{
                height: finalSize / 3,
                width: finalSize / 3,
              }}
              animate={{ x: [finalSize / 3, 0, finalSize / 3] }}
              transition={{
                repeat: Infinity,
                duration: 1.2,
                ease: "easeInOut",
                times: [0, 0.5, 1],
              }}
            />
            <motion.div
              className="absolute rounded-full bg-black dark:bg-white opacity-0"
              style={{
                height: finalSize / 3,
                width: finalSize / 3,
              }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                repeat: Infinity,
                duration: 1.2,
                ease: "easeInOut",
                times: [0.45, 0.5, 0.55],
              }}
            />
          </div>
        )}
      </div>

      {children && <div className="text-sm">{children}</div>}
    </div>
  );
}
