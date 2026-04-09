.PHONY: setup dev backend frontend db migrate test lint docker-up docker-down ollama-pull

setup:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

backend:
	cd backend && uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

db:
	docker-compose up -d db

migrate:
	cd backend && alembic upgrade head

test:
	cd backend && pytest -v --cov=app
	cd frontend && npm test

lint:
	cd backend && ruff check . --fix && ruff format .
	cd frontend && npm run lint

docker-up:
	docker-compose up -d --build

docker-down:
	docker-compose down

ollama-pull:
	docker-compose exec ollama ollama pull llama3
