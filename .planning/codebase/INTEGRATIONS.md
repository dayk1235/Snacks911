# Integrations

## 1. Authentication
- Custom JWT-like implementation using `crypto.subtle.sign` HMAC SHA-256 for admin sessions
- Credentials check via environment variables (`ADMIN_USER`, `ADMIN_PASS`) or hardcoded fallback.

## 2. External Services
- WhatsApp Intent Links: Configuration present for forwarding orders to a WhatsApp number.
