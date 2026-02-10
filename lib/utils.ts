import { clsx, type ClassValue } from "clsx"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const formatDate = (date: Date | null | undefined) => {
  if (!date) return "Sin especificar"
  return format(date, "dd/MMM/yyyy", { locale: es })
}

export const formatHour = (date: Date | null | undefined) => {
  if (!date) return "Sin especificar"
  return format(date, "HH:mm", { locale: es })
}

export const formatDateTime = (date: Date | null | undefined) => {
  if (!date) return "No especificado"
  return format(date, "dd/MMM/yyyy - HH:mm", { locale: es })
}

export const whatsapp = "https://wa.link/qpuq92"



export function capitalizeWords(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
