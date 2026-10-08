# Stage 1: Build frontend
FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /src/frontend

RUN npm install -g pnpm

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

# Stage 2: Build backend with embedded frontend
FROM golang:1.24-bookworm AS backend-builder

WORKDIR /src/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
# Embed built frontend assets into the Go binary
COPY --from=frontend-builder /src/frontend/build/ ./www/
RUN CGO_ENABLED=0 go build -tags server,production -ldflags="-s -w" -o /app/plexflip .

# Stage 3: Runner stage
FROM debian:bookworm-slim AS runner

WORKDIR /app

RUN apt-get update -y && apt-get install -y ca-certificates curl tzdata && rm -rf /var/lib/apt/lists/*

# Standalone Go binary with embedded frontend
COPY --from=backend-builder /app/plexflip /app/plexflip

EXPOSE 3000
EXPOSE 44201/udp
VOLUME /app/data

CMD ["/app/plexflip"]
