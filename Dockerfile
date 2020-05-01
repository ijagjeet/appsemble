# Build production files
FROM node:12-slim AS build
WORKDIR /app
COPY . .
RUN yarn --frozen-lockfile \
 && yarn build:app \
 && yarn build:studio \
 && yarn workspace @appsemble/utils prepack \
 && yarn workspace @appsemble/node-utils prepack \
 && yarn workspace @appsemble/server prepack

# Install production dependencies
FROM node:12-slim AS prod
WORKDIR /app
COPY --from=build /app/packages/node-utils packages/node-utils
COPY --from=build /app/packages/sdk packages/sdk
COPY --from=build /app/packages/server packages/server
COPY --from=build /app/packages/types packages/types
COPY --from=build /app/packages/utils packages/utils
COPY --from=build /app/package.json package.json
COPY --from=build /app/yarn.lock yarn.lock
RUN yarn --frozen-lockfile --production \
 && find . -name '*.ts' -delete \
 && rm -r yarn.lock

# Setup the production docker image.
FROM node:12-slim
COPY --from=prod /app /app
COPY --from=build /app/dist /app/dist
WORKDIR /app
ENV NODE_ENV production
USER node
ENTRYPOINT ["node", "packages/server/dist"]
CMD ["start"]
HEALTHCHECK CMD ["node", "packages/server/dist", "health"]
EXPOSE 9999
