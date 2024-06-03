FROM node:20-alpine AS base_build

WORKDIR /

COPY package.json package-lock.json ./
COPY node_modules ./node_modules
COPY ./src ./src

CMD ["node", "src/index.js"]
