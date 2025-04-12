FROM node:18-alpine

# PocketBase version
ARG PB_VERSION=0.22.3

# Install required packages
RUN apk add --no-cache \
    unzip \
    ca-certificates \
    supervisor

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Download and setup PocketBase
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip -d /pb/ \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x /pb/pocketbase \
    && mkdir -p /pb/pb_data

# Create directory for supervisord config and logs
RUN mkdir -p /etc/supervisor/conf.d /var/log/supervisor

# Copy supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports
EXPOSE 8080 8090

# Start supervisord with proper logging
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"] 