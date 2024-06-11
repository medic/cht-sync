FROM node:20-alpine AS base_build

WORKDIR /

COPY package.json package-lock.json ./
COPY ./src ./src
RUN npm ci --ignore-scripts

CMD ["node", "src/index.js"]
