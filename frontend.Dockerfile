FROM node:14.17.1-slim as build

RUN apt-get update && apt-get install -y make

WORKDIR /app

ADD ./makefile ./makefile
COPY ./frontend ./frontend

RUN make build-frontend

FROM nginx

WORKDIR /app

COPY --from=build /app/frontend/dist /usr/share/nginx/html
