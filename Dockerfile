FROM node:slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm fetch

COPY . .
RUN pnpm install --offline && pnpm run build

FROM base AS runner

ENV NODE_ENV=production

RUN mkdir -p /app && addgroup --system nodejs && adduser --system nodejs --ingroup nodejs
WORKDIR /app

COPY --chown=nodejs:nodejs --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --chown=nodejs:nodejs --from=builder /app/next.config.ts ./
COPY --chown=nodejs:nodejs --from=builder /app/public ./public
COPY --chown=nodejs:nodejs --from=builder /app/build ./build
COPY --chown=nodejs:nodejs --from=builder /app/.next ./.next

COPY --chown=nodejs:nodejs --from=builder /app/node_modules ./node_modules

USER nodejs

EXPOSE 3000
CMD ["node", "build/server.js"]
