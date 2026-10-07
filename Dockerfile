# Build backend
FROM golang:1.24-bookworm as backend-builder

WORKDIR /src/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /app/nevu .

# Final runner stage
FROM debian:bookworm-slim as runner

WORKDIR /app

RUN apt-get update -y && apt-get install -y ca-certificates curl tzdata && rm -rf /var/lib/apt/lists/*

COPY --from=backend-builder /app/nevu /app/nevu

EXPOSE 3000
EXPOSE 44201/udp
VOLUME /app/data

COPY frontend/build/ /app/www/

CMD ["/app/nevu"]
