"use client";

import { ModeToggle } from "@/components/auth/mode-toggle";
import { NavUser } from "@/components/auth/nav-user";
import { SidebarTrigger } from "@/components/ui/sidebar";

type AuthUser = {
  email?: string | null;
  image?: string | null;
  name?: string | null;
  registrado?: boolean;
};

type NavbarProps = {
  title: string;
  user: AuthUser | null;
};

export function Navbar({ title, user }: NavbarProps) {
  const mainProjectUrl =
    process.env.NEXT_PUBLIC_MAIN_PROJECT_URL ??
    "https://nexus.posgrado.cicap.test";

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
              <NavUser
                email={user.email}
                image={user.image}
                isRegistered={Boolean(user.registrado)}
                mainProjectUrl={mainProjectUrl}
                name={user.name}
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
