"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusinessIcon,
  BookOpenCheckIcon,
  CircleIcon,
  ClipboardListIcon,
  HistoryIcon,
  HouseIcon,
  SparklesIcon,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";

import { NavUser } from "@/components/auth/nav-user";
import { Navbar } from "@/components/auth/navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Group, GroupSeparator } from "@/components/ui/group";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type LayoutUser = {
  email?: string | null;
  image?: string | null;
  name?: string | null;
  registrado?: boolean;
  plan?: "FREE" | "PRO";
};

const socialLinks = {
  facebook: "https://www.facebook.com/NexusEduca",
  instagram: "https://www.instagram.com/jennifferllamoca/",
  tiktok: "https://www.tiktok.com/@actualizatepe?_r=1&_t=ZS-93Bp7DRVtqy",
  youtube: "https://www.youtube.com/@NexusEduca-pgd",
};

function getNavbarTitle(pathname: string): string {
  if (pathname === "/") return "Inicio";

  if (pathname.startsWith("/banqueos")) {
    return pathname === "/banqueos" ? "Banqueos" : "Detalle de banqueo";
  }

  if (pathname.startsWith("/mis-banqueos")) {
    return "Mis banqueos";
  }

  if (pathname.startsWith("/historial")) {
    return "Historial";
  }

  if (pathname.startsWith("/prueba/")) {
    if (pathname.endsWith("/resultado")) return "Resultado de evaluación";
    if (pathname.endsWith("/solucionario")) return "Solucionario";
    return "Prueba";
  }

  if (pathname.startsWith("/repaso")) {
    return pathname === "/repaso" ? "Área de repaso" : "Detalle de repaso";
  }

  return "Nexus Preguntas";
}

function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: LayoutUser | null }) {
  const { isMobile, open } = useSidebar();
  const pathname = usePathname();
  const isCompact = isMobile || !open;
  const socialOrientation = isMobile ? "horizontal" : isCompact ? "vertical" : "horizontal";
  const socialSeparatorOrientation =
    socialOrientation === "horizontal" ? "vertical" : "horizontal";

  const isActivePath = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const getMenuButtonClassName = (isActive: boolean) =>
    cn("data-[active=true]:font-normal", isActive && "bg-primary/5 [&>svg]:text-primary");
  const misBanqueosIsActive = isActivePath("/mis-banqueos");
  const userInitial = user?.name?.trim().charAt(0)?.toUpperCase() ?? "U";
  const userName = user?.name?.trim() || "Usuario";
  const userEmail = user?.email?.trim() || "Sin correo";
  const userPlan = user?.plan ?? "FREE";
  const planLabel = userPlan === "PRO" ? "PRO" : "BASIC";
  const PlanIcon = userPlan === "PRO" ? SparklesIcon : CircleIcon;

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="mx-auto pl-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                className={getMenuButtonClassName(isActivePath("/inicio"))}
                isActive={isActivePath("/inicio")}
                render={<Link href="/inicio" />}
              >
                <HouseIcon />
                <span>Inicio</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={getMenuButtonClassName(isActivePath("/banqueos"))}
                isActive={isActivePath("/banqueos")}
                render={<Link href="/banqueos" />}
              >
                <ClipboardListIcon />
                <span>Banqueos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={getMenuButtonClassName(isActivePath("/repaso"))}
                isActive={isActivePath("/repaso")}
                render={<Link href="/repaso" />}
              >
                <BookOpenCheckIcon />
                <span>Repaso</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={cn(
                  "data-[active=true]:font-normal",
                  misBanqueosIsActive &&
                  "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200 [&>svg]:text-amber-500",
                )}
                isActive={misBanqueosIsActive}
                render={<Link href="/mis-banqueos" />}
              >
                <BriefcaseBusinessIcon />
                <span className="flex items-center gap-2">
                  Mis banqueos
                  <Badge className="gap-1 border-yellow-400 bg-yellow-50 text-yellow-800 dark:border-yellow-500/50 dark:bg-yellow-500/20 dark:text-yellow-300" variant="outline">
                    <SparklesIcon className="size-3" />
                    Pro
                  </Badge>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={getMenuButtonClassName(isActivePath("/historial"))}
                isActive={isActivePath("/historial")}
                render={<Link href="/historial" />}
              >
                <HistoryIcon />
                <span>Historial</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="space-y-2 px-2 pb-1 text-center">
          {open || isMobile ? (
            <div className="rounded-lg border bg-background/70 px-2 py-2 text-left">
              <div className="flex items-center gap-2">
                <Avatar className="size-9">
                  <AvatarImage alt={userName} src={user?.image ?? ""} />
                  <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{userName}</p>
                  <p className="truncate text-muted-foreground text-xs">{userEmail}</p>
                </div>
                <Badge
                  className={
                    userPlan === "PRO"
                      ? "border-yellow-400 bg-yellow-50 text-yellow-800 dark:border-yellow-500/50 dark:bg-yellow-500/20 dark:text-yellow-300"
                      : undefined
                  }
                  variant="outline"
                >
                  <PlanIcon className="size-3" />
                  {planLabel}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center pl-2">
              <NavUser
                email={userEmail}
                image={user?.image}
                mainProjectUrl={
                  process.env.NEXT_PUBLIC_MAIN_PROJECT_URL ?? "https://nexus.posgrado.cicap.test"
                }
                name={userName}
                plan={userPlan}
                triggerClassName="mx-auto inline-flex cursor-pointer items-center justify-center rounded-full border bg-background/70 p-1"
                avatarClassName="size-8"
              />
            </div>
          )}

          {open && (
            <p className="text-center text-muted-foreground text-xs">Nuestras redes sociales</p>
          )}
          <Group className="mx-auto" orientation={socialOrientation}>
            <Button
              aria-label="Facebook"
              render={<a href={socialLinks.facebook} rel="noreferrer" target="_blank" />}
              size="icon-sm"
              variant="outline"
            >
              <FaFacebook />
            </Button>
            <GroupSeparator orientation={socialSeparatorOrientation} />
            <Button
              aria-label="Instagram"
              render={<a href={socialLinks.instagram} rel="noreferrer" target="_blank" />}
              size="icon-sm"
              variant="outline"
            >
              <FaInstagram />
            </Button>
            <GroupSeparator orientation={socialSeparatorOrientation} />
            <Button
              aria-label="TikTok"
              render={<a href={socialLinks.tiktok} rel="noreferrer" target="_blank" />}
              size="icon-sm"
              variant="outline"
            >
              <FaTiktok className="size-3.5" />
            </Button>
            <GroupSeparator orientation={socialSeparatorOrientation} />
            <Button
              aria-label="YouTube"
              render={<a href={socialLinks.youtube} rel="noreferrer" target="_blank" />}
              size="icon-sm"
              variant="outline"
            >
              <FaYoutube className="size-3.5" />
            </Button>
          </Group>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AppLayoutShell({
  children,
  user,
}: Readonly<{
  children: React.ReactNode;
  user: LayoutUser | null;
}>) {
  const pathname = usePathname();
  const isFullScreenExam = /^\/prueba\/[^/]+(?:\/(?:resultado|solucionario))?$/.test(pathname);
  const pathSegments = pathname.split("/").filter(Boolean);
  const isMisBanqueoScopedRoute =
    pathSegments[0] === "mis-banqueos" &&
    pathSegments.length >= 3 &&
    pathSegments[1] !== "crear";
  const title = getNavbarTitle(pathname);

  if (isFullScreenExam || isMisBanqueoScopedRoute) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="overflow-hidden">
        <Navbar title={title} user={user} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
