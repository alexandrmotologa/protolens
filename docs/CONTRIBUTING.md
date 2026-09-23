# Contributing to ProtoLens

Contributions are welcome. Please adhere to the guidelines below when submitting changes.

## Development Setup

Requirements:
- Go 1.23+
- Node.js 20+
- npm 10+

### Steps

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/alexandrmotologa/protolens.git
   cd protolens
   ```

2. Build the web interface:
   ```bash
   cd ui
   npm install
   npm run build
   cd ..
   ```

3. Run backend tests:
   ```bash
   go test -v ./...
   ```

4. Start the application locally:
   ```bash
   go run main.go
   ```

## Commit Guidelines

Use Conventional Commits for commit messages:
- `feat: add reflection v1 support`
- `fix: resolve stream half-close race condition`
- `docs: update quick start instructions`
- `refactor: clean up dynamic message factory`

Keep all comments, commit messages, and documentation in English.
