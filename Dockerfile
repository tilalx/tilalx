# Use the official Node.js 25 image as the base image for the build stage
FROM node:26 AS builder

WORKDIR /app

RUN rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg \
  && npm install -g corepack \
  && corepack enable

COPY public ./public
COPY app ./app
COPY package.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./
COPY next.config.ts tsconfig.json ./
# Files shown in the Explorer; next.config.ts lists them for the standalone trace.
COPY ReadMe.md Dockerfile Jenkinsfile .gitignore .dockerignore ./
COPY .github ./.github

RUN yarn install

RUN yarn build

FROM node:26-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
