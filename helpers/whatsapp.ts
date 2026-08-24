/**
 * Helper para abrir WhatsApp con un mensaje predefinido.
 * Usa el número oficial de Nexus Educa: +51 927 187 316
 */

const NEXUS_WHATSAPP_NUMBER = "51927187316";
const NEXUS_WHATSAPP_BASE = `https://wa.me/${NEXUS_WHATSAPP_NUMBER}`;

export interface SendWhatsappOptions {
    /** Mensaje libre personalizado. Si se omite se usa el mensaje por defecto. */
    mensaje?: string;
    /** Nombre del curso (genera mensaje automático de interés). */
    curso?: string;
    /** Código de compra (genera mensaje automático de soporte de compra). */
    codigoCompra?: string;
    /** Si es true, abre en una pestaña nueva (default: true). */
    nuevaPestana?: boolean;
}

/**
 * Genera la URL de WhatsApp con el mensaje codificado.
 * Se puede usar tanto en cliente (window.open) como en SSR (href de un Link).
 */
export function getWhatsappUrl(opciones: SendWhatsappOptions = {}): string {
    const { mensaje, curso, codigoCompra } = opciones;

    let texto: string;

    if (mensaje) {
        texto = mensaje;
    } else if (codigoCompra && curso) {
        texto = `Hola, necesito ayuda con mi compra del curso "${curso}". Código de compra: ${codigoCompra}`;
    } else if (codigoCompra) {
        texto = `Hola, necesito ayuda con mi compra. Código: ${codigoCompra}`;
    } else if (curso) {
        texto = `Hola, me interesa el curso "${curso}". ¿Me pueden dar más información?`;
    } else {
        texto = `Hola, me gustaría obtener más información sobre Nexus Educa.`;
    }

    return `${NEXUS_WHATSAPP_BASE}?text=${encodeURIComponent(texto)}`;
}

/**
 * Abre WhatsApp directamente desde el navegador.
 * Solo usar en componentes cliente.
 */
export function sendWhatsapp(mensaje: string): string {
    return `${NEXUS_WHATSAPP_BASE}?text=${encodeURIComponent(mensaje)}`


}
