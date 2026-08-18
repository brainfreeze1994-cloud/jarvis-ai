# Contributing to H·E·N·R·Y

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 🎯 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the community

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/henry.git`
3. Create a branch: `git checkout -b feature/your-feature`
4. Install dependencies: `npm install`
5. Make your changes
6. Test thoroughly
7. Submit a pull request

## 📝 Development Guidelines

### Code Style

- Follow ESLint rules: `npm run lint`
- Format code with Prettier: `npm run format`
- Use ES6+ features (const/let, arrow functions, async/await)
- Write meaningful variable and function names
- Keep functions focused (< 50 lines ideal)

### Commit Messages

Use conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

Example: `feat: add voice wake word detection`

### Testing

- Write tests for new features
- Ensure all tests pass: `npm test`
- Maintain coverage: `npm run test:coverage`
- Test in multiple browsers (Chrome, Firefox, Safari)

## 🔄 Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure CI passes (lint, tests, build)
4. Request review from maintainers
5. Address feedback promptly

## 📦 Adding Dependencies

- Minimize new dependencies
- Prefer lightweight libraries
- Discuss major dependencies in an issue first

## 🐛 Reporting Bugs

Use GitHub Issues with:

- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details (browser, OS, version)
- Screenshots if applicable

## 💡 Feature Requests

Open an issue with:

- Feature description
- Use case
- Examples of similar implementations
- Potential challenges

## 📄 License

By contributing, you agree that your contributions will be licensed under the project's proprietary license.

---

**Questions?** Open an issue or contact the maintainers.
