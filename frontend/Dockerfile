# Etapa 1: Compilación de la aplicación Angular
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . ./
RUN npm run build --configuration=production

# Etapa 2: Servir con Nginx ligero
FROM nginx:alpine

COPY --from=build /app/dist/frontend-pln-ec/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
