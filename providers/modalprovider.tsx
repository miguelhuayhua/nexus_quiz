'use client';
import React, { ReactElement, createContext, useContext, useState } from 'react';
import { toast, Toaster } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2 } from 'lucide-react';
import { fetchAuth } from '@/helpers/fetchers';


interface ModalParams<T> {
    contenido?: ReactElement | string;
    content?: ReactElement | string;
    url: string;
    data?: unknown;
    titulo: string;
    method?: "POST" | "PUT" | "DELETE"
    messageType?: string;
    confirmButtonVariant?: string;
    showIcon?: boolean;
    customIcon?: ReactElement;
    ButtonText?: {
        yes: string;
        no: string;
    };
    hasBack?: boolean;
    callback?: (data: any) => void;
    headers?: HeadersInit;
    isPublic?: boolean;
}

interface ModalContextType {
    openModal: <T>(params: ModalParams<T>) => void;
}

type ModalResponse = {
    estado?: number;
    mensaje?: string;
    success?: boolean;
    message?: string;
    error?: string;
}

const buildRequestBody = (data: unknown): BodyInit | undefined => {
    if (data == null) return undefined;
    if (
        typeof data === 'string' ||
        data instanceof FormData ||
        data instanceof URLSearchParams ||
        data instanceof Blob
    ) {
        return data;
    }
    return JSON.stringify(data);
}

// Creamos el contexto
const ModalContext = createContext<ModalContextType>({
    openModal: () => { }
});


export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [action, setAction] = useState<{ params: ModalParams<unknown> }>({
        params: {
            contenido: <></>,
            url: '',
            data: {},
            titulo: '',
            method: "POST",
            ButtonText: { yes: 'Aceptar', no: 'Cancelar' },
            hasBack: false,
            callback: () => { },
        }
    });

    const openModal = <T,>(params: ModalParams<T>) => {
        setAction({
            params: {
                ...action.params,
                ...params,
            } as any
        });
        setOpen(true);
    };

    const handleConfirm = async () => {
        const { data, url, callback, headers, method, isPublic } = action.params;
        const body = buildRequestBody(data);
        const isFormData = body instanceof FormData;
        setIsLoading(true)
        const request = isPublic
            ? fetch(`/api/public/platform${url.startsWith('/') ? url : `/${url}`}`, {
                method,
                body,
                headers: {
                    ...(isFormData ? {} : { "Content-Type": "application/json" }),
                    ...headers
                },
            }).then(async (res) => {
                const payload = await res.json() as ModalResponse;
                if (!res.ok) {
                    throw new Error(payload.mensaje || 'Error al procesar la solicitud');
                }
                return payload;
            })
            : fetchAuth<ModalResponse>(url, {
                method,
                body,
                headers: {
                    ...headers
                },
            });

        request.then(data => {
            const success = data.success === true || data.estado === 200;
            const message = data.message || data.mensaje;

            if (success) {
                toast.success(message || "Operación completada correctamente");
                setOpen(false);
                callback?.(data)
            }
            else
                throw new Error(message || data.error || "Error al procesar la solicitud");

        }).catch((e) => {
            toast.error(e.message);
        }).finally(() => {
            setIsLoading(false);
        })

    }

    const modalContent = action.params.contenido ?? action.params.content;


    return (
        <ModalContext.Provider value={{ openModal }}>
            {children}
            {
                isLoading &&
                <div className={`fixed size-full z-100000 flex items-center justify-center inset-0 bg-background/70 backdrop-blur-sm transition-opacity duration-300 `} >
                    <Loader2 className='size-10 text-white animate-spin' />
                </div>
            }

            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <div className="flex items-center w-full  justify-center gap-3">

                            <AlertDialogTitle className="text-center ">
                                {action.params.titulo}
                            </AlertDialogTitle>
                        </div>

                        {
                            typeof modalContent == "string" ?
                                <AlertDialogDescription className={'w-full'}>
                                    {modalContent}
                                </AlertDialogDescription>
                                :
                                <div className={`space-y-2`}>
                                    {modalContent}
                                </div>
                        }
                    </AlertDialogHeader>

                    <AlertDialogFooter className="flex gap-3 ">
                        <AlertDialogCancel
                            disabled={isLoading}

                        >
                            {action.params.ButtonText?.no}
                        </AlertDialogCancel>

                        <AlertDialogAction
                            onClick={handleConfirm}
                        >
                            {action.params.ButtonText?.yes}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Toaster para notificaciones */}
            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: 'var(--popover)',
                        color: 'var(--popover-foreground)',
                        borderRadius: 0,
                        border: "1px solid var(--border)"

                    },
                }}
            />
        </ModalContext.Provider>
    );
};

// Hook para usar el modal
export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal debe ser usado dentro de un ModalProvider');
    }
    return context;
};
