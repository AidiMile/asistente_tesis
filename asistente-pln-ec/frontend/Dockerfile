FROM ghcr.io/cirruslabs/flutter:stable AS build
ARG API_BASE_URL=/api
WORKDIR /app
COPY . .
RUN flutter create --platforms=web --project-name asistente_pln_ec . >/dev/null 2>&1 || true
RUN flutter pub get && flutter build web --release --dart-define=API_BASE_URL=${API_BASE_URL}

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/web /usr/share/nginx/html
