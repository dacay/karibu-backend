import { Hono } from 'hono';
import health from './health.js';
import auth from './auth.js';
import { organizationMiddleware } from '../middleware/organization.js';

export const registerRoutes = (app: Hono) => {

  // Health check route (no organization context needed)
  app.route('/', health);

  // Apply organization middleware to all non-health routes
  app.use('*', organizationMiddleware());

  // Authentication routes
  app.route('/auth', auth);
}
