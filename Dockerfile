FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev \
  && npx prisma generate

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma/
RUN npm install
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/main"]
