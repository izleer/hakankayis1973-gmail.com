-- ---------------------------------------------------------------------------
-- Bonsai alt türü
--
-- Hazır şablon kataloğu normalde db/seed.sql içinde tutulur; ancak bonsai alt
-- türü üretim veritabanına seed çalıştırılmadan eklenemediği için burada
-- idempotent bir migration olarak tanımlanır. Yerelde seed ile eklenmiş kayıt
-- varsa aynı değerlerle güncellenir.
-- ---------------------------------------------------------------------------

BEGIN;

INSERT INTO asset_types (id, parent_id, label, icon, sort_order, attributes_schema)
VALUES (
  'canli-bitki-bonsai',
  'canli-bitki',
  'Bonsai',
  'sprout',
  111,
  '{"fields":[{"key":"style","label":"Stil","type":"text","labels":{"en":"Style","de":"Stil","fr":"Style","es":"Estilo"}},{"key":"soil_mix","label":"Toprak karışımı","type":"text","labels":{"en":"Soil mix","de":"Substratmischung","fr":"Mélange de sol","es":"Mezcla de sustrato"}},{"key":"pot_style","label":"Saksı stili","type":"text","labels":{"en":"Pot style","de":"Topfstil","fr":"Style de pot","es":"Estilo de maceta"}}],"actions":[{"key":"wiring","label":"Telleme","entryType":"maintenance","reminderDays":120,"labels":{"en":"Wiring","de":"Drahten","fr":"Ligaturage","es":"Alambrado"}}]}'
)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  label = EXCLUDED.label,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  attributes_schema = EXCLUDED.attributes_schema,
  is_active = true;

INSERT INTO asset_type_translations (type_id, locale, label, field_labels) VALUES
  ('canli-bitki-bonsai', 'en', 'Bonsai', '{"style":"Style","soil_mix":"Soil mix","pot_style":"Pot style"}'),
  ('canli-bitki-bonsai', 'de', 'Bonsai', '{"style":"Stil","soil_mix":"Substratmischung","pot_style":"Topfstil"}'),
  ('canli-bitki-bonsai', 'fr', 'Bonsai', '{"style":"Style","soil_mix":"Mélange de sol","pot_style":"Style de pot"}'),
  ('canli-bitki-bonsai', 'es', 'Bonsai', '{"style":"Estilo","soil_mix":"Mezcla de sustrato","pot_style":"Estilo de maceta"}')
ON CONFLICT (type_id, locale) DO UPDATE SET
  label = EXCLUDED.label,
  field_labels = EXCLUDED.field_labels;

COMMIT;
