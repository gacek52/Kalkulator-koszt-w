/**
 * Error Handler Middleware
 * Centralna obsługa błędów dla API
 */

module.exports = (err, req, res, next) => {
  console.error('Error:', err);

  // Określ status code
  const statusCode = err.statusCode || err.status || 500;

  // Określ wiadomość
  const message = err.message || 'Internal Server Error';

  // Dodatkowe informacje w trybie development
  const isDevelopment = process.env.NODE_ENV !== 'production';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(isDevelopment && {
        stack: err.stack,
        details: err.details
      })
    }
  });
};
