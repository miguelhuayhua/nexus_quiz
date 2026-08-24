import { getToken } from "next-auth/jwt"
import { NextRequest } from "next/server"
const secret = process.env.NEXTAUTH_SECRET
export const checkAuth = async (req: NextRequest): Promise<string | undefined> => {
    const token = await getToken({ req, secret })
    if (!token) {
        return undefined
    }
    return token.email || ""
}   