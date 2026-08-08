# CsQuiz frontend

Administrative frontend for CsQuiz.

## Development

```sh
npm ci
npm run dev
```

The development server proxies `/api` requests to `http://localhost:9001`.

## Build and test

```sh
npm test
npm run build
```

## Container

Build the standalone frontend image from the repository root:

```sh
docker build -f deploy/Dockerfile .
```
