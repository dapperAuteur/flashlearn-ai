/**
 * @jest-environment node
 *
 * GET /api/health — the uptime probe.
 *
 * The three things that must never regress:
 *   1. It really pings the database (a static 200 is the exact failure this route exists to prevent).
 *   2. A failure never echoes the underlying error, which routinely carries the credentialed
 *      MongoDB URI.
 *   3. A hung database answers 503 on a short timeout instead of hanging the monitor.
 */

const pingMock = jest.fn();
let connectImpl: () => Promise<unknown> = async () => ({
  connection: { db: { admin: () => ({ command: pingMock }) } },
});

jest.mock('../../../lib/db/dbConnect', () => ({
  __esModule: true,
  default: () => connectImpl(),
}));

import { GET } from '@/app/api/health/route';

// A realistic Mongo failure: the driver puts the whole connection string, password included, into
// the message. Nothing resembling this may appear in the response body.
const LEAKY_ERROR = new Error(
  'MongoServerSelectionError: connect ECONNREFUSED mongodb+srv://flashlearn:sup3rs3cr3t@cluster0.abc12.mongodb.net/flashlearn'
);

describe('GET /api/health', () => {
  beforeEach(() => {
    pingMock.mockReset();
    pingMock.mockResolvedValue({ ok: 1 });
    connectImpl = async () => ({
      connection: { db: { admin: () => ({ command: pingMock }) } },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 200 and actually pings the database', async () => {
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, checks: { db: 'ok' } });
    expect(pingMock).toHaveBeenCalledWith({ ping: 1 });
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('returns 503 with a generic token, never the raw error, when the connection fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    connectImpl = async () => {
      throw LEAKY_ERROR;
    };

    const res = await GET();
    const raw = await res.text();

    expect(res.status).toBe(503);
    expect(JSON.parse(raw)).toEqual({ ok: false, error: 'database_unreachable', checks: { db: 'fail' } });
    expect(raw).not.toContain('sup3rs3cr3t');
    expect(raw).not.toContain('mongodb+srv');
    expect(raw).not.toContain('MongoServerSelectionError');

    // The log line must be credential-free too, since the URI would otherwise land in the log sink.
    for (const call of errorSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('sup3rs3cr3t');
    }
    errorSpy.mockRestore();
  });

  it('returns 503 with the same token when the ping itself fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    pingMock.mockRejectedValue(LEAKY_ERROR);

    const res = await GET();
    const raw = await res.text();

    expect(res.status).toBe(503);
    expect(JSON.parse(raw).error).toBe('database_unreachable');
    expect(raw).not.toContain('sup3rs3cr3t');
    errorSpy.mockRestore();
  });

  it('gives up with 503 when the database hangs', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.useFakeTimers();
    connectImpl = () => new Promise(() => {});

    const pending = GET();
    await jest.advanceTimersByTimeAsync(5000);
    const res = await pending;

    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('database_unreachable');
    errorSpy.mockRestore();
  });
});
