FROM node:alpine
WORKDIR /app
COPY package.json ./
RUN npm install && npm audit fix
COPY index.js .
COPY issueBodies issueBodies
USER node
CMD npm start
