FROM alpine:latest

# Create a non-root user
RUN addgroup -S pocketbase && adduser -S pocketbase -G pocketbase

# Create and set working directory
WORKDIR /pb

# Create data directory with proper permissions
RUN mkdir -p /pb/pb_data && \
    chown -R pocketbase:pocketbase /pb

# Download PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v0.21.1/pocketbase_0.21.1_linux_amd64.zip /pb/

# Install required packages
RUN apk add --no-cache unzip ca-certificates

# Unzip and setup
RUN unzip pocketbase_0.21.1_linux_amd64.zip && \
    rm pocketbase_0.21.1_linux_amd64.zip && \
    chmod +x /pb/pocketbase && \
    chown -R pocketbase:pocketbase /pb

# Switch to non-root user
USER pocketbase

EXPOSE 8090

# Start PocketBase with verbose logging
CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090", "--debug"] 