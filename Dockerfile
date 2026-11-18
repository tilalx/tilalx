FROM node:26.13.1-trixie-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc AS builder

WORKDIR /app

RUN npm install -g corepack@0.36.0 && corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

COPY public ./public
COPY app ./app
COPY next.config.ts tsconfig.json ./
COPY ReadMe.md Dockerfile Jenkinsfile .gitignore .dockerignore ./
COPY .github ./.github

RUN yarn build

# Only the node binary: no shell, package manager or OS packages. Debian (glibc) to match the builder.
FROM gcr.io/distroless/nodejs26-debian13:nonroot@sha256:1d736cf8b5716c07a245301f92717143215d248fd55771ee1936ef4b3302e531 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder --chown=nonroot:nonroot /app/.next/standalone ./
COPY --from=builder --chown=nonroot:nonroot /app/.next/static ./.next/static
COPY --from=builder --chown=nonroot:nonroot /app/public ./public

EXPOSE 3000

CMD ["server.js"]
