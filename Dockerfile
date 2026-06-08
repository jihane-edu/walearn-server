FROM ghcr.io/puppeteer/puppeteer:21.5.0

USER root

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8080

CMD [ "node", "server.js" ]
