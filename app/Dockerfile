FROM node:25.2.1-alpine3.22 AS base
WORKDIR /app
COPY package.json package-lock.json* ./

FROM base AS development
RUN npm i
COPY . .
ENTRYPOINT [ "tail", "-f", "/dev/null" ]

FROM base AS production-build
RUN npm ci --omit=dev
COPY . .
RUN npm run build

FROM node:25.2.1-alpine3.22 AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
# Copy only necessary files
COPY --from=production-build /app/package.json ./
COPY --from=production-build /app/node_modules ./node_modules
COPY --from=production-build /app/.next ./.next
COPY --from=production-build /app/public ./public

ENTRYPOINT ["npm", "start"]