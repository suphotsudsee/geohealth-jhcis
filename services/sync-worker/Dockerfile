FROM node:20-alpine AS runner
WORKDIR /app
COPY package.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
