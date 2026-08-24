"use client";
import { NavUser } from "@/components/auth/nav-user";
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
    "https://nexus-educa.com";
  const plan = user?.plan ?? "FREE";

  return (
    <header className="sticky top-0 z-20 w-full border-b  bg-background/80 backdrop-blur">
      <div className=" flex h-14 w-full items-center justify-between px-4">
        <SidebarTrigger />
        {user && (
          <NavUser
            email={user.email}
            image={user.image}
            mainProjectUrl={mainProjectUrl}
            name={user.name}
            plan={plan}
          />
        )}
      </div>
    </header>
  );
}
