FROM node:25.2.1-alpine3.22 AS base
WORKDIR /app
COPY package.json package-lock.json* ./

FROM base AS development
RUN npm i
COPY . .
ENTRYPOINT [ "tail", "-f", "/dev/null" ]

FROM base AS production-build
# ============================================================================
# INTERIM: Prisma/Postgres "demo production" backend.
# Everything tagged `[INTERIM — Prisma]` below exists ONLY to ship the Prisma
# client into the image. When the media-library microservice replaces Postgres,
# delete every `[INTERIM — Prisma]` line and revert this stage's `npm ci` back
# to `--omit=dev` (the prisma CLI is only needed for `prisma generate`).
# ============================================================================
#
# [INTERIM — Prisma] Full install (not `--omit=dev`) so the prisma CLI — a
# devDependency — is present for `prisma generate` below. Revert to
# `npm ci --omit=dev` once Prisma is gone.
RUN npm ci
COPY . .
# [INTERIM — Prisma] Generate the client before building; schema is now present.
RUN npx prisma generate
RUN npm run build

FROM node:25.2.1-alpine3.22 AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
# Lean, production-only dependencies (includes @prisma/client, un-generated).
RUN npm ci --omit=dev
# Copy the build output (always needed).
COPY --from=production-build /app/.next ./.next
COPY --from=production-build /app/public ./public
# `next start` re-reads next.config at runtime (it does NOT use .next/required-server-files.json
# for live config unless output:"standalone"). Without this the image optimizer falls back to
# default config (empty remotePatterns) and rejects CDN URLs with `"url" parameter is not allowed`.
COPY --from=production-build /app/next.config.ts ./
# [INTERIM — Prisma] Schema + generated client. Remove both COPY lines below
# when the microservice replaces Postgres.
COPY --from=production-build /app/prisma ./prisma
COPY --from=production-build /app/node_modules/.prisma ./node_modules/.prisma

ENTRYPOINT ["npm", "start"]