FROM node:18-alpine

# Install required packages
RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget \
    curl

# Download and install PocketBase
ARG PB_VERSION=0.22.3
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip -d /pb/ \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x /pb/pocketbase \
    && mkdir -p /pb/pb_data

# Set up Node.js app
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .

# Create start script
RUN echo '#!/bin/sh\n\
echo "Starting PocketBase..."\n\
/pb/pocketbase serve --http=0.0.0.0:8090 & \
PB_PID=$!\n\
\n\
echo "Waiting for PocketBase to be ready..."\n\
timeout=30\n\
while [ $timeout -gt 0 ]; do\n\
    if curl -s http://127.0.0.1:8090/api/health > /dev/null; then\n\
        echo "PocketBase is ready!"\n\
        break\n\
    fi\n\
    sleep 1\n\
    timeout=$((timeout-1))\n\
done\n\
\n\
if [ $timeout -eq 0 ]; then\n\
    echo "Timeout waiting for PocketBase"\n\
    exit 1\n\
fi\n\
\n\
echo "Starting bot..."\n\
export POCKETBASE_URL="http://127.0.0.1:8090"\n\
node bot.js & \n\
BOT_PID=$!\n\
\n\
# Wait for any process to exit\n\
wait -n\n\
\n\
# Exit with status of process that exited first\n\
exit $?' > /app/start.sh && \
chmod +x /app/start.sh

EXPOSE 8080 8090

CMD ["/app/start.sh"] 