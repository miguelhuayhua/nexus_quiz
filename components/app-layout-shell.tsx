"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Diamond,
  TableProperties,
  Square,
  CircleCheck,
  Rows3,
  Rss,
  Folder,
  GalleryHorizontalEnd,
  Circle,
  Settings,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
import Image from "next/image";
import { NavUser } from "@/components/auth/nav-user";
import { Navbar } from "@/components/auth/navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { NEXUS_HOST } from "@/helpers/globals";
import { Toaster } from "sonner";

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

  return "";
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

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <Image src={'/logo_icon.png'} alt="Logo"
        className="mx-auto"
        width={50} height={50} />
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="mx-auto pl-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                className={getMenuButtonClassName(isActivePath("/inicio"))}
                isActive={isActivePath("/inicio")}
                render={<Link href="/inicio" />}
              >
                <Circle />
                <span>Inicio</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={getMenuButtonClassName(isActivePath("/banqueos"))}
                isActive={isActivePath("/banqueos")}
                render={<Link href="/banqueos" />}
              >
                <Rows3 />
                <span>Banqueo Nexus</span>
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
                <Square />
                <span>
                  Generador de bancos

                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={getMenuButtonClassName(isActivePath("/repaso"))}
                isActive={isActivePath("/repaso")}
                render={<Link href="/repaso" />}
              >
                <CircleCheck />
                <span>Repaso Preguntas</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={getMenuButtonClassName(isActivePath("/flashcards"))}
                isActive={isActivePath("/flashcards")}
                render={<Link href="/flashcards" />}
              >
                <Diamond />
                <span>Flashcards</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={getMenuButtonClassName(isActivePath("/simulacros"))}
                isActive={isActivePath("/simulacros")}
                render={<Link href="/simulacros" />}
              >
                <Rss />
                <span>Simulacros Nexus</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={getMenuButtonClassName(isActivePath("/material"))}
                isActive={isActivePath("/material")}
                render={<Link href="/material" />}
              >
                <Folder />
                <span>Material</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={getMenuButtonClassName(isActivePath("/historial"))}
                isActive={isActivePath("/historial")}
                render={<Link href="/historial" />}
              >
                <GalleryHorizontalEnd />
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
                <Avatar className={`${userPlan == "PRO" ? "border-yellow-500" : ""} border-2`} >
                  <AvatarImage alt={userName} src={user?.image ?? ""} />
                  <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
                <p className="truncate text-xs">{userName}</p>
                <Button render={<Link
                  target="_blank"
                  href={`${NEXUS_HOST}/dashboard/configuracion/perfil`} />} size={"icon-sm"} variant={"ghost"}>
                  <Settings />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center pl-2">
              <NavUser
                email={userEmail}
                image={user?.image}
                mainProjectUrl={
                  process.env.NEXT_PUBLIC_MAIN_PROJECT_URL ?? "https://nexus.posgrado.cicap.tech"
                }
                name={userName}
                plan={userPlan}
                triggerClassName="mx-auto inline-flex cursor-pointer items-center justify-center rounded-full border bg-background/70 p-1"
                avatarClassName="size-8"
              />
            </div>
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
  const isFullScreenExam = /^\/prueba\/[^/]+(?:\/(?:resultado|solucionario|estadisticas))?$/.test(pathname);
  const pathSegments = pathname.split("/").filter(Boolean);
  const isMisBanqueoScopedRoute =
    pathSegments[0] === "mis-banqueos" &&
    pathSegments.length >= 3 &&
    pathSegments[1] !== "crear";
  const isFlashcardsScopedRoute = pathname === "/flashcards/prueba"
  const title = getNavbarTitle(pathname);

  if (isFullScreenExam || isMisBanqueoScopedRoute || isFlashcardsScopedRoute) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="overflow-hidden">
        <Navbar title={title} user={user} />
        <div className="p-4">
          {children}
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
