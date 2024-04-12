FROM node:16-alpine

WORKDIR /

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "index.js"]
