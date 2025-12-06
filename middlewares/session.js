import dotenv from "dotenv";
dotenv.config();
import session from "express-session";
import MongoStore from "connect-mongo";

const commonCookieOptions = {
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

// Admin Session Configuration
const adminSession = session({
  name: 'adminSession',
  secret: process.env.ADMIN_SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'adminSessions'
  }),
  cookie: commonCookieOptions
});

// User Session Configuration
const userSession = session({
  name: 'userSession',
  secret: process.env.USER_SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'userSessions'
  }),
  cookie: {
    ...commonCookieOptions,
    maxAge: 1000 * 60 * 60 * 72, // 72 hours for users
  }
});

// Export session configuration function
export function sessionConfig(app) {
  // IMPORTANT: Admin session MUST come first (specific before general)
  app.use('/admin', adminSession);
  app.use(userSession);
}