# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY backend/package*.json ./backend/

RUN npm ci --workspace=backend

COPY backend/ ./backend/

RUN npx prisma generate --schema=./backend/prisma/schema.prisma
RUN npm run build -w backend

# --- Production Stage ---
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY backend/package*.json ./backend/

RUN npm ci --omit=dev --workspace=backend

COPY --from=builder /usr/src/app/backend/dist ./backend/dist
COPY --from=builder /usr/src/app/backend/prisma ./backend/prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production

CMD ["node", "backend/dist/main.js"]
