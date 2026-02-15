"use client";

import { CircleIcon, SparklesIcon } from "lucide-react";

import { ModeToggle } from "@/components/auth/mode-toggle";
import { NavUser } from "@/components/auth/nav-user";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";

type AuthUser = {
  email?: string | null;
  image?: string | null;
  name?: string | null;
  registrado?: boolean;
  plan?: "FREE" | "PRO";
};

type NavbarProps = {
  title: string;
  user: AuthUser | null;
};

export function Navbar({ title, user }: NavbarProps) {
  const mainProjectUrl =
    process.env.NEXT_PUBLIC_MAIN_PROJECT_URL ??
    "https://nexus.posgrado.cicap.tech";
  const plan = user?.plan ?? "FREE";
  const PlanIcon = plan === "PRO" ? SparklesIcon : CircleIcon;
  const planLabel = plan === "PRO" ? "PRO" : "BASIC";
  const proBadgeClass =
    "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300";

  return (
    <header className="sticky top-0 z-20 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger />
          <h1 className="truncate font-medium text-sm sm:text-base">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          {user && (
            <>
              <Badge
                className={`hidden gap-1 sm:inline-flex ${plan === "PRO" ? proBadgeClass : ""}`}
                variant="outline"
              >
                <PlanIcon className="size-3" />
                {planLabel}
              </Badge>
              <NavUser
                email={user.email}
                image={user.image}
                mainProjectUrl={mainProjectUrl}
                name={user.name}
                plan={plan}
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
