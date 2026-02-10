import { getToken } from "next-auth/jwt";
import { NextRequestWithAuth, withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    async function proxy(request: NextRequestWithAuth) {
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            const mainProjectUrl = process.env.MAIN_PROJECT_URL ?? "https://nexus.posgrado.cicap.test";
            return NextResponse.redirect(new URL("/login", mainProjectUrl));
        }

        return NextResponse.next();
    }
)
export const config = {
    matcher: [
        "/market/:path*",
        "/evaluaciones/:path*",
        "/repaso/:path*",
        "/prueba/:path*",
    ]
}
