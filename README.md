# Forum Workers Backend

Express-like API built with Hono framework running on Cloudflare Workers. Zero cold starts, edge computing, and Supabase for data persistence.

## Quick Start

### Development

```bash
npm install
npm run dev
```

### Testing

```bash
npm test          # Run tests once
npm run test:watch # Watch mode
```

### Deployment

```bash
npm run deploy
```

## Environment Setup

Set these in Cloudflare Dashboard before deploying:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_ACCESS_SECRET=your-jwt-secret
```

## Architecture

**Rate Limiting Tiers:**

- Auth endpoints: 5 req/15min
- Public endpoints: 30 req/15min
- Write operations: 100 req/15min

**Authentication:**

- JWT tokens (1-hour access, 7-day refresh)
- httpOnly cookies with Secure + SameSite=Strict
- Password hashing via Supabase Auth

**Database:** Supabase PostgreSQL via PostgREST API

## Core Endpoints

**Categories:** GET /categories, POST/PATCH/DELETE /categories/:id  
**Threads:** GET /categories/:categoryId/threads, POST/PATCH/DELETE /threads/:id  
**Posts:** GET /posts/thread/:threadId, POST/PATCH/DELETE /posts/:id  
**Users:** GET /users/me, PATCH/DELETE /users/me  
**Auth:** POST /auth/register, login, refresh, logout

All paginated endpoints support `?page=1&pageSize=20` with `totalThreads`/`totalPosts` in response.

## Response Format

```json
{
  "data": { ... },
  "error": { "message": "...", "code": "ERROR_CODE" }
}
```

## Testing

Quick integration tests validate:

- Auth flow (register, login, logout)
- CRUD operations (categories, threads, posts)
- Error handling with proper codes
- Pagination with correct metadata
- Rate limiting enforcement
- Response format consistency

```bash
npm test
```

---

[Cloudflare Workers types](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```bash
npm run cf-typegen
```
