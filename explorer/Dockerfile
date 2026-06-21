FROM node:20-alpine AS base

# ---- 依赖安装阶段 ----
FROM base AS deps
WORKDIR /app

# 复制 monorepo 根配置和依赖声明
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY explorer/package.json ./explorer/
COPY packages/media-info/package.json ./packages/media-info/

RUN corepack enable && yarn install --immutable

# ---- 构建阶段 ----
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/explorer/node_modules ./explorer/node_modules
COPY . .

RUN corepack enable && yarn workspace explorer build

# ---- 运行阶段 ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache mediainfo

RUN addgroup --system --gid 100 nodejs
RUN adduser --system --uid 1000 nextjs

# standalone 产物
COPY --from=builder /app/explorer/.next/standalone ./
# 静态资源
COPY --from=builder /app/explorer/.next/static ./explorer/.next/static
COPY --from=builder /app/explorer/public ./explorer/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "explorer/server.js"]
