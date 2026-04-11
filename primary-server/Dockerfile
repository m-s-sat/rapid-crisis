FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock* package-lock.json* ./

RUN if [ -f bun.lock ]; then bun install; else npm install; fi

COPY . .

RUN bun run build

EXPOSE 3002

CMD ["bun", "run", "dist/index.js"]
