# Contributing to REZ Consumer App

## Setup

```bash
git clone https://github.com/imrejaul007/rez-app-consumer.git
cd rez-app-consumer
npm install
cp .env.example .env
npx expo start
```

## Code Style

- Run `npm run lint` before committing
- Use TypeScript for all new files
- Follow existing component patterns
- Keep files under 500 lines

## Testing

```bash
npm test
```

## Commit Messages

Use conventional commit format:

```
fix(scope): description
feat(scope): description
chore(scope): description
```

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Push and open a PR on GitHub

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
