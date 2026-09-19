FROM node:20-slim AS base
WORKDIR /app

# OpenSSL is required by Prisma's query engine on Debian slim images.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# A placeholder DATABASE_URL so `prisma generate` and `next build` succeed at
# image-build time even though no real .env is present yet. The actual value
# from docker-compose's env_file takes over at container start.
ENV DATABASE_URL="file:./dev.db"
ENV AUTH_SECRET="build-time-placeholder"

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
