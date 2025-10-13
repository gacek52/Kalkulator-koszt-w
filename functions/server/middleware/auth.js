const admin = require('firebase-admin');

/**
 * Authentication Middleware
 *
 * Weryfikuje Firebase Auth token z nagłówka Authorization
 * i dodaje użytkownika do req.user
 */
async function authenticate(req, res, next) {
  try {
    // Pobierz token z nagłówka Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized - No token provided' }
      });
    }

    const token = authHeader.split('Bearer ')[1];

    // Weryfikuj token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Dodaj użytkownika do request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: { message: 'Unauthorized - Invalid token' }
    });
  }
}

/**
 * Optional Authentication Middleware
 *
 * Próbuje uwierzytelnić użytkownika, ale nie blokuje jeśli nie ma tokenu
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);

      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      };
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Kontynuuj bez autentykacji
  }
}

module.exports = { authenticate, optionalAuth };
