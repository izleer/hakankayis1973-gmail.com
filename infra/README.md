# Altyapı — Docker Compose, Caddy, Terraform, yedekleme

Tek sunucuda çalışan, bulut bağımsız üretim kurulumu. İki yol vardır ve ikisi de aynı konteyner adlarını (`vh-db`, `vh-api`, `vh-web`, `vh-caddy`), aynı ağı (`vh-net`) ve aynı birimleri (`vh-db-data`, `vh-media-data`) kullanır:

1. **Docker Compose** — en hızlı yol; imajları sunucuda derler.
2. **Terraform (Docker sağlayıcısı, SSH üzerinden uzak motor)** — kaynakları bildirimsel yönetir; aynı sonucu üretir.

> Aynı ada sahip oldukları için iki yolu aynı sunucuda aynı anda çalıştırmayın; birini seçin.

```
İnternet
   │ :80/:443
   ▼
 Caddy ──► web:3000 (Next.js)
   │           │ /api/vh (sunucu tarafı)
   │           ▼
   ├──────► api:4000 (Fastify)
   │           │
   │           ├── db:5432 (PostgreSQL 17)
   │           └── /app/storage (vh-media-data)  veya S3
   └── /files/* → api
```

## 1. Ön koşullar

- Linux sunucu (2 vCPU / 2 GB RAM yeterli; medya için disk), Docker Engine 24+ ve Compose eklentisi
- Sunucuya yönlenen alan adı (A kaydı; IPv6 varsa AAAA)
- Açık portlar: **22, 80, 443** (TCP) ve 443/UDP (HTTP/3). 3000, 4000 ve 5432 dışarı açılmamalıdır.
- Git deposu sunucuda `/opt/varlik-hafizasi` altında (örnek yollar)

> TLS sertifikası Caddy tarafından otomatik alınır. DNS yayılmadan ve 80/443 açılmadan sertifika alınamaz.

## 2. Docker Compose ile kurulum

```bash
cd /opt/varlik-hafizasi
cp .env.production.example .env.production
# DOMAIN, ACME_EMAIL ve POSTGRES_PASSWORD değerlerini düzenleyin
openssl rand -hex 24          # güçlü, URL-güvenli parola örneği

docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps
curl -fsS https://SIZIN-ALAN-ADINIZ/health
```

- İlk açılışta `api` konteyneri migration'ları uygular (`APP_ROOT=/app`, `docker/api-entrypoint.sh`). Veritabanı hazır değilse 30 kez, 2 sn arayla yeniden dener.
- Caddy, `web` ve `api` sağlıklı olmadan trafik almaz.
- Demo verisi isteğe bağlıdır ve üretimde önerilmez:

```bash
docker compose --env-file .env.production --profile seed run --rm seed
# Demo: ada@demo.local / Demo1234!  (mert, selin, deniz aynı şifre)
```

Demo hesapları üretimde kullanacaksanız şifrelerini değiştirin veya hesapları silin.

### Güncelleme ve geri alma

```bash
# Önce yedek alın (aşağıya bakın)
docker compose --env-file .env.production build --pull
docker compose --env-file .env.production up -d
docker image prune -f

# Geri alma: .env.production içinde IMAGE_TAG'i önceki sürüme çekip
docker compose --env-file .env.production up -d
```

Mevcut komutları kısaltmak için: `alias vh='docker compose --env-file /opt/varlik-hafizasi/.env.production'`.

### Ortam değişkenleri

| Değişken | Açıklama |
| --- | --- |
| `DOMAIN` | Caddy site adresi; `PUBLIC_API_URL` ve CORS otomatik `https://DOMAIN` olur |
| `ACME_EMAIL` | Let's Encrypt iletişim adresi |
| `POSTGRES_*` | Veritabanı; parola URL-güvenli olmalı (en az 24 karakter önerilir) |
| `IMAGE_TAG` | Uygulama imaj sürümü |
| `STORAGE_DRIVER` | `local` (birim) veya `s3` |
| `S3_*` | S3 uyumlu depolama; `S3_ENDPOINT` boşsa AWS kullanılır |
| `DATABASE_SSL` | Yönetilen PostgreSQL'de `true` |
| `MAX_UPLOAD_MB` | Dosya başına sınır (varsayılan 10) |

