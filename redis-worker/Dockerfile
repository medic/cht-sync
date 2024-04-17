FROM node:20-alpine AS base_build

WORKDIR /

COPY package*.json ./
RUN npm install --ignore-scripts

COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npm run build

CMD ["node", "dist/index.js"]
