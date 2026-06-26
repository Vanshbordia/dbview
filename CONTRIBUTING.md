# Contributing to DBView

Thanks for your interest in contributing! Here's how you can help.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/dbview.git
   cd dbview
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Development Guidelines

- **Lint & format** - Biome is used for both linting and formatting. Run `npm run lint` and `npm run format` before committing.
- **Tests** - Run `npm run test` to verify your changes don't break anything. Add tests for new functionality where possible.
- **TypeScript** - The project uses strict TypeScript. Make sure your code compiles without errors.

## Making Changes

1. Create a new branch for your changes:
   ```bash
   git checkout -b my-feature-branch
   ```
2. Make your changes and test them locally
3. Run the full check suite:
   ```bash
   npm run check
   ```
4. Commit your changes with a clear message:
   ```bash
   git commit -m "feat: add support for MySQL dialect"
   ```
5. Push to your fork and open a pull request

## Reporting Issues

- Search existing issues before opening a new one
- Provide a clear title and description
- Include steps to reproduce for bugs
- Mention your browser and OS if relevant

## Pull Request Checklist

- [ ] Code compiles without errors
- [ ] Lint and format checks pass
- [ ] Tests pass and new tests are added where appropriate
- [ ] PR description clearly explains the changes

## Code of Conduct

Please note this project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). Be respectful and considerate in all interactions.