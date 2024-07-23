# Base Stage
FROM node:alpine AS base

WORKDIR /app

COPY . .

ARG NEXT_PUBLIC_API_URI=PLUNK_API_URI

RUN yarn install --network-timeout 1000000
RUN yarn build:shared
RUN yarn workspace @plunk/api build
RUN yarn workspace @plunk/dashboard build

# Final Stage
FROM node:alpine

WORKDIR /app

RUN apk add --no-cache bash nginx

COPY --from=base /app/packages/api/dist /app/packages/api/
COPY --from=base /app/packages/dashboard/.next /app/packages/dashboard/.next
COPY --from=base /app/packages/dashboard/public /app/packages/dashboard/public
COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/packages/shared /app/packages/shared
COPY --from=base /app/prisma /app/prisma
COPY deployment/nginx.conf /etc/nginx/nginx.conf
COPY deployment/entry.sh deployment/replace-variables.sh /app/

RUN chmod +x /app/entry.sh /app/replace-variables.sh

EXPOSE 3000

CMD ["sh", "/app/entry.sh"]