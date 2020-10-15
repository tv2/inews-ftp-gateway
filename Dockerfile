FROM node:12-alpine3.9
RUN apk add --no-cache tzdata
COPY . /opt/sofie-inews-gateway
WORKDIR /opt/sofie-inews-gateway
CMD ["yarn", "start"]