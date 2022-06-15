FROM node:16-alpine3.16
RUN apk add --no-cache tzdata git
COPY . /opt/sofie-inews-gateway
WORKDIR /opt/sofie-inews-gateway
RUN yarn install --production
CMD ["yarn", "start"]
