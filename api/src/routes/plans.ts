import type { FastifyInstance } from 'fastify';
import { limitsFor, planLimitsUpdatedAt, refreshPlanLimits } from '../lib/plans.js';

/**
 * İstemcilerin ön kontrol için kullandığı etkin plan limitleri.
 * Yetki her zaman yazma uçlarında API tarafında uygulanır.
 */
export async function planRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async () => {
    await refreshPlanLimits();
    return {
      data: {
        plans: {
          free: limitsFor('free'),
          premium: limitsFor('premium'),
        },
        updatedAt: planLimitsUpdatedAt(),
      },
    };
  });
}