`POSTGRES_PASSWORD` içinde `@ : / ? #` gibi karakterler `DATABASE_URL`'i bozabilir; `openssl rand -hex 24` gibi URL-güvenli değer kullanın.

## 3. Terraform ile kurulum

`infra/terraform` dizini Docker sağlayıcısıyla **SSH üzerinden uzak Docker motoruna** bağlanır; imajları uzak motorda derler, ağı/birimleri/konteynerleri oluşturur ve Caddyfile'ı konteynere yükler.

Gereksinimler: Terraform ≥ 1.7, sunucuda Docker, SSH anahtarı ve kullanıcının `docker` grubunda olması.

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# ssh_host, domain, db_password vb. düzenleyin
export TF_VAR_db_password='uzun-url-guvenli-parola'

terraform init
terraform fmt -check
terraform plan -out=tfplan
terraform apply tfplan
```

Çıktılar: `url`, `health`, `containers`, `image_tags`.

- `docker_host` boşsa `ssh://kullanıcı@sunucu:port` kullanılır. Yerel Docker için `docker_host = "unix:///var/run/docker.sock"` verilebilir (Linux/macOS).
- İlk uygulama imaj derlemeleri SSH üzerinden bağlam dosyalarını gönderdiği için birkaç dakika sürebilir. Kök `.dockerignore` ve `web/.dockerignore` bağlamı küçük tutar.
- Kaynak kodu değişince imaj yeniden derlenir; `image_tag` değişimi de yeni imaj üretir.
- **`terraform destroy` veri birimlerini de siler.** Önce yedek alın.
- Durum dosyası hassas değerler içerir. Takım kullanımında `versions.tf` içindeki S3 backend örneğini açın; yerelde state'i paylaşmayın.
- Terraform güvenlik duvarı/DNS yönetmez (bulut bağımsız kalsın diye). Bulut konsolu veya `ufw` ile yalnızca 22/80/443 açın.

Terraform ile kurulumda da yedek betikleri aynı konteyner adlarını kullandığı için çalışır.

## 4. Yedekleme ve geri yükleme

```bash
./infra/scripts/backup.sh
# backups/db-YYYYmmdd-HHMMSS.dump.gz
# backups/media-YYYYmmdd-HHMMSS.tar.gz  (STORAGE_DRIVER=local ise)
```

- PostgreSQL `pg_dump --format=custom`, medya `tar.gz`; SHA-256 özetleri yazılır.
- Varsayılan saklama 14 gün (`BACKUP_KEEP_DAYS`).
- Günlük cron için `infra/scripts/backup-cron.example` dosyasını `/etc/cron.d/vh-backup` olarak uyarlayın.
- Yedekleri **başka bir makineye/nesne depolamaya** kopyalayın; aynı diskteki yedek felaket senaryosunda işe yaramaz.

Geri yükleme:

```bash
./infra/scripts/restore.sh db backups/db-20260101-030000.dump.gz
./infra/scripts/restore.sh media backups/media-20260101-030000.tar.gz
# --yes ile onay sormadan çalıştırılabilir
```

Betik API'yi durdurur, `pg_restore --clean --if-exists --no-owner --single-transaction` çalıştırır, ardından API'yi başlatıp sağlığını bekler. Medya geri yükleme `/app/storage` içeriğini yedekle birebir değiştirir.

Önerilen hedefler: **RPO 24 saat**, **RTO 1–4 saat**. Ayda bir yedeği ayrı bir sunucuda açıp doğrulayın.

## 5. S3 / MinIO

Yerel birimden nesne depolamaya geçiş:

1. `.env.production` içinde `STORAGE_DRIVER=s3` ve `S3_*` değerlerini doldurun.
2. Mevcut medyayı anahtar yapısını koruyarak kopyalayın:
   ```bash
   docker cp vh-api:/app/storage ./storage-export
   aws s3 sync ./storage-export s3://SIZIN-BUCKET/ --endpoint-url https://s3.example.com
   ```
