import { CircleIcon, LayoutGrid, SparklesIcon, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  const PlanIcon = plan === "PRO" ? SparklesIcon : CircleIcon;
  const planLabel = plan === "PRO" ? "PRO" : "BASIC";

  return (
    <Menu>
      <MenuTrigger className={triggerClassName ?? "cursor-pointer"}>
        <Avatar className={avatarClassName}>
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
            <div className="pt-1">
              <Badge className="gap-1" variant={plan === "PRO" ? "default" : "outline"}>
                <PlanIcon className="size-3" />
                {planLabel}
              </Badge>
            </div>
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
      </MenuPopup>
    </Menu>
  );
}
