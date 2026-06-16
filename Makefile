.PHONY: dev format build deploy

dev:
	pnpm install
	pnpm dev

format:
	pnpm exec prettier --write .

build:
	pnpm install
	pnpm build

deploy: build
	pnpm exec wrangler deploy
