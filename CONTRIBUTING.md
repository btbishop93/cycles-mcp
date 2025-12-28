# Contributing to Cycles MCP

Thanks for your interest in contributing! This document outlines the process for contributing to this project.

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/btbishop93/cycles-mcp.git
cd cycles-mcp
```

2. Install dependencies:
```bash
bun install
```

3. Run in development mode:
```bash
bun run dev
```

## Scripts

- `bun run build` - Build for production
- `bun run dev` - Run in development mode
- `bun run lint` - Check for linting issues
- `bun run lint:fix` - Fix linting issues
- `bun run test` - Run tests
- `bun run test:watch` - Run tests in watch mode
- `bun run test:coverage` - Run tests with coverage
- `bun run type-check` - Check TypeScript types

## Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Please format your commit messages as follows:

```
<type>(scope): <description>

[optional body]

[optional footer]
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style/formatting
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

### Examples

```bash
feat(tools): add new task prioritization feature
fix(config): handle missing config file gracefully
docs: update installation instructions
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `bun run test`
5. Run linting: `bun run lint`
6. Commit using conventional commits
7. Push and open a PR

## Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting. Run `bun run lint:fix` before committing to ensure your code follows the project style.

## Questions?

Open an issue if you have questions or need help getting started.
