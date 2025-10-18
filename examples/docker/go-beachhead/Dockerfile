FROM golang:1.22-alpine AS build
WORKDIR /src
COPY examples/docker/go-beachhead/go.mod examples/docker/go-beachhead/go.sum ./
RUN go mod download
COPY examples/docker/go-beachhead/ ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /out/beachhead ./cmd/beachhead

FROM gcr.io/distroless/static:nonroot
COPY --from=build /out/beachhead /beachhead
EXPOSE 30018
ENV PORT=30018
ENV DISCOVERY_TARGET=host.docker.internal:53530
USER nonroot:nonroot
ENTRYPOINT ["/beachhead"]

