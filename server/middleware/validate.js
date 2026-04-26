export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', issues: result.error.issues });
    }
    req[source] = result.data;
    next();
  };
}
