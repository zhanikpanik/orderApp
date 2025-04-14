FROM node:18-alpine

# Install required packages
RUN apk add --no-cache \
    unzip \
    ca-certificates \
    supervisor

# Set up app directory
WORKDIR /app
COPY package*.json ./
RUN npm install

# Copy app files
COPY . .

# Download and install PocketBase
ARG PB_VERSION=0.22.3
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && \
    rm /tmp/pb.zip && \
    chmod +x /pb/pocketbase

# Copy PocketBase config
COPY pb_config.json /pb/pb_config.json

# Copy supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports
EXPOSE 3000 8090

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"] 