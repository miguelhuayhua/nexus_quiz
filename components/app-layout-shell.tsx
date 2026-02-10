"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheckIcon,
  ClipboardListIcon,
  HistoryIcon,
  HouseIcon,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";

import { Navbar } from "@/components/auth/navbar";
import { Button } from "@/components/ui/button";
import { Group, GroupSeparator } from "@/components/ui/group";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
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
};

const socialLinks = {
  facebook: "https://www.facebook.com/NexusEduca",
  instagram: "https://www.instagram.com/jennifferllamoca/",
  tiktok: "https://www.tiktok.com/@actualizatepe?_r=1&_t=ZS-93Bp7DRVtqy",
  youtube: "https://www.youtube.com/@NexusEduca-pgd",
};

function getNavbarTitle(pathname: string): string {
  if (pathname === "/") return "Inicio";

  if (pathname.startsWith("/market")) {
    return pathname === "/market" ? "Banco de preguntas" : "Detalle de evaluación";
  }

  if (pathname.startsWith("/evaluaciones")) {
    return pathname === "/evaluaciones" ? "Evaluaciones" : "Detalle de evaluación";
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

function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
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

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Opciones</SidebarGroupLabel>
          <SidebarMenu className="mx-auto pl-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                className={getMenuButtonClassName(isActivePath("/market"))}
                isActive={isActivePath("/market")}
                render={<Link href="/market" />}
              >
                <HouseIcon />
                <span>Banco de preguntas</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={getMenuButtonClassName(isActivePath("/evaluaciones"))}
                isActive={isActivePath("/evaluaciones")}
                render={<Link href="/evaluaciones" />}
              >
                <ClipboardListIcon />
                <span>Evaluaciones</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={getMenuButtonClassName(isActivePath("/repaso"))}
                isActive={isActivePath("/repaso")}
                render={<Link href="/repaso" />}
              >
                <BookOpenCheckIcon />
                <span>Área de repaso</span>
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
  const title = getNavbarTitle(pathname);

  if (isFullScreenExam) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <Navbar title={title} user={user} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
