// backend/src/routes/trendRoute.ts
import { Router } from 'express';
import { getHotTopics } from '../controller/trendController';

const router = Router();

/**
 * Trend routes
 * Base path: /api/trends
 */

/**
 * GET /api/trends/hot-topics
 * Gets the most frequently extracted indicators from recent documents
 * Query params:
 *   - limit: number of topics to return (default: 5, max: 20)
 *   - monthsBack: months to look back (default: 3, max: 12)
 */
router.get('/hot-topics', getHotTopics);

export default router;