FROM node:20-alpine AS base_build

RUN addgroup -S nonroot \
    && adduser -S nonroot -G nonroot

WORKDIR /

COPY package*.json ./
RUN npm install --ignore-scripts

COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npm run build

USER nonroot
CMD ["node", "dist/index.js"]
