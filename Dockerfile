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
COPY ReadMe.md Dockerfile Jenkinsfile .gitignore .dockerignore ./
COPY .github ./.github

RUN yarn install --immutable

RUN yarn build

FROM node:26-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node

EXPOSE 3000

CMD ["node", "server.js"]
