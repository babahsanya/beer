# ──────────────────────────────────────────────────────────────────────
# BeerID — multi-stage Dockerfile
# ──────────────────────────────────────────────────────────────────────

FROM oven/bun:1.3 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile

FROM oven/bun:1.3 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate
RUN bun run build

FROM oven/bun:1.3-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
CMD ["bun", "server.js"]