3. `api` konteynerini yeniden oluşturun. Veritabanındaki `storage_key` değerleri değişmez; `mediaUrl` artık imzalı URL üretir (1 saat).
4. S3 tarafında yaşam döngüsü, sürümleme ve erişim günlüklerini açın; medya yedeğini bucket politikasıyla alın.

MinIO kullanacaksanız `S3_ENDPOINT` istemcilerin erişebildiği bir adres olmalıdır. HTTPS siteyle birlikte kullanılacaksa MinIO uç noktası da **HTTPS** olmalıdır (tarayıcı karışık içerik engeli). İmzalı URL'ler endpoint'e göre üretildiği için `localhost`/iç ağ adresi tarayıcıdan erişilebilir olmayabilir.

## 6. Güvenlik kontrol listesi

- [ ] Güçlü, URL-güvenli `POSTGRES_PASSWORD`; demo hesapların şifresi değiştirildi veya silindi
- [ ] `.env.production`, `terraform.tfvars` ve state dosyaları repoya eklenmedi
- [ ] Yalnızca 22/80/443 açık; 4000/3000/5432 dışarı kapalı
- [ ] DNS + Caddy sertifikası doğrulandı; HSTS başlığı mevcut
- [ ] Günlük yedek + aylık geri yükleme testi
- [ ] Sunucu ve Docker güvenlik güncellemeleri otomatik
- [ ] S3 kullanılıyorsa bucket özel, erişim anahtarları sınırlı yetkili
- [ ] Terraform state uzak backend'de ve şifreli
- [ ] KVKK: hesap dışa aktarma/silme akışları (`/v1/me/export`, `DELETE /v1/me`) test edildi

## 7. Ölçekleme yolu

- API oturumları veritabanında tuttuğu için yatay çoğaltılabilir; tek sunucuda Caddy arkasında birden fazla API için dış yük dengeleyici gerekir.
- Medya S3'ye taşındığında API ve web örnekleri paylaşımlı disk gerektirmez.
- PostgreSQL yönetilen hizmete taşınabilir: `DATABASE_URL` ve `DATABASE_SSL=true` yeterlidir; migration'lar açılışta çalışır.
- Yedekler ve Caddy verisi kalıcı birimlerdedir; sunucu değişiminde `vh-db-data`, `vh-media-data` taşınır veya yedekten geri yüklenir.

## 8. Sorun giderme

| Belirti | Kontrol |
| --- | --- |
| Sertifika alınmıyor | DNS A/AAAA kaydı, 80/443 erişimi, `docker logs vh-caddy` |
| `api` sağlıksız | `docker logs vh-api`; `DATABASE_URL` parola kaçışı; DB sağlığı |
| Web 502 / boş sayfa | `docker logs vh-web`; `API_URL=http://api:4000`; `docker exec vh-web wget -qO- http://api:4000/health` |
| Yükleme 413 | `MAX_UPLOAD_MB`, API `bodyLimit` (16 MB) ve ters vekil limitleri |
| Migration checksum hatası | Uygulanmış SQL dosyası değiştirilmiş; yeni migration ekleyin, mevcut dosyayı düzenlemeyin |
| `vh` konteyner adı çakışması | Aynı sunucuda ikinci kurulum; adları ve birimleri değiştirin |
| Terraform SSH hatası | Kullanıcı `docker` grubunda mı, anahtar yolu doğru mu, 22 açık mı |
| `terraform apply` imaj derleme hatası | Sunucuda disk/RAM; alternatif olarak Compose ile derleyin |

## 9. Bu ortamda doğrulama durumu

- `terraform validate` (Terraform 1.9.8, docker sağlayıcısı 3.9.0) **başarılı**.
- `docker compose config` (Compose v2.32.4) ile değişken çözümlemesi **başarılı**.
- API imajı yerel olarak derlendi; migration betiği derlenmiş hâlde çalıştırıldı.
- Bu ortamda Docker motoru ve uzak sunucu bulunmadığından imajlar çalıştırılmadı, TLS/alan adı ve yedek/geri yükleme uçtan uca denenmedi. İlk kurulumda yukarıdaki `curl` ve `docker compose ps` adımlarıyla doğrulayın.
