# Etapa de construcción
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable
# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Instalar dependencias
RUN pnpm install --frozen-lockfile --ignore-scripts
# Copiar todo
COPY . .

# Variable de entorno para build (ARG se pasa desde GitHub Actions)
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Generar Prisma Client
RUN pnpm prisma generate

# Build de Next.js
RUN pnpm build

# ---- Producción ----
FROM node:22-alpine AS runner 

WORKDIR /app

RUN corepack enable

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002

# Copiar solo lo necesario para producción
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Permitir escritura de caché
RUN mkdir -p /app/.next/cache && chown -R node:node /app
# Usar usuario 'node' para seguridad  
USER node

EXPOSE 3002

CMD ["node", "server.js"]
