# BUILD IMAGE
FROM node:8.11.4
WORKDIR /opt/sofie-inews-gateway
COPY . .
RUN yarn install --check-files --frozen-lockfile
RUN yarn build:main

# DEPLOY IMAGE
FROM node:8.11.4-alpine
RUN apk add --no-cache tzdata
COPY --from=0 /opt/sofie-inews-gateway /opt/sofie-inews-gateway
WORKDIR /opt/sofie-inews-gateway
CMD ["yarn", "start"]