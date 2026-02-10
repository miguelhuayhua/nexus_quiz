import { LayoutGrid, LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";

interface NavUserProps {
  email?: string | null;
  image?: string | null;
  isRegistered?: boolean;
  mainProjectUrl: string;
  name?: string | null;
}

export function NavUser({
  email,
  image,
  isRegistered,
  mainProjectUrl,
  name,
}: NavUserProps) {
  const initial = name?.charAt(0)?.toUpperCase() ?? "U";
  const normalizedMainProjectUrl = mainProjectUrl.endsWith("/")
    ? mainProjectUrl.slice(0, -1)
    : mainProjectUrl;

  return (
    <Menu>
      <MenuTrigger className="cursor-pointer">
        <Avatar>
          <AvatarImage alt={name ?? "Usuario"} src={image ?? ""} />
          <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
        </Avatar>
      </MenuTrigger>

      <MenuPopup className="w-64">
        <MenuItem className="cursor-pointer font-normal">
          <div className="flex w-full flex-col gap-1">
            <p className="truncate font-medium text-sm">{name ?? "Usuario"}</p>
            <p className="truncate text-muted-foreground text-xs">
              {email ?? "Sin correo"}
            </p>
            <p className="text-muted-foreground text-xs">
              {isRegistered ? "Perfil registrado" : "Perfil no registrado"}
            </p>
          </div>
        </MenuItem>
        <MenuSeparator />

        <MenuGroup>
          <MenuGroupLabel>Navegación</MenuGroupLabel>
          <MenuItem
            className="cursor-pointer"
            render={<a href={`${mainProjectUrl}/dashboard/panel`} />}
          >
            <LayoutGrid />
            Dashboard
          </MenuItem>
          <MenuItem
            className="cursor-pointer"
            render={<a href={`${mainProjectUrl}/dashboard/configuracion/perfil`} />}
          >
            <User />
            Perfil y registro
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuItem
          className="cursor-pointer"
          onClick={() =>
            signOut({
              callbackUrl: `${normalizedMainProjectUrl}/login`,
              redirect: true,
            })
          }
          variant="destructive"
        >
          <LogOut />
          Cerrar sesión
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}
