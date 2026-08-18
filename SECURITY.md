# Security Policy

## 🔒 Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, email us at: security@henry.ai (placeholder - update with actual contact)

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
- Your contact information

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Status Update**: Within 5 business days
- **Resolution**: Depends on severity (critical: 24-72 hours)

### What to Expect

1. We will acknowledge your report
2. We will investigate and validate the issue
3. We will work on a fix
4. We will credit you (with your permission) in our security advisories

## 🛡️ Security Best Practices for Users

### API Keys

- Never commit API keys to version control
- Use environment variables (`.env` file)
- Rotate keys regularly
- Use separate keys for development and production

### Dependencies

- Keep dependencies updated
- Review security advisories
- Use `npm audit` regularly

### Data Privacy

- H·E·N·R·Y processes data locally when possible
- API calls use HTTPS encryption
- User data is not stored on servers without consent

## 🔐 Security Features

- CORS protection on all API endpoints
- Input validation and sanitization
- Rate limiting on API calls
- Secure environment variable handling
- Content Security Policy headers

## 📋 Security Checklist for Contributors

- [ ] No hardcoded credentials
- [ ] Input validation implemented
- [ ] Error messages don't leak sensitive info
- [ ] API keys stored in environment variables
- [ ] Dependencies are up-to-date
- [ ] No known vulnerabilities in dependencies (`npm audit`)

---

**Last Updated**: January 2026
