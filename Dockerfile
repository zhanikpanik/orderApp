FROM node:18-alpine

# Install required packages
RUN apk add --no-cache \
    postgresql-client \
    unzip \
    ca-certificates \
    supervisor

# Set up app directory
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Download and install PocketBase
ARG PB_VERSION=0.22.3
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip -d /pb/ \
    && chmod +x /pb/pocketbase \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip

# Copy supervisord configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports
EXPOSE 3000 8090

# Start supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"] 