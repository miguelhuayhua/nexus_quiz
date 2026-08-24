import { LayoutGrid, User } from "lucide-react";

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
import Link from "next/link";

interface NavUserProps {
  email?: string | null;
  image?: string | null;
  mainProjectUrl: string;
  name?: string | null;
  plan?: "FREE" | "PRO";
  triggerClassName?: string;
  avatarClassName?: string;
}

export function NavUser({
  email,
  image,
  mainProjectUrl,
  name,
  plan = "FREE",
  triggerClassName,
  avatarClassName,
}: NavUserProps) {
  const initial = name?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <Menu>
      <MenuTrigger className={triggerClassName ?? "cursor-pointer"}>
        <Avatar className={`${plan == "PRO" ? "border-amber-400 border-3" : ""}`}>
          <AvatarImage alt={name ?? "Usuario"} src={image ?? ""} />
          <AvatarFallback >{initial}</AvatarFallback>
        </Avatar>
      </MenuTrigger>

      <MenuPopup className="w-64">
        <MenuItem >
          <p >{name ?? "Usuario"}</p>


        </MenuItem>
        <MenuSeparator />

        <MenuGroup>
          <MenuGroupLabel>Navegación</MenuGroupLabel>
          <MenuItem
            render={<Link target="_blank" href={`${mainProjectUrl}/dashboard/panel`} />}
          >
            <LayoutGrid />
            Dashboard
          </MenuItem>
          <MenuItem
            render={<Link target="_blank" href={`${mainProjectUrl}/dashboard/configuracion/perfil`} />}
          >
            <User />
            Perfil y registro
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}
