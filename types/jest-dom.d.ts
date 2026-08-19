// jest.setup.js imports '@testing-library/jest-dom' at runtime, which is enough for Jest but
// invisible to tsc. This side-effect import pulls the matcher declarations (toBeInTheDocument
// and friends) into the type-check, so `npx tsc --noEmit` sees the same matchers the tests use.
import '@testing-library/jest-dom';
