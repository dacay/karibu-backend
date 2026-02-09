import { Hono } from 'hono';
import health from './health.js';
import auth from './auth.js';

export const registerRoutes = (app: Hono) => {

  // Health check route
  app.route('/', health);

  // Authentication routes
  app.route('/auth', auth);
}
