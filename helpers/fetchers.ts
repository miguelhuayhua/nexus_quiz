

export async function fetchAuth<T>(path: string, options: RequestInit = {}): Promise<T> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const apiPath = normalizedPath.startsWith("/api/")
        ? normalizedPath
        : `/api${normalizedPath}`;
    const isFormData = options.body instanceof FormData
    const res = await fetch(apiPath, {
        ...options,
        headers: {
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
            ...options.headers,
        },
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || data.mensaje || "Error al procesar la solicitud");
    }
    const response = res.headers.get("Content-Type");
    if (response !== "octet/stream") {
        const data: T = await res.json();
        return data;
    }
    return await res.blob() as T;
}


export const fetchResource = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.includes("http")) return url;

    const resourceServer = process.env.NEXT_PUBLIC_MINIO_HOST?.replace(/\/$/, '');
    if (!resourceServer) return url;
    return `${resourceServer}/nexus/${url}`;
}


export const fetchImage = (url: string | null | undefined) => {
    if (!url) return '';

    const resourceServer = process.env.NEXT_PUBLIC_RESOURCE_SERVER?.replace(/\/$/, '');
    if (!resourceServer) return url;
    return `${resourceServer}${url.startsWith('/') ? "" : '/nexus/'}${url}`;
}

export const fetcher = async<T>(url: string, searchParams?: URLSearchParams): Promise<T> => {
    if (searchParams) {
        return fetch(`/api/${url}?${searchParams.toString()}`).then(res => res.json())
    } else {
        return fetch(`/api/${url}`).then(res => res.json())
    }
}


