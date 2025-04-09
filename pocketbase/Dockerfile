FROM alpine:latest

ARG PB_VERSION=0.22.3

RUN apk add --no-cache \
    unzip \
    ca-certificates

# download and unzip PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && \
    rm /tmp/pb.zip && \
    chmod +x /pb/pocketbase

EXPOSE 8090

# Set default command that can be overridden
ENV START_COMMAND="/pb/pocketbase serve --http=0.0.0.0:8090"

# Use shell form to allow environment variable expansion
CMD $START_COMMAND 