FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

# Copy workspace manifests (all three needed for npm to resolve the workspace graph)
COPY package.json ./
COPY packages/db/package.json ./packages/db/
COPY bot/package.json ./bot/
COPY dashboard/package.json ./dashboard/

# Install only bot + shared package production deps
RUN npm install --workspace=bot --workspace=packages/db --omit=dev

# Copy source files
COPY packages/db/src ./packages/db/src
COPY bot/src ./bot/src

CMD ["node_modules/.bin/tsx", "bot/src/main.ts"]
