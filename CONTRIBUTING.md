# Contributing to Teknoify

Thank you for your interest in contributing to Teknoify! This document provides guidelines and instructions for contributing to our project.

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- **Be respectful**: Treat all contributors with respect and professionalism
- **Be inclusive**: Welcome newcomers and help them get started
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone has different skill levels and backgrounds

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 18+ and npm 8+
- Git for version control
- A modern code editor (VS Code recommended)
- Basic knowledge of HTML, CSS, JavaScript, and modern web development

### Setting Up the Development Environment

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub, then clone your fork
   git clone https://github.com/your-username/teknoify.git
   cd teknoify
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Run tests**
   ```bash
   npm test
   ```

## 📋 How to Contribute

### Reporting Issues

Before creating an issue:

1. **Search existing issues** to avoid duplicates
2. **Use the issue templates** provided
3. **Provide detailed information** including:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and OS information
   - Screenshots if applicable

### Suggesting Features

When suggesting new features:

1. **Check the roadmap** to see if it's already planned
2. **Open a discussion** before implementing large features
3. **Provide use cases** and explain the value
4. **Consider the project scope** and target audience

### Making Code Changes

#### Branch Naming Convention

Use descriptive branch names:
- `feature/add-dark-mode` - New features
- `fix/navigation-mobile` - Bug fixes
- `docs/update-readme` - Documentation updates
- `refactor/optimize-css` - Code refactoring
- `test/add-unit-tests` - Test improvements

#### Development Workflow

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards (see below)
   - Write tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm run validate  # Runs lint, test, and format checks
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add dark mode toggle"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Use the PR template provided
   - Link related issues
   - Provide clear description of changes

## 📝 Coding Standards

### JavaScript

- Use modern ES6+ syntax
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Prefer `const` over `let`, avoid `var`

```javascript
// Good
const calculateTotalPrice = (items) => {
  return items.reduce((total, item) => total + item.price, 0)
}

// Bad
var total = 0
function calc(arr) {
  for (var i = 0; i < arr.length; i++) {
    total += arr[i].price
  }
  return total
}
```

### CSS/SCSS

- Use BEM methodology for class names
- Mobile-first responsive design
- Use CSS custom properties for theming
- Follow the established color palette

```css
/* Good */
.product-card {
  display: flex;
  flex-direction: column;
}

.product-card__title {
  font-size: var(--font-size-large);
  color: var(--color-primary);
}

.product-card__title--highlighted {
  color: var(--color-accent);
}
```

### HTML

- Use semantic HTML elements
- Ensure accessibility (WCAG 2.1 AA)
- Include proper meta tags
- Use Turkish language attributes where appropriate

```html
<!-- Good -->
<article class="blog-post" lang="tr">
  <header class="blog-post__header">
    <h1 class="blog-post__title">Makale Başlığı</h1>
    <time class="blog-post__date" datetime="2024-01-01">1 Ocak 2024</time>
  </header>
  <main class="blog-post__content">
    <p>Makale içeriği...</p>
  </main>
</article>
```

## 🧪 Testing Guidelines

### Unit Tests

- Write tests for all new functions
- Use descriptive test names
- Test both success and error cases
- Aim for 80%+ code coverage

```javascript
describe('calculateTotalPrice', () => {
  it('should calculate total price for multiple items', () => {
    const items = [
      { price: 10 },
      { price: 20 },
      { price: 30 }
    ]
    expect(calculateTotalPrice(items)).toBe(60)
  })

  it('should return 0 for empty array', () => {
    expect(calculateTotalPrice([])).toBe(0)
  })
})
```

### Integration Tests

- Test user workflows
- Test form submissions
- Test navigation flows
- Test responsive behavior

## 📚 Documentation

### Code Comments

- Comment complex logic
- Use JSDoc for functions
- Explain "why" not "what"
- Keep comments up to date

```javascript
/**
 * Calculates the total price including tax and discounts
 * @param {Object[]} items - Array of items with price and discount
 * @param {number} taxRate - Tax rate as decimal (0.18 for 18%)
 * @returns {number} Total price after tax and discounts
 */
function calculateFinalPrice(items, taxRate) {
  // Complex calculation logic here
}
```

### README Updates

- Update installation instructions
- Add new feature documentation
- Include screenshots for UI changes
- Update API documentation

## 🔍 Code Review Process

### For Contributors

- **Keep PRs focused** - One feature/fix per PR
- **Write clear descriptions** - Explain what and why
- **Respond to feedback** - Address reviewer comments
- **Test thoroughly** - Ensure all tests pass

### For Reviewers

- **Be constructive** - Provide helpful suggestions
- **Check functionality** - Test the changes locally
- **Review thoroughly** - Check code quality and standards
- **Approve promptly** - Don't delay good contributions

## 🚀 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0) - Breaking changes
- **MINOR** (0.1.0) - New features
- **PATCH** (0.0.1) - Bug fixes

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dark mode toggle
fix: resolve mobile navigation issue
docs: update API documentation
style: improve button hover effects
refactor: optimize image loading
test: add unit tests for calculator
chore: update dependencies
```

## 🎯 Project Priorities

### High Priority
- Performance optimization
- Accessibility improvements
- Mobile responsiveness
- SEO enhancements

### Medium Priority
- New features
- UI/UX improvements
- Code refactoring
- Documentation updates

### Low Priority
- Nice-to-have features
- Experimental features
- Advanced optimizations

## 📞 Getting Help

### Resources

- **Documentation**: Check the README and docs folder
- **Issues**: Search existing issues for solutions
- **Discussions**: Use GitHub Discussions for questions
- **Code Review**: Ask for feedback on draft PRs

### Contact

- **Email**: info@teknoify.com
- **LinkedIn**: [Teknoify Company](https://www.linkedin.com/company/teknoify)
- **GitHub Issues**: For bug reports and feature requests

## 🏆 Recognition

Contributors will be recognized in:
- README contributors section
- Release notes
- Project documentation
- Social media acknowledgments

Thank you for contributing to Teknoify! Your efforts help make this project better for everyone.

---

**Happy Coding!** 🚀