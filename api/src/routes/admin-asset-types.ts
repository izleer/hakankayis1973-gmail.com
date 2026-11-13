import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db.js';
import { audit } from '../lib/audit.js';
import { ApiError, notFound } from '../lib/errors.js';
import { parseBody } from '../lib/http.js';
import { requireStaff } from '../lib/session.js';
import { clearTemplateCache } from '../lib/templates.js';
import { clearTaxonomyCache } from '../lib/taxonomy.js';

/**
 * Kategori şablonlarını yalnızca yönetici/moderatör oluşturur ve yayımlar.
 * Kullanıcılar katalogu yalnızca okur; kendi varlıklarına özel alan ekler.
 */

const slug = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9-]+$/, 'Kimlik yalnızca küçük harf, rakam ve - içerebilir.');

const locales = ['en', 'de', 'fr', 'es'] as const;
const entryTypes = [
  'note',
  'photo',
  'maintenance',
  'acquisition',
  'measurement',
  'health',
  'event',
  'document',
] as const;

const labels = z.record(z.enum(locales), z.string().trim().min(1).max(120)).optional();

const templateField = z.object({
  key: slug,
  label: z.string().trim().min(1).max(80),
  type: z.enum(['text', 'number', 'date', 'select']).default('text'),
  unit: z.string().trim().max(20).optional().nullable(),
  options: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  labels,
});

const templateAction = z.object({
  key: slug,
  label: z.string().trim().min(1).max(80),
  entryType: z.enum(entryTypes).default('event'),
  reminderDays: z.number().int().min(1).max(3650).optional(),
  labels,
});

const templateMeasurement = z.object({
  key: slug,
  label: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(20),
  labels,
});

const template = z.object({
  fields: z.array(templateField).max(60).default([]),
  actions: z.array(templateAction).max(40).default([]),
  measurements: z.array(templateMeasurement).max(40).default([]),
});

const translations = z.record(
  z.enum(locales),
  z.object({
    label: z.string().trim().min(1).max(80),
    fieldLabels: z.record(z.string().trim().max(80)).optional(),
  }),
);

const createBody = z.object({
  id: slug,
  parentId: slug.optional().nullable(),
  label: z.string().trim().min(1).max(80),
  icon: z.string().trim().max(40).optional().nullable(),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  isActive: z.boolean().default(false),
  template: template.default({ fields: [], actions: [], measurements: [] }),
  translations: translations.optional(),
});

const updateBody = z
  .object({
    parentId: slug.nullable().optional(),
    label: z.string().trim().min(1).max(80).optional(),
    icon: z.string().trim().max(40).nullable().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
    isActive: z.boolean().optional(),
    template: template.optional(),
    translations: translations.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Güncellenecek alan yok.' });

async function assertParent(id: string | null | undefined, ownId?: string): Promise<void> {
  if (!id) return;
  if (ownId && id === ownId) {
    throw new ApiError(422, 'INVALID_PARENT', 'Kategori kendi alt kategorisi olamaz.');
  }
  const parent = await queryOne<{ id: string }>(`SELECT id FROM asset_types WHERE id = $1`, [id]);
  if (!parent) throw new ApiError(422, 'INVALID_PARENT', 'Üst kategori bulunamadı.');
}

/** Döngüsel hiyerarşiyi engeller: yeni üst kategori, varlığın alt ağacında olamaz. */
async function assertNoCycle(id: string, parentId: string): Promise<void> {
  const cyclic = await queryOne<{ id: string }>(
    `WITH RECURSIVE descendants AS (
       SELECT id FROM asset_types WHERE id = $1
       UNION ALL
       SELECT t.id FROM asset_types t JOIN descendants d ON t.parent_id = d.id
     )
     SELECT id FROM descendants WHERE id = $2`,
    [id, parentId],
  );
  if (cyclic) {
    throw new ApiError(422, 'INVALID_PARENT', 'Kategori kendi alt ağacına taşınamaz.');
  }
}

async function saveTranslations(
  typeId: string,
  value: z.infer<typeof translations> | undefined,
): Promise<void> {
  if (!value) return;
  for (const [locale, entry] of Object.entries(value)) {
    await query(
      `INSERT INTO asset_type_translations (type_id, locale, label, field_labels)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (type_id, locale) DO UPDATE SET
         label = EXCLUDED.label,
         field_labels = EXCLUDED.field_labels`,
      [typeId, locale, entry.label, JSON.stringify(entry.fieldLabels ?? {})],
    );
  }
}

function invalidate(): void {
  clearTemplateCache();
  clearTaxonomyCache();
}

export async function adminAssetTypeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (req) => {
    await requireStaff(req);
    const rows = await query<Record<string, unknown>>(
      `SELECT id, parent_id, label, icon, sort_order, is_active, attributes_schema
       FROM asset_types ORDER BY sort_order, label`,
    );
    return {
      data: {
        items: rows.map((row) => ({
          id: row.id,
          parentId: row.parent_id,
          label: row.label,
          icon: row.icon,
          sortOrder: row.sort_order,
          isActive: row.is_active,
          template: row.attributes_schema,
        })),
      },
    };
  });

  app.post('/', async (req, reply) => {
    const viewer = await requireStaff(req);
    const body = parseBody(createBody, req.body);
    await assertParent(body.parentId);
    const existing = await queryOne<{ id: string }>(`SELECT id FROM asset_types WHERE id = $1`, [
      body.id,
    ]);
    if (existing) {
      throw new ApiError(409, 'TYPE_EXISTS', 'Bu kimliğe sahip kategori zaten var.');
    }

    await query(
      `INSERT INTO asset_types
         (id, parent_id, label, icon, sort_order, is_active, attributes_schema)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        body.id,
        body.parentId ?? null,
        body.label,
        body.icon ?? null,
        body.sortOrder,
        body.isActive,
        JSON.stringify(body.template),
      ],
    );
    await saveTranslations(body.id, body.translations);
    invalidate();
    await audit(viewer.id, 'asset_type.created', 'asset_type', body.id, {
      parentId: body.parentId ?? null,
      isActive: body.isActive,
    }, req.ip);

    return reply.status(201).send({
      data: {
        item: {
          id: body.id,
          parentId: body.parentId ?? null,
          label: body.label,
          icon: body.icon ?? null,
          sortOrder: body.sortOrder,
          isActive: body.isActive,
          template: body.template,
        },
      },
    });
  });

  app.patch('/:id', async (req) => {
    const viewer = await requireStaff(req);
    const { id } = z.object({ id: slug }).parse(req.params);
    const body = parseBody(updateBody, req.body);
    const current = await queryOne<Record<string, unknown>>(
      `SELECT id, parent_id FROM asset_types WHERE id = $1`,
      [id],
    );
    if (!current) notFound('Kategori bulunamadı.');

    if (body.parentId !== undefined && body.parentId !== null) {
      await assertParent(body.parentId, id);
      await assertNoCycle(id, body.parentId);
    }

    await query(
      `UPDATE asset_types SET
         parent_id = CASE WHEN $2::boolean THEN $3 ELSE parent_id END,
         label = COALESCE($4, label),
         icon = CASE WHEN $5::boolean THEN $6 ELSE icon END,
         sort_order = COALESCE($7, sort_order),
         is_active = COALESCE($8, is_active),
         attributes_schema = COALESCE($9::jsonb, attributes_schema)
       WHERE id = $1`,
      [
        id,
        body.parentId !== undefined,
        body.parentId ?? null,
        body.label ?? null,
        body.icon !== undefined,
        body.icon ?? null,
        body.sortOrder ?? null,
        body.isActive ?? null,
        body.template ? JSON.stringify(body.template) : null,
      ],
    );
    await saveTranslations(id, body.translations);
    invalidate();
    await audit(viewer.id, 'asset_type.updated', 'asset_type', id, {
      fields: Object.keys(body),
      isActive: body.isActive,
    }, req.ip);

    const updated = await queryOne<Record<string, unknown>>(
      `SELECT id, parent_id, label, icon, sort_order, is_active, attributes_schema
       FROM asset_types WHERE id = $1`,
      [id],
    );
    return {
      data: {
        item: {
          id: updated!.id,
          parentId: updated!.parent_id,
          label: updated!.label,
          icon: updated!.icon,
          sortOrder: updated!.sort_order,
          isActive: updated!.is_active,
          template: updated!.attributes_schema,
        },
      },
    };
  });
}
