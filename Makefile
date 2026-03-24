.PHONY: up down logs api-test engine-test web-test web-e2e lint format

up:
	docker compose up --build

down:
	docker compose down -v

logs:
	docker compose logs -f

api-test:
	docker compose run --rm api pytest

engine-test:
	docker compose run --rm api pytest workers/engine/tests

web-test:
	docker compose run --rm web npm run test -- --run

web-e2e:
	docker compose run --rm web npm run test:e2e

lint:
	docker compose run --rm api flake8 . && docker compose run --rm web npm run lint

format:
	docker compose run --rm api black . && docker compose run --rm web npm run format
