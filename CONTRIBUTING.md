# Contributing to ATTN Protocol

Thank you for your interest in contributing to the ATTN Protocol! This document outlines the contribution process and licensing terms.

## License Agreement

By submitting a pull request or other contribution to this repository, you agree to the following:

1. **MIT License**: Your contribution will be licensed under the [MIT License](./packages/protocol/LICENCE), the same license that covers the rest of this project.

2. **Commercial Use**: You grant NextBlock Inc. and its affiliates the right to use, modify, and incorporate your contribution into related commercial products and services without restriction.

3. **Original Work**: You represent that your contribution is your original work (or you have the right to submit it) and does not violate any third-party rights.

## How to Contribute

### Reporting Issues

- Use GitHub Issues to report bugs or suggest features
- Include as much detail as possible (environment, steps to reproduce, expected vs actual behavior)

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes following our coding standards
4. Write or update tests as needed
5. Run tests to ensure they pass (`npm test`)
6. Commit with clear, descriptive messages
7. Push to your fork and open a pull request

### Coding Standards

- Follow the `snake_case` naming convention (see `.cursorrules`)
- Run ESLint before submitting (`npm run lint`)
- Write tests for new functionality
- Keep commits focused and atomic

### Changesets

We use [Changesets](https://github.com/changesets/changesets) for versioning. If your change affects any package:

```bash
npx changeset
```

Follow the prompts to describe your changes.

## Questions?

Open an issue or reach out to the maintainers if you have any questions about contributing.

---

*By contributing to this project, you acknowledge that you have read and agree to the terms above.*
