FROM alpine:latest

ARG PB_VERSION=0.22.3

RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget

RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip -d /pb/ \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x /pb/pocketbase

# Create directory for PocketBase data
RUN mkdir -p /pb/pb_data

EXPOSE 8090

# Start PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]