FROM node:8.16.2-alpine
RUN apk add --no-cache tzdata
COPY . /opt/sofie-inews-gateway
WORKDIR /opt/sofie-inews-gateway
CMD ["yarn", "start"]