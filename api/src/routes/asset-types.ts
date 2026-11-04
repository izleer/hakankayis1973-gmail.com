import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import {
  ensureTaxonomy,
  localizeAttributesSchema,
  translateTypeLabel,
} from '../lib/taxonomy.js';

export async function assetTypeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (req) => {
    const { locale } = req;
    await ensureTaxonomy(locale);
    const rows = await query<{
      id: string;
      parent_id: string | null;
      label: string;
      icon: string | null;
      sort_order: number;
      attributes_schema: Record<string, unknown>;
    }>(
      `SELECT id, parent_id, label, icon, sort_order, attributes_schema
       FROM asset_types WHERE is_active = true ORDER BY sort_order, label`,
    );

    const byId = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      byId.set(row.id, {
        id: row.id,
        parentId: row.parent_id,
        label: translateTypeLabel(locale, row.label),
        icon: row.icon,
        sortOrder: row.sort_order,
        attributesSchema: localizeAttributesSchema(row.attributes_schema, locale, row.label),
        children: [],
      });
    }
    const roots: Record<string, unknown>[] = [];
    for (const row of rows) {
      const node = byId.get(row.id)!;
      if (row.parent_id && byId.has(row.parent_id)) {
        (byId.get(row.parent_id)!.children as Record<string, unknown>[]).push(node);
      } else {
        roots.push(node);
      }
    }

    return { data: { items: roots } };
  });
}
