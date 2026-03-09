FROM node:20-bookworm-slim

ENV NODE_ENV=development
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080

CMD ["sh", "-c", "node scripts/create-topics.js && node scripts/migrate.js && node scripts/seed.js && node src/server.js"]
