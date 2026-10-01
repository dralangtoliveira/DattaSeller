FROM node:22-alpine
WORKDIR /app
COPY bridge.mjs ./bridge.mjs
ENV NODE_ENV=production
USER node
CMD ["node", "bridge.mjs"]
