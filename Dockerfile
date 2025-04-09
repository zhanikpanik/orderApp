FROM alpine:latest

WORKDIR /pb

# Download the latest version of PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v0.21.1/pocketbase_0.21.1_linux_amd64.zip /pb/

# Install unzip
RUN apk add --no-cache unzip

# Unzip and setup
RUN unzip pocketbase_0.21.1_linux_amd64.zip && \
    rm pocketbase_0.21.1_linux_amd64.zip && \
    chmod +x /pb/pocketbase

EXPOSE 8090

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"] 