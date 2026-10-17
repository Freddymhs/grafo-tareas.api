FROM node:22-alpine AS base
# pnpm sale de `packageManager` (package.json): la misma versión que el CI y el desarrollo, nunca `latest`.
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile
RUN pnpm prisma generate

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS production
ENV NODE_ENV=production
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
# Regla global §9: el proceso nunca corre como root dentro del contenedor (`node` viene en la imagen oficial).
USER node

EXPOSE 3000
# Las migraciones pendientes se aplican al arrancar: desplegar una versión nueva no pide un paso a mano.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
