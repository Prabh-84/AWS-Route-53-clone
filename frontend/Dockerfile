# --- deps: install node_modules (cached until package files change) ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: compile the Next.js app (standalone output) ---
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- run: minimal runtime image ---
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    BACKEND_URL=http://localhost:8000

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# BACKEND_URL is read at runtime by src/proxy.ts (it forwards /api/* to the backend),
# so the same image works in any environment: docker run -e BACKEND_URL=http://api:8000 ...
EXPOSE 3000
USER node
CMD ["node", "server.js"]
