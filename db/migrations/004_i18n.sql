-- ---------------------------------------------------------------------------
-- Çok dilli altyapı
-- Varlık türü etiketleri ve alan etiketleri için çeviri tablosu.
-- Yeni bir dil eklemek: bu tabloya o dil için satır eklemek yeterlidir.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asset_type_translations (
  type_id      text NOT NULL REFERENCES asset_types(id) ON DELETE CASCADE,
  locale       text NOT NULL CHECK (locale IN ('en', 'de', 'fr', 'es')),
  label        text NOT NULL,
  field_labels jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (type_id, locale)
);

-- ---------------------------------------------------------------------------
-- Varlık türü çevirileri.
-- Türler demo verisiyle (db/seed.sql) yüklendiği için tek seferlik INSERT
-- yerine tekrar çalıştırılabilir bir fonksiyon tanımlanır. Böylece migration
-- sırası ve taze kurulum (migrate → seed) önemli olmaktan çıkar.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_asset_type_translations() RETURNS void AS $fn$
BEGIN
  INSERT INTO asset_type_translations (type_id, locale, label, field_labels)
  SELECT v.type_id, v.locale, v.label, v.field_labels::jsonb
  FROM (VALUES
  -- İngilizce
  ('canli', 'en', 'Living things', '{}'),
  ('canli-bitki', 'en', 'Plants', '{"species":"Species","age":"Age"}'),
  ('canli-hayvan', 'en', 'Animals', '{"species":"Species","birth_date":"Date of birth"}'),
  ('tasit', 'en', 'Vehicles', '{}'),
  ('tasit-otomobil', 'en', 'Car', '{"brand":"Brand","model":"Model","year":"Model year","plate":"Plate"}'),
  ('tasit-motosiklet', 'en', 'Motorcycle', '{"brand":"Brand","model":"Model","year":"Model year"}'),
  ('tasit-bisiklet', 'en', 'Bicycle', '{"brand":"Brand","frame_size":"Frame size"}'),
  ('gayrimenkul', 'en', 'Real estate', '{"area_m2":"Area (m²)","rooms":"Rooms"}'),
  ('gayrimenkul-konut', 'en', 'Home', '{"area_m2":"Area (m²)","rooms":"Rooms","year_built":"Year built"}'),
  ('gayrimenkul-arsa', 'en', 'Land', '{"area_m2":"Area (m²)","zoning":"Zoning status"}'),
  ('sanat', 'en', 'Art & collections', '{}'),
  ('sanat-tablo', 'en', 'Painting', '{"artist":"Artist","year":"Year","technique":"Technique"}'),
  ('sanat-heykel', 'en', 'Sculpture', '{"artist":"Artist","material":"Material"}'),
  ('sanat-antika', 'en', 'Antique', '{"origin":"Origin","year":"Year"}'),
  ('diger', 'en', 'Other', '{}'),

  -- Almanca
  ('canli', 'de', 'Lebewesen', '{}'),
  ('canli-bitki', 'de', 'Pflanzen', '{"species":"Art","age":"Alter"}'),
  ('canli-hayvan', 'de', 'Tiere', '{"species":"Art","birth_date":"Geburtsdatum"}'),
  ('tasit', 'de', 'Fahrzeuge', '{}'),
  ('tasit-otomobil', 'de', 'Auto', '{"brand":"Marke","model":"Modell","year":"Baujahr","plate":"Kennzeichen"}'),
  ('tasit-motosiklet', 'de', 'Motorrad', '{"brand":"Marke","model":"Modell","year":"Baujahr"}'),
  ('tasit-bisiklet', 'de', 'Fahrrad', '{"brand":"Marke","frame_size":"Rahmengröße"}'),
  ('gayrimenkul', 'de', 'Immobilien', '{"area_m2":"Fläche (m²)","rooms":"Zimmer"}'),
  ('gayrimenkul-konut', 'de', 'Wohnung', '{"area_m2":"Fläche (m²)","rooms":"Zimmer","year_built":"Baujahr"}'),
  ('gayrimenkul-arsa', 'de', 'Grundstück', '{"area_m2":"Fläche (m²)","zoning":"Bebauungsstatus"}'),
  ('sanat', 'de', 'Kunst & Sammlungen', '{}'),
  ('sanat-tablo', 'de', 'Gemälde', '{"artist":"Künstler","year":"Jahr","technique":"Technik"}'),
  ('sanat-heykel', 'de', 'Skulptur', '{"artist":"Künstler","material":"Material"}'),
  ('sanat-antika', 'de', 'Antiquität', '{"origin":"Herkunft","year":"Jahr"}'),
  ('diger', 'de', 'Sonstiges', '{}'),

  -- Fransızca
  ('canli', 'fr', 'Êtres vivants', '{}'),
  ('canli-bitki', 'fr', 'Plantes', '{"species":"Espèce","age":"Âge"}'),
  ('canli-hayvan', 'fr', 'Animaux', '{"species":"Espèce","birth_date":"Date de naissance"}'),
  ('tasit', 'fr', 'Véhicules', '{}'),
  ('tasit-otomobil', 'fr', 'Voiture', '{"brand":"Marque","model":"Modèle","year":"Année du modèle","plate":"Immatriculation"}'),
  ('tasit-motosiklet', 'fr', 'Moto', '{"brand":"Marque","model":"Modèle","year":"Année du modèle"}'),
  ('tasit-bisiklet', 'fr', 'Vélo', '{"brand":"Marque","frame_size":"Taille du cadre"}'),
  ('gayrimenkul', 'fr', 'Immobilier', '{"area_m2":"Surface (m²)","rooms":"Pièces"}'),
  ('gayrimenkul-konut', 'fr', 'Logement', '{"area_m2":"Surface (m²)","rooms":"Pièces","year_built":"Année de construction"}'),
  ('gayrimenkul-arsa', 'fr', 'Terrain', '{"area_m2":"Surface (m²)","zoning":"Statut d’urbanisme"}'),
  ('sanat', 'fr', 'Art et collections', '{}'),
  ('sanat-tablo', 'fr', 'Peinture', '{"artist":"Artiste","year":"Année","technique":"Technique"}'),
  ('sanat-heykel', 'fr', 'Sculpture', '{"artist":"Artiste","material":"Matériau"}'),
  ('sanat-antika', 'fr', 'Antiquité', '{"origin":"Origine","year":"Année"}'),
  ('diger', 'fr', 'Autre', '{}'),

  -- İspanyolca
  ('canli', 'es', 'Seres vivos', '{}'),
  ('canli-bitki', 'es', 'Plantas', '{"species":"Especie","age":"Edad"}'),
  ('canli-hayvan', 'es', 'Animales', '{"species":"Especie","birth_date":"Fecha de nacimiento"}'),
  ('tasit', 'es', 'Vehículos', '{}'),
  ('tasit-otomobil', 'es', 'Coche', '{"brand":"Marca","model":"Modelo","year":"Año del modelo","plate":"Matrícula"}'),
  ('tasit-motosiklet', 'es', 'Motocicleta', '{"brand":"Marca","model":"Modelo","year":"Año del modelo"}'),
  ('tasit-bisiklet', 'es', 'Bicicleta', '{"brand":"Marca","frame_size":"Tamaño del cuadro"}'),
  ('gayrimenkul', 'es', 'Inmuebles', '{"area_m2":"Superficie (m²)","rooms":"Habitaciones"}'),
  ('gayrimenkul-konut', 'es', 'Vivienda', '{"area_m2":"Superficie (m²)","rooms":"Habitaciones","year_built":"Año de construcción"}'),
  ('gayrimenkul-arsa', 'es', 'Terreno', '{"area_m2":"Superficie (m²)","zoning":"Situación urbanística"}'),
  ('sanat', 'es', 'Arte y colecciones', '{}'),
  ('sanat-tablo', 'es', 'Pintura', '{"artist":"Artista","year":"Año","technique":"Técnica"}'),
  ('sanat-heykel', 'es', 'Escultura', '{"artist":"Artista","material":"Material"}'),
  ('sanat-antika', 'es', 'Antigüedad', '{"origin":"Origen","year":"Año"}'),
  ('diger', 'es', 'Otro', '{}')
  ) AS v(type_id, locale, label, field_labels)
  JOIN asset_types t ON t.id = v.type_id
  ON CONFLICT (type_id, locale) DO UPDATE SET
    label = EXCLUDED.label,
    field_labels = EXCLUDED.field_labels;
END;
$fn$ LANGUAGE plpgsql;

SELECT sync_asset_type_translations();

-- ---------------------------------------------------------------------------
-- Bildirimler: mesaj metni yerine şablon + parametre saklanır.
-- Eski kayıtlar için message sütunu geriye dönük yedek olarak kalır.
-- ---------------------------------------------------------------------------
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_key text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_params jsonb;
