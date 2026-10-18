.PHONY: dev build preview lint lint-fix typecheck check clean

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

lint:
	npm run lint

lint-fix:
	npm run lint:fix

typecheck:
	npm run typecheck

# Full local quality gate: lint + typecheck
check: lint typecheck

clean:
	node -e "require('fs').rmSync('dist', { recursive: true, force: true })"
