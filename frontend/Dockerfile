# Dockerfile.frontend
FROM node:20 AS build

WORKDIR /app

COPY . /app/
RUN npm install && npm run build

# Serve mit NGINX
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]