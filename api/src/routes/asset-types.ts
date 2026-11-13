import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { ensureTaxonomy, translateTypeLabel } from '../lib/taxonomy.js';
import {
  buildCatalog,
  isSelectableType,
  templateFromCatalog,
} from '../lib/templates.js';

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
      attributes_schema: unknown;
    }>(
      `SELECT id, parent_id, label, icon, sort_order, attributes_schema
       FROM asset_types WHERE is_active = true ORDER BY sort_order, label`,
    );

    const catalog = buildCatalog(
      rows.map((row) => ({
        id: row.id,
        parent_id: row.parent_id,
        label: row.label,
        schema: row.attributes_schema,
      })),
    );

    const byId = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      byId.set(row.id, {
        id: row.id,
        parentId: row.parent_id,
        label: translateTypeLabel(locale, row.label),
        icon: row.icon,
        sortOrder: row.sort_order,
        // Kategori ve üst kategorilerinin alan, işlem ve ölçüm şablonları.
        attributesSchema: templateFromCatalog(catalog, row.id, locale),
        isSelectable: isSelectableType(catalog, row.id),
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
