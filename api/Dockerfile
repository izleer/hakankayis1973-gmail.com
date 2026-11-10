FROM node:22-alpine AS build
WORKDIR /app
COPY api/package.json api/package-lock.json* ./
RUN npm ci
COPY api/tsconfig.json ./
COPY api/src ./src
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    APP_ROOT=/app
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY api/package.json api/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY db ./db
COPY api/seed-media ./api/seed-media
COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN mkdir -p /app/storage \
    && chmod +x /usr/local/bin/api-entrypoint.sh \
    && chown -R app:app /app
USER app
EXPOSE 4000
# Render gibi platformlar PORT'u çalışma anında değiştirir; sağlık kontrolü onu izler.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/health" || exit 1
ENTRYPOINT ["api-entrypoint.sh"]
CMD ["node", "dist/server.js"]
