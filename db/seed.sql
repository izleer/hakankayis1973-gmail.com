-- Demo verisi — şifre: Demo1234!
-- Idempotent: sabit UUID'ler ve ON CONFLICT ile tekrar çalıştırılabilir.

BEGIN;

INSERT INTO asset_types (id, parent_id, label, icon, sort_order, attributes_schema) VALUES
  ('canli', NULL, 'Canlılar', 'leaf', 10, '{}'),
  ('canli-bitki', 'canli', 'Bitkiler', 'sprout', 11,
    '{"fields":[{"key":"species","label":"Tür","type":"text"},{"key":"age","label":"Yaş","type":"text"}]}'),
  ('canli-hayvan', 'canli', 'Hayvanlar', 'paw', 12,
    '{"fields":[{"key":"species","label":"Tür","type":"text"},{"key":"birth_date","label":"Doğum tarihi","type":"date"}]}'),
  ('tasit', NULL, 'Taşıtlar', 'car', 20, '{}'),
  ('tasit-otomobil', 'tasit', 'Otomobil', 'car', 21,
    '{"fields":[{"key":"brand","label":"Marka","type":"text"},{"key":"model","label":"Model","type":"text"},{"key":"year","label":"Model yılı","type":"number"},{"key":"plate","label":"Plaka","type":"text"}]}'),
  ('tasit-motosiklet', 'tasit', 'Motosiklet', 'bike', 22,
    '{"fields":[{"key":"brand","label":"Marka","type":"text"},{"key":"model","label":"Model","type":"text"},{"key":"year","label":"Model yılı","type":"number"}]}'),
  ('tasit-bisiklet', 'tasit', 'Bisiklet', 'bike', 23,
    '{"fields":[{"key":"brand","label":"Marka","type":"text"},{"key":"frame_size","label":"Kadro ölçüsü","type":"text"}]}'),
  ('gayrimenkul', NULL, 'Gayrimenkul', 'home', 30,
    '{"fields":[{"key":"area_m2","label":"Alan (m²)","type":"number"},{"key":"rooms","label":"Oda sayısı","type":"text"}]}'),
  ('gayrimenkul-konut', 'gayrimenkul', 'Konut', 'home', 31,
    '{"fields":[{"key":"area_m2","label":"Alan (m²)","type":"number"},{"key":"rooms","label":"Oda sayısı","type":"text"},{"key":"year_built","label":"Yapım yılı","type":"number"}]}'),
  ('gayrimenkul-arsa', 'gayrimenkul', 'Arsa', 'map', 32,
    '{"fields":[{"key":"area_m2","label":"Alan (m²)","type":"number"},{"key":"zoning","label":"İmar durumu","type":"text"}]}'),
  ('sanat', NULL, 'Sanat ve koleksiyon', 'frame', 40, '{}'),
  ('sanat-tablo', 'sanat', 'Tablo', 'frame', 41,
    '{"fields":[{"key":"artist","label":"Sanatçı","type":"text"},{"key":"year","label":"Yıl","type":"number"},{"key":"technique","label":"Teknik","type":"text"}]}'),
  ('sanat-heykel', 'sanat', 'Heykel', 'frame', 42,
    '{"fields":[{"key":"artist","label":"Sanatçı","type":"text"},{"key":"material","label":"Malzeme","type":"text"}]}'),
  ('sanat-antika', 'sanat', 'Antika', 'clock', 43,
    '{"fields":[{"key":"origin","label":"Köken","type":"text"},{"key":"year","label":"Yıl","type":"number"}]}'),
  ('diger', NULL, 'Diğer', 'sparkles', 50, '{}')
ON CONFLICT (id) DO NOTHING;

-- Varlık türü çevirileri (004_i18n.sql içinde tanımlı). Türler bu dosyada
-- yüklendiği için taze kurulumda çeviriler burada tamamlanır.
SELECT sync_asset_type_translations();

