# Testing Guide

This project uses [Vitest](https://vitest.dev/) for unit and integration testing.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.ts                    # Test setup and global mocks
├── utils/
│   └── testHelpers.ts         # Test utility functions
├── unit/
│   ├── utils/                 # Utility function tests
│   ├── lib/                   # Library function tests
│   ├── convex/                # Convex function tests
│   └── components/            # React component tests
└── integration/
    └── api/                   # API route integration tests
```

## Writing Tests

### Unit Tests

Unit tests test individual functions and components in isolation.

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/utils/myFunction';

describe('myFunction', () => {
  it('should return expected value', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

### Integration Tests

Integration tests test how different parts of the system work together.

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/my-route/route';

describe('API Route', () => {
  it('should handle requests correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/my-route');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
```

## Test Coverage

The project aims for high test coverage. Run `npm run test:coverage` to see coverage reports.

## Mocking

- Convex functions are mocked in `tests/setup.ts`
- External APIs are mocked using Vitest's `vi.mock()`
- Use test helpers from `tests/utils/testHelpers.ts` for common test data

