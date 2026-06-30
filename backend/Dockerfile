FROM node:24-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p uploads

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "server.js"]