INSERT INTO users (id, email, username, password_hash, display_name, bio, role, interests, onboarded_at, created_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 'ada@demo.local', 'ada', 'scrypt$16384$8$1$afb1a79ac72ff62783aa4c09496bbeff$71396fa05f11771a90a855dea3e4ac70088ba866a50a8dd35025383a6bdb2605e0745494917c7e1aefe9a77d31cf7eeeb57c3a145f792943e00801d9f531d7db', 'Ada Yıldız', 'Eski eşyaların izini sürer, balkonunda yeşil bir köşe büyütür.', 'user', ARRAY['motosiklet','bitkiler','tasarım'], now(), now() - interval '210 days'),
  ('22222222-2222-4222-8222-222222222222', 'mert@demo.local', 'mert', 'scrypt$16384$8$1$afb1a79ac72ff62783aa4c09496bbeff$71396fa05f11771a90a855dea3e4ac70088ba866a50a8dd35025383a6bdb2605e0745494917c7e1aefe9a77d31cf7eeeb57c3a145f792943e00801d9f531d7db', 'Mert Kaya', 'Klasik motorlar, eski evler ve uzun yol notları.', 'user', ARRAY['klasik araçlar','mimarlık'], now(), now() - interval '190 days'),
  ('33333333-3333-4333-8333-333333333333', 'selin@demo.local', 'selin', 'scrypt$16384$8$1$afb1a79ac72ff62783aa4c09496bbeff$71396fa05f11771a90a855dea3e4ac70088ba866a50a8dd35025383a6bdb2605e0745494917c7e1aefe9a77d31cf7eeeb57c3a145f792943e00801d9f531d7db', 'Selin Aksoy', 'Koleksiyon ve sanat notları. Platform moderatörü.', 'moderator', ARRAY['sanat','koleksiyon','antika'], now(), now() - interval '160 days'),
  ('44444444-4444-4444-8444-444444444444', 'deniz@demo.local', 'deniz', 'scrypt$16384$8$1$afb1a79ac72ff62783aa4c09496bbeff$71396fa05f11771a90a855dea3e4ac70088ba866a50a8dd35025383a6bdb2605e0745494917c7e1aefe9a77d31cf7eeeb57c3a145f792943e00801d9f531d7db', 'Deniz Arslan', 'Şehirde bisikletle dolaşır, küçük tamirler kaydeder.', 'user', ARRAY['bisiklet','şehir'], now(), now() - interval '120 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO communities (id, slug, name, description, cover_url, owner_id, visibility, created_at) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'klasik-motor-sevenler', 'Klasik Motor Sevenler',
   'Restorasyon hikâyeleri, parça notları ve yol anıları için sakin bir topluluk.', 
   'https://images.unsplash.com/photo-1558980664-2cd663cf86e8?auto=format&fit=crop&w=1600&q=70',
   '22222222-2222-4222-8222-222222222222', 'public', now() - interval '100 days'),
  ('c0000000-0000-4000-8000-000000000002', 'bitki-gunlugu', 'Bitki Günlüğü',
   'Yaprak, kök ve saksı değişimi notlarını birlikte tutuyoruz.',
   'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=1600&q=70',
   '11111111-1111-4111-8111-111111111111', 'public', now() - interval '90 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO assets (id, owner_id, type_id, title, description, cover_url, visibility, status, attributes, location_name, acquired_at, created_at, updated_at) VALUES
  ('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'tasit-motosiklet',
   '1962 Vespa 150', 'Dedemden kalan, yavaş yavaş toparladığımız Vespa. Her sürüşte küçük bir not bırakıyorum.',
   'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1600&q=70',
   'public', 'active', '{"brand":"Piaggio","model":"Vespa 150","year":1962,"plate":"34 VES 62"}',
   'İstanbul, Kadıköy', '2019-06-01', now() - interval '200 days', now() - interval '2 days'),
  ('a0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'canli-bitki',
   'Monstera Deliciosa', 'Küçük bir saksıdan salonun köşesine taşınan, her yaz yeni yapraklarla büyüyen bitki.',
   'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=1600&q=70',
   'public', 'active', '{"species":"Monstera deliciosa","age":"6 yaş"}',
   'İstanbul, Kadıköy', '2020-04-18', now() - interval '180 days', now() - interval '5 days'),
  ('a0000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'gayrimenkul-konut',
   'Moda''daki daire', 'Yüz yıllık binanın üçüncü katı. Sahiplik değişse de tadilat ve bakım izini korumak istiyoruz.',
   'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=70',
   'public', 'active', '{"area_m2":92,"rooms":"2+1","year_built":1924}',
   'İstanbul, Moda', '2021-09-15', now() - interval '150 days', now() - interval '7 days'),
  ('a0000000-0000-4000-8000-000000000004', '33333333-3333-4333-8333-333333333333', 'sanat-tablo',
   'Kıyıda Akşam', 'Sahaf kutusunda bulduğum, imzası okunmayan küçük yağlı boya. Çerçeve ve tuval notları burada.',
   'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1600&q=70',
   'public', 'active', '{"artist":"Bilinmiyor","year":1950,"technique":"Yağlı boya"}',
   'İzmir', '2023-02-11', now() - interval '130 days', now() - interval '9 days'),
  ('a0000000-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'tasit-otomobil',
   '1968 Ford Mustang', 'Uzun süredir garajda. Motor, kaporta ve döşeme işleri aşama aşama ilerliyor.',
   'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1600&q=70',
   'public', 'active', '{"brand":"Ford","model":"Mustang","year":1968,"plate":"34 MUS 68"}',
   'İstanbul, Maslak', '2018-11-20', now() - interval '110 days', now() - interval '1 day'),
  ('a0000000-0000-4000-8000-000000000006', '33333333-3333-4333-8333-333333333333', 'sanat-antika',
   'Aile yadigârı cep saati', 'Sadece aile içinde paylaşılan, bakım ve servis geçmişiyle birlikte korunacak bir parça.',
   'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1600&q=70',
   'selected', 'active', '{"origin":"İsviçre","year":1938}',
   'Ankara', '2015-05-03', now() - interval '80 days', now() - interval '12 days'),
  ('a0000000-0000-4000-8000-000000000007', '44444444-4444-4444-8444-444444444444', 'tasit-bisiklet',
   'Günlük şehir bisikleti', 'Şehir içi kullanım ve küçük tamir notları.',
   NULL, 'private', 'active', '{"brand":"Trek","frame_size":"M"}',
   'İstanbul', '2024-03-02', now() - interval '60 days', now() - interval '20 days'),
  ('a0000000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'canli-bitki',
   'On iki yaşındaki Ficus', 'Dedemin serasından çıkan, her budamada biraz daha sakinleşen bonsai. Formu ve kök duruşu yıllar içinde birlikte şekillendi.',
   NULL, 'public', 'active', '{"species":"Ficus retusa","age":"12 yaş","style":"Moyogi"}',
   'İstanbul, Kadıköy', '2014-05-10', now() - interval '240 days', now() - interval '1 day'),
  ('a0000000-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', 'canli-hayvan',
   'Luna', 'Sokaktan alındığı gün bir battaniyeye sarılıp uyumuştu. Şimdi evin en sakin köşesini ve en uzun yürüyüşlerini biliyor.',
   NULL, 'public', 'active', '{"species":"Golden Retriever","birth_date":"2019-04-02"}',
   'İstanbul, Kadıköy', '2019-06-15', now() - interval '220 days', now() - interval '2 days'),
  ('a0000000-0000-4000-8000-00000000000a', '33333333-3333-4333-8333-333333333333', 'canli-hayvan',
   'Mısır', 'İzmir''deki evin pencere kedisi. Saksıların arasında uyumayı, akşamüstü güneşini ve eski kitapların üstünü seviyor.',
   NULL, 'public', 'active', '{"species":"Tekir","birth_date":"2021-09-21"}',
   'İzmir, Alsancak', '2021-11-03', now() - interval '170 days', now() - interval '4 days'),
  ('a0000000-0000-4000-8000-00000000000b', '33333333-3333-4333-8333-333333333333', 'sanat-heykel',
   'Kilin içindeki kadın', 'Atölyede hâlâ devam eden bir heykel. Her hafta yalnızca birkaç santim değişiyor; sürecin kendisi eserin parçası.',
   NULL, 'public', 'active', '{"artist":"Selin Aksoy","material":"Şamot kil"}',
   'İzmir, Alsancak', '2025-02-18', now() - interval '140 days', now() - interval '6 days'),
  ('a0000000-0000-4000-8000-00000000000c', '11111111-1111-4111-8111-111111111111', 'canli-bitki',
   'Balkon ortancası', 'İlk aldığında iki dalı vardı. Sabah gölgesi, akşam suyu ve her haziranda açan mavi çiçekleriyle balkonun ritmini kuruyor.',
   NULL, 'public', 'active', '{"species":"Hydrangea macrophylla","age":"3 yaş"}',
   'İstanbul, Kadıköy', '2023-04-22', now() - interval '120 days', now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

-- Seçili kişilerle paylaşılan varlık için erişim kuralları
INSERT INTO access_rules (resource_type, resource_id, user_id, created_by) VALUES
  ('asset', 'a0000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333'),
  ('asset', 'a0000000-0000-4000-8000-000000000006', '44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333')
ON CONFLICT DO NOTHING;

INSERT INTO journal_entries (id, asset_id, author_id, type, title, body, occurred_at, visibility, location_name, attributes, created_at) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'acquisition',
   'Devraldığım gün', 'Dedemin garajında, branda altında bekliyordu. İlk kaydı o günün tarihiyle buraya bırakıyorum.',
   '2019-06-01 10:00:00+03', 'public', 'İstanbul, Kadıköy', '{"from":"Dede"}', now() - interval '199 days'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'maintenance',
   'Motor revizyonu', 'Karbüratör temizlendi, buji ve yağ değişti. İlk uzun deneme sürüşü 12 km.',
   '2026-04-12 14:30:00+03', 'public', 'İstanbul, Kadıköy', '{"km":48210,"cost_try":7800}', now() - interval '30 days'),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'photo',
   'Sahil turu', 'Sabah erken saatte sahil. Sadece kendim için saklıyorum.',
   '2026-09-18 07:45:00+03', 'private', 'İstanbul, Caddebostan', '{}', now() - interval '8 days'),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'event',
   'İlk büyük yaprak', 'Kışın ortasında açılan yeni yaprak. Saksıyı biraz daha ışığa yaklaştırdım.',
   '2026-03-10 09:00:00+03', 'public', 'İstanbul, Kadıköy', '{"leaf_count":9}', now() - interval '40 days'),
  ('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'health',
   'Kök kontrolü', 'Saksı değişimi öncesi kök kontrolü. Beyaz kökler sağlıklı görünüyor.',
   '2026-10-02 18:00:00+03', 'private', 'İstanbul', '{"root_health":"iyi"}', now() - interval '3 days'),
  ('e0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'maintenance',
   'Banyo tesisatı yenilendi', 'Eski kurşun borular söküldü, tesisat ve seramik yenilendi. Faturalar arşivde.',
   '2026-06-21 11:00:00+03', 'public', 'İstanbul, Moda', '{"cost_try":64000}', now() - interval '25 days'),
  ('e0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'event',
   'Satın alma', 'Tapu devri tamamlandı. Bundan sonraki bakım ve tadilat kayıtlarını buradan tutacağım.',
   '2021-09-15 14:00:00+03', 'public', 'İstanbul, Moda', '{}', now() - interval '149 days'),
  ('e0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000004', '33333333-3333-4333-8333-333333333333', 'note',
   'Çerçeve ve yüzey incelemesi', 'Tuvalde üç ayrı rötuş izi var. Çerçevenin arkasında 1950 tarihli bir gazete parçası buldum.',
   '2026-08-02 16:20:00+03', 'public', 'İzmir', '{}', now() - interval '15 days'),
  ('e0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'maintenance',
   'Motor ilk kez çalıştı', 'Karbüratör ve ateşleme ayarı sonrası motor ilk kez çalıştı. Kısa bir garaj turu.',
   '2026-10-12 17:10:00+03', 'public', 'İstanbul, Maslak', '{"hours":2}', now() - interval '13 days'),
  ('e0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'photo',
   'Kaporta ziyareti', 'Boyacıyla renk ve astar karşılaştırması. Notlar yalnızca bana görünür.',
   '2026-10-19 13:00:00+03', 'private', 'İstanbul, Maslak', '{}', now() - interval '6 days'),
  ('e0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000006', '33333333-3333-4333-8333-333333333333', 'maintenance',
   'Saat servisi', 'Mekanizma temizlendi, kadran korundu. Servis fişi aile arşivinde.',
   '2026-05-18 12:00:00+03', 'selected', 'Ankara', '{"watchmaker":"Usta Hasan"}', now() - interval '50 days'),
  ('e0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'acquisition',
   'İlk budama', 'Ficus, seradan çıktığında neredeyse bir çalıydı. İlk budamayı dedemle birlikte yaptık; hangi dalın kalacağını hâlâ o günkü çizime bakarak hatırlıyorum.',
   '2014-05-10 10:00:00+03', 'public', 'İstanbul, Kadıköy', '{"from":"Dede","style":"Moyogi"}', now() - interval '239 days'),
  ('e0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'maintenance',
   'Kök ve tel kontrolü', 'Üst toprak yenilendi, teller gevşetildi. Yeni sürgünler bu yıl formu biraz daha sağa taşıyor.',
   '2026-10-20 16:00:00+03', 'public', 'İstanbul, Kadıköy', '{"note":"saksı değişimi ilkbahara"}', now() - interval '6 days'),
  ('e0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', 'health',
   'Yıllık kontrol', 'Kan değerleri iyi, dizleri için eklem takviyesine devam. Veteriner bu yıl daha kısa yürüyüşler önerdi.',
   '2026-09-12 11:30:00+03', 'public', 'İstanbul, Kadıköy', '{"vet":"Moda Veteriner","weight_kg":31.4}', now() - interval '44 days'),
  ('e0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-00000000000a', '33333333-3333-4333-8333-333333333333', 'event',
   'Yeni uyku noktası', 'Mısır bu hafta pencere kenarındaki eski kitapların üstünü seçti. Saksıları oradan çekmek zorunda kaldım.',
   '2026-10-18 09:20:00+03', 'public', 'İzmir, Alsancak', '{}', now() - interval '8 days'),
  ('e0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-00000000000b', '33333333-3333-4333-8333-333333333333', 'note',
   'Yüz ifadesi', 'Bu hafta yalnızca yüz ifadesi üzerinde çalıştım. Göz çukurlarını derinleştirince bakış yumuşadı; artık bir yere baktığını hissediyorum.',
   '2026-10-21 18:40:00+03', 'public', 'İzmir, Alsancak', '{"stage":"yüz","hours":5}', now() - interval '5 days'),
  ('e0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-00000000000c', '11111111-1111-4111-8111-111111111111', 'maintenance',
   'Son sulama ve çiçek sayımı', 'Toprak nemi düştü, akşam serinliğinde suladım. Bu yıl açan çiçek sayısı geçen yıldan fazla.',
   '2026-10-24 19:10:00+03', 'public', 'İstanbul, Kadıköy', '{"flowers":14}', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- Örnek bakım hatırlatması: zamanı gelince bildirim ve Android alarmı üretir.
INSERT INTO journal_entries
  (id, asset_id, author_id, type, title, body, occurred_at, visibility,
   location_name, attributes, created_at, due_at)
VALUES
  ('e0000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'reminder',
   'Toprak değişimi', 'Bonsai için akşam serinliğinde toprak değişimi; teller ve kökler kontrol edilecek.',
   now(), 'private', 'İstanbul, Kadıköy', '{}', now(), now() + interval '7 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO media
  (id, owner_id, kind, status, storage_key, original_name, mime_type, byte_size, width, height,
   asset_id, entry_id, created_at) VALUES
  ('60000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'image', 'ready',
   'seed/bonsai.jpg', 'ficus-budama.jpg', 'image/jpeg', 148716, 1024, 768,
   'a0000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000013', now() - interval '6 days'),
  ('60000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'image', 'ready',
   'seed/luna.jpg', 'luna-kontrol.jpg', 'image/jpeg', 140760, 1024, 768,
   'a0000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000014', now() - interval '44 days'),
  ('60000000-0000-4000-8000-000000000003', '33333333-3333-4333-8333-333333333333', 'image', 'ready',
   'seed/kedi.jpg', 'misir-pencere.jpg', 'image/jpeg', 147352, 1024, 768,
   'a0000000-0000-4000-8000-00000000000a', 'e0000000-0000-4000-8000-000000000015', now() - interval '8 days'),
  ('60000000-0000-4000-8000-000000000004', '33333333-3333-4333-8333-333333333333', 'image', 'ready',
   'seed/heykel.jpg', 'heykel-yuz.jpg', 'image/jpeg', 120066, 1024, 768,
   'a0000000-0000-4000-8000-00000000000b', 'e0000000-0000-4000-8000-000000000016', now() - interval '5 days'),
  ('60000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'image', 'ready',
   'seed/ortanca.jpg', 'ortanca-balkon.jpg', 'image/jpeg', 146964, 1024, 768,
   'a0000000-0000-4000-8000-00000000000c', 'e0000000-0000-4000-8000-000000000017', now() - interval '2 days'),
  ('60000000-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'image', 'ready',
   'seed/ev.jpg', 'moda-daire.jpg', 'image/jpeg', 156361, 1024, 768,
   'a0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000006', now() - interval '25 days'),
  ('60000000-0000-4000-8000-000000000007', '33333333-3333-4333-8333-333333333333', 'image', 'ready',
   'seed/tablo.jpg', 'kiyida-aksam.jpg', 'image/jpeg', 122292, 1024, 768,
   'a0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000008', now() - interval '15 days')
ON CONFLICT (id) DO NOTHING;

UPDATE assets a SET cover_media_id = v.media_id
FROM (VALUES
  ('a0000000-0000-4000-8000-000000000008'::uuid, '60000000-0000-4000-8000-000000000001'::uuid),
  ('a0000000-0000-4000-8000-000000000009'::uuid, '60000000-0000-4000-8000-000000000002'::uuid),
  ('a0000000-0000-4000-8000-00000000000a'::uuid, '60000000-0000-4000-8000-000000000003'::uuid),
  ('a0000000-0000-4000-8000-00000000000b'::uuid, '60000000-0000-4000-8000-000000000004'::uuid),
  ('a0000000-0000-4000-8000-00000000000c'::uuid, '60000000-0000-4000-8000-000000000005'::uuid),
  ('a0000000-0000-4000-8000-000000000003'::uuid, '60000000-0000-4000-8000-000000000006'::uuid),
  ('a0000000-0000-4000-8000-000000000004'::uuid, '60000000-0000-4000-8000-000000000007'::uuid)
) AS v(asset_id, media_id)
WHERE a.id = v.asset_id;

INSERT INTO asset_measurements (id, asset_id, entry_id, metric, value, unit, measured_at) VALUES
  ('90000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000004', 'yaprak sayısı', 9, 'adet', '2026-03-10 09:00:00+03'),
  ('90000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000005', 'saksı çapı', 32, 'cm', '2026-10-02 18:00:00+03'),
  ('90000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'kilometre', 48210, 'km', '2026-04-12 14:30:00+03')
ON CONFLICT (id) DO NOTHING;

INSERT INTO follows (follower_id, following_id, created_at) VALUES
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', now() - interval '60 days'),
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', now() - interval '45 days'),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', now() - interval '58 days'),
  ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', now() - interval '30 days'),
  ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222', now() - interval '20 days')
ON CONFLICT DO NOTHING;

INSERT INTO memberships (community_id, user_id, role, joined_at) VALUES
  ('c0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'owner', now() - interval '100 days'),
  ('c0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'member', now() - interval '70 days'),
  ('c0000000-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444', 'member', now() - interval '25 days'),
  ('c0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'owner', now() - interval '90 days'),
  ('c0000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'member', now() - interval '55 days'),
  ('c0000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', 'member', now() - interval '35 days')
ON CONFLICT DO NOTHING;

INSERT INTO posts (id, author_id, asset_id, entry_id, community_id, audience, body, status, created_at) VALUES
  ('b0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', NULL, 'public',
   'Altı yıl sonra ilk uzun sürüş. Motor revizyonunun detayları varlık geçmişinde; burada sadece sesi kaldı.', 'visible', now() - interval '2 days'),
  ('b0000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'a0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000006', NULL, 'public',
   'Yüz yıllık bir evde en büyük ders: hiçbir tamir tek başına gelmiyor. Banyo bitti, sırada elektrik var.', 'visible', now() - interval '4 days'),
  ('b0000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000004', NULL, 'public',
   'Kışın ortasında yeni bir yaprak. Bitkinin altı yıllık geçmişini yan yana koyunca değişim çok daha görünür oluyor.', 'visible', now() - interval '1 day'),
  ('b0000000-0000-4000-8000-000000000004', '33333333-3333-4333-8333-333333333333', 'a0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000008', NULL, 'public',
   'Çerçevenin arkasından çıkan gazete parçası, tablonun tarihini tahmin ettiğimden daha net gösterdi. Koleksiyon notlarımı paylaşıyorum.', 'visible', now() - interval '7 days'),
  ('b0000000-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'a0000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000001', 'community',
   'Motor ilk kez çalıştığında garajda alkış sesi vardı. Restorasyonun ilk büyük eşiği.', 'visible', now() - interval '3 days'),
  ('b0000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', NULL, NULL, 'c0000000-0000-4000-8000-000000000002', 'community',
   'Bu hafta herkesin bitkisinde tek bir değişiklik paylaşalım: yeni yaprak, saksı değişimi ya da sadece toprak nemi.', 'visible', now() - interval '9 hours'),
  ('b0000000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000013', NULL, 'public',
   'On iki yıl sonra ilk kez formun kendi kendine oturduğunu düşünüyorum. Budama makası artık daha az konuşuyor.', 'visible', now() - interval '5 days'),
  ('b0000000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', 'a0000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000014', NULL, 'public',
   'Luna için bu yılın notu: daha kısa yürüyüşler, daha uzun güneşlenmeler. Yaşlanmayı birlikte öğreniyoruz.', 'visible', now() - interval '3 days'),
  ('b0000000-0000-4000-8000-000000000009', '33333333-3333-4333-8333-333333333333', 'a0000000-0000-4000-8000-00000000000b', 'e0000000-0000-4000-8000-000000000016', NULL, 'public',
   'Heykelde bu hafta tek bir şey değişti: bakış. Bazen bir eseri tamamlayan şey, eklediğiniz değil çıkardığınız kil oluyor.', 'visible', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO likes (user_id, post_id, created_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 'b0000000-0000-4000-8000-000000000002', now() - interval '3 days'),
  ('11111111-1111-4111-8111-111111111111', 'b0000000-0000-4000-8000-000000000004', now() - interval '6 days'),
  ('11111111-1111-4111-8111-111111111111', 'b0000000-0000-4000-8000-000000000005', now() - interval '2 days'),
  ('22222222-2222-4222-8222-222222222222', 'b0000000-0000-4000-8000-000000000001', now() - interval '2 days'),
  ('22222222-2222-4222-8222-222222222222', 'b0000000-0000-4000-8000-000000000003', now() - interval '18 hours'),
  ('33333333-3333-4333-8333-333333333333', 'b0000000-0000-4000-8000-000000000001', now() - interval '1 day'),
  ('44444444-4444-4444-8444-444444444444', 'b0000000-0000-4000-8000-000000000001', now() - interval '20 hours'),
  ('44444444-4444-4444-8444-444444444444', 'b0000000-0000-4000-8000-000000000002', now() - interval '3 days')
ON CONFLICT DO NOTHING;

INSERT INTO comments (id, post_id, author_id, body, status, created_at) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Sesi buradan duyuldu diyebilirim. Güle güle sür.', 'visible', now() - interval '1 day'),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'Bu tür bakım notları ileride çok değerli oluyor. Kayıtlar harika.', 'visible', now() - interval '20 hours'),
  ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Yaprak sayısını ölçüm olarak da ekledim, grafikte görünecek.', 'visible', now() - interval '12 hours'),
  ('d0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000005', '44444444-4444-4444-8444-444444444444', 'Kaporta rengi için hangi kodu seçtiniz?', 'visible', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (id, user_id, actor_id, type, entity_type, entity_id, message, read_at, created_at) VALUES
  ('f0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'like', 'post', 'b0000000-0000-4000-8000-000000000001', 'Mert Kaya gönderini beğendi.', NULL, now() - interval '20 hours'),
  ('f0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'comment', 'post', 'b0000000-0000-4000-8000-000000000001', 'Selin Aksoy gönderine yorum yaptı.', NULL, now() - interval '19 hours'),
  ('f0000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444444', 'follow', 'user', '44444444-4444-4444-8444-444444444444', 'Deniz Arslan seni takip etmeye başladı.', now() - interval '10 days', now() - interval '12 days'),
  ('f0000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'system', NULL, NULL, 'izleer''a hoş geldin. İlk varlığını oluşturmak birkaç saniye sürer.', now() - interval '20 days', now() - interval '100 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details, status, created_at) VALUES
  ('80000000-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444', 'comment', 'd0000000-0000-4000-8000-000000000004', 'Konu dışı satış mesajı', 'Yorum, topluluk kurallarına uymayan bir parça satışına yönlendiriyor.', 'open', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_events (actor_id, action, entity_type, entity_id, metadata, created_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 'asset.created', 'asset', 'a0000000-0000-4000-8000-000000000001', '{"seed":true}', now() - interval '200 days'),
  ('22222222-2222-4222-8222-222222222222', 'asset.created', 'asset', 'a0000000-0000-4000-8000-000000000005', '{"seed":true}', now() - interval '110 days')
;

COMMIT;
