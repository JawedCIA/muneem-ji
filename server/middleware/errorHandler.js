export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  console.error('[API ERROR]', err);
  if (err && err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation failed', issues: err.issues });
  }
  if (err && typeof err.status === 'number') {
    return res.status(err.status).json({ error: err.message });
  }
  return res.status(500).json({ error: err.message || 'Internal server error' });
}

export function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
