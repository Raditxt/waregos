# Build dari root repo:  docker build -f apps/api/Dockerfile -t waregos-api .

# ---------------------------------------------------------------
# Stage 1: deps-prod — production deps saja, plus generate Prisma
# ---------------------------------------------------------------
FROM node:22-bookworm-slim AS deps-prod
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
RUN npm ci --omit=dev \
      --workspace=@waregos/api \
      --workspace=@waregos/database \
      --workspace=@waregos/types \
      --workspace=@waregos/utils \
      --include-workspace-root
# Folder ini mungkin kosong (semua dep ke-hoist ke root). Bikin dulu
# supaya COPY di stage runtime nggak gagal kalau npm nggak membuatnya.
RUN mkdir -p apps/api/node_modules

COPY packages/database/prisma packages/database/prisma
RUN npx prisma generate --schema packages/database/prisma/schema.prisma

# ---------------------------------------------------------------
# Stage 2: build — full deps untuk compile
# ---------------------------------------------------------------
FROM node:22-bookworm-slim AS build
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
RUN npm ci \
      --workspace=@waregos/api \
      --workspace=@waregos/database \
      --workspace=@waregos/types \
      --workspace=@waregos/utils \
      --include-workspace-root

# Prisma Client di-copy dari deps-prod, jangan generate ulang
COPY --from=deps-prod /repo/node_modules/.prisma /repo/node_modules/.prisma
COPY --from=deps-prod /repo/node_modules/@prisma/client /repo/node_modules/@prisma/client

COPY packages packages
COPY apps/api apps/api
RUN npm run build --workspace=@waregos/api
RUN mkdir -p apps/api/node_modules

# ---------------------------------------------------------------
# Stage 3: runtime — prod deps + dist
# ---------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps-prod /repo/node_modules ./node_modules
COPY --from=deps-prod /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/packages/database ./packages/database

WORKDIR /app/apps/api

# Uji asap: kalau ada prod dep yang nggak ke-copy, build gagal di sini
RUN node -e "const deps = Object.keys(require('./package.json').dependencies).filter(n => !n.startsWith('@waregos/')); for (const n of deps) require(n); console.log('OK:', deps.length, 'prod dependensi bisa di-resolve')"

USER node
EXPOSE 3001
CMD ["node", "--enable-source-maps", "dist/index.js"]