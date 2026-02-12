# Etapa de construcción
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci

# Copiar todo
COPY . .

# Variable de entorno para build (ARG se pasa desde GitHub Actions)
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Generar Prisma Client
RUN npx prisma generate

# Build de Next.js
RUN npm run build

# ---- Producción ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002

# Copiar solo lo necesario para producción
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Usar usuario 'node' para seguridad
USER node

EXPOSE 3002

CMD ["node", "server.js"]
