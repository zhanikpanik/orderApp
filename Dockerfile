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
    && mkdir -p /pb/pb_data \
    && chown -R node:node /pb/pb_data

# Set up Node.js app
WORKDIR /app

# Copy package files and install dependencies as root
COPY package*.json ./
RUN npm install --only=production \
    && chown -R node:node /app

# Switch to node user and copy the rest of the files
USER node
COPY --chown=node:node . .

# Create start script
RUN echo '#!/bin/sh\n\
set -x\n\
echo "Starting PocketBase..."\n\
/pb/pocketbase serve --http=0.0.0.0:8090 & \
PB_PID=$!\n\
\n\
echo "PocketBase process started with PID: $PB_PID"\n\
echo "Checking if process is running..."\n\
ps aux | grep pocketbase\n\
\n\
echo "Waiting for PocketBase to be ready..."\n\
timeout=30\n\
while [ $timeout -gt 0 ]; do\n\
    echo "Attempting health check (attempts remaining: $timeout)..."\n\
    curl -v http://127.0.0.1:8090/api/health || true\n\
    if curl -s http://127.0.0.1:8090/api/health > /dev/null; then\n\
        echo "PocketBase is ready!"\n\
        break\n\
    fi\n\
    echo "Health check failed, waiting..."\n\
    sleep 1\n\
    timeout=$((timeout-1))\n\
    # Check if PocketBase is still running\n\
    if ! kill -0 $PB_PID 2>/dev/null; then\n\
        echo "ERROR: PocketBase process died!"\n\
        exit 1\n\
    fi\n\
done\n\
\n\
if [ $timeout -eq 0 ]; then\n\
    echo "Timeout waiting for PocketBase"\n\
    echo "Last few lines of PocketBase log:"\n\
    tail -n 20 /pb/pb_data/logs/*.log || true\n\
    exit 1\n\
fi\n\
\n\
echo "Starting bot..."\n\
node bot.js & \n\
BOT_PID=$!\n\
\n\
# Monitor both processes\n\
while true; do\n\
    if ! kill -0 $PB_PID 2>/dev/null; then\n\
        echo "PocketBase process died!"\n\
        exit 1\n\
    fi\n\
    if ! kill -0 $BOT_PID 2>/dev/null; then\n\
        echo "Bot process died!"\n\
        exit 1\n\
    fi\n\
    sleep 5\n\
done' > /app/start.sh && \
chmod +x /app/start.sh

EXPOSE 8080 8090

CMD ["/app/start.sh"] 