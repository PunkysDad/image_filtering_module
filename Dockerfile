# syntax=docker/dockerfile:1.6

# ---------------------------------------------------------------------------
# Stage 1: deps — install node_modules
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# The runner image (mcr.microsoft.com/playwright:v1.44.0-jammy) already ships
# with Chromium at /ms-playwright, so we don't need Playwright to download it
# during npm install.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# Stage 2: builder — build the Next.js app
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: runner — lean production image with Chromium pre-installed
# ---------------------------------------------------------------------------
FROM mcr.microsoft.com/playwright:v1.47.0-jammy AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Runtime-writable dirs for uploads + exports.
RUN mkdir -p /app/uploads /app/exports

# Next.js standalone output includes server.js and the minimal node_modules
# it traced. Copy it first, then overlay the full node_modules so runtime-
# required externals (sharp, playwright) are definitely present.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# The playwright base image ships a non-root `pwuser`. Run as that user.
RUN chown -R pwuser:pwuser /app
USER pwuser

EXPOSE 3000

CMD ["node", "server.js"]
