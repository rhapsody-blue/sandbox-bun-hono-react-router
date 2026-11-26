FROM oven/bun:latest

RUN apt-get update && apt-get install -y curl git && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY package.json bun.lock ./
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/

RUN bun install

COPY . .

EXPOSE 3000 5173 6006

CMD ["bun", "run", "dev"]
