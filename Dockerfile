FROM node:18-alpine

# Установка PocketBase
ARG PB_VERSION=0.22.3
RUN apk add --no-cache unzip ca-certificates wget \
    && wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip -d /pb/ \
    && rm pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x /pb/pocketbase

# Настройка Node.js приложения
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Создаем скрипт запуска
RUN echo '#!/bin/sh\n\
/pb/pocketbase serve --http=127.0.0.1:8090 & \
sleep 5 && \
node bot.js' > /app/start.sh && \
chmod +x /app/start.sh

EXPOSE 8080 8090

CMD ["/app/start.sh"] 