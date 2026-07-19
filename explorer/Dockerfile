FROM node:22-alpine AS base

# ---- 依赖安装阶段 ----
FROM base AS deps
WORKDIR /app

# 复制 monorepo 根配置和依赖声明
COPY package.json yarn.lock .yarnrc.yml ./
COPY explorer/package.json ./explorer/
COPY packages/media-info/package.json ./packages/media-info/

RUN corepack enable && corepack install && yarn install --immutable

# ---- 构建阶段 ----
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable && corepack install && yarn workspace explorer build

# ---- 运行阶段 ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache mediainfo

# standalone 产物
COPY --from=builder /app/explorer/.next/standalone ./
# 静态资源
COPY --from=builder /app/explorer/.next/static ./explorer/.next/static
COPY --from=builder /app/explorer/public ./explorer/public

# 持久化数据目录（config + cache）
# 通过环境变量指定数据根目录，Docker 中挂载 volume 到该路径
ENV NEXT_PUBLIC_DATA_DIR=/app/data
RUN mkdir -p /app/data/config /app/data/cache/tmdb
# 创建默认 TMDB 配置文件（如果 volume 未挂载则使用默认值）
RUN echo '{"language": "zh-CN","baseUrl": "https://api.themoviedb.org/3"}' > /app/data/config/tmdb.json
RUN chown -R node:node /app/data
VOLUME ["/app/data"]

USER node

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "explorer/server.js"]
