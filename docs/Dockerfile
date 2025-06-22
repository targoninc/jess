FROM oven/bun:debian AS base

WORKDIR /usr/src/app

COPY package.json bun.lock ./

RUN bun install

COPY ./src ./src

RUN bun run build-prod

CMD ["bun", "run", "start"]
