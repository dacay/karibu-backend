import { Hono } from 'hono'
import health from './health.js'

export const registerRoutes = (app: Hono) => {

  // Health check route
  app.route('/', health)
}
