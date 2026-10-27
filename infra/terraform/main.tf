locals {
  docker_host = var.docker_host != "" ? var.docker_host : (
    var.ssh_port == 22
    ? "ssh://${var.ssh_user}@${var.ssh_host}"
    : "ssh://${var.ssh_user}@${var.ssh_host}:${var.ssh_port}"
  )

  api_image = "${var.image_prefix}-api:${var.image_tag}"
  web_image = "${var.image_prefix}-web:${var.image_tag}"

  # Kaynak değiştiğinde imajı yeniden derlemek için içerik özetleri.
  api_source_hash = sha256(jsonencode(concat(
    [for f in fileset("${path.module}/../../api/src", "**/*.ts") : filesha256("${path.module}/../../api/src/${f}")],
    [for f in fileset("${path.module}/../../api/seed-media", "*") : filesha256("${path.module}/../../api/seed-media/${f}")],
    [for f in fileset("${path.module}/../../db", "**/*.sql") : filesha256("${path.module}/../../db/${f}")],
    [
      filesha256("${path.module}/../../api/Dockerfile"),
      filesha256("${path.module}/../../api/package.json"),
      filesha256("${path.module}/../../api/package-lock.json"),
      filesha256("${path.module}/../../docker/api-entrypoint.sh"),
    ],
  )))

  web_source_hash = sha256(jsonencode(concat(
    [for f in fileset("${path.module}/../../web/app", "**") : filesha256("${path.module}/../../web/app/${f}")],
    [for f in fileset("${path.module}/../../web/components", "**") : filesha256("${path.module}/../../web/components/${f}")],
    [for f in fileset("${path.module}/../../web/lib", "**") : filesha256("${path.module}/../../web/lib/${f}")],
    [
      filesha256("${path.module}/../../web/Dockerfile"),
      filesha256("${path.module}/../../web/next.config.mjs"),
      filesha256("${path.module}/../../web/package.json"),
      filesha256("${path.module}/../../web/package-lock.json"),
      filesha256("${path.module}/../../web/tsconfig.json"),
    ],
  )))
}

provider "docker" {
  host = local.docker_host
  ssh_opts = startswith(local.docker_host, "ssh://") ? [
    "-o", "StrictHostKeyChecking=accept-new",
    "-i", pathexpand(var.ssh_private_key_path),
  ] : []
}

# ---------------------------------------------------------------------------
# İmajlar
# ---------------------------------------------------------------------------

resource "docker_image" "postgres" {
  name         = var.postgres_image
  keep_locally = true
}

resource "docker_image" "caddy" {
  name         = var.caddy_image
  keep_locally = true
}

resource "terraform_data" "api_source" {
  input = local.api_source_hash
}

resource "terraform_data" "web_source" {
  input = local.web_source_hash
}

resource "docker_image" "api" {
  name = local.api_image
  build {
    context    = abspath("${path.module}/../..")
    dockerfile = "api/Dockerfile"
    tag        = [local.api_image]
  }

  lifecycle {
    replace_triggered_by = [terraform_data.api_source]
  }
}

resource "docker_image" "web" {
  name = local.web_image
  build {
    context    = abspath("${path.module}/../../web")
    dockerfile = "Dockerfile"
    tag        = [local.web_image]
    build_args = {
      API_URL = "http://api:4000"
    }
  }

  lifecycle {
    replace_triggered_by = [terraform_data.web_source]
  }
}

# ---------------------------------------------------------------------------
# Ağ ve kalıcı birimler
# ---------------------------------------------------------------------------

resource "docker_network" "vh" {
  name   = "vh-net"
  driver = "bridge"
}

resource "docker_volume" "db" {
  name = "vh-db-data"
}

resource "docker_volume" "media" {
  name = "vh-media-data"
}

resource "docker_volume" "caddy_data" {
  name = "vh-caddy-data"
}

resource "docker_volume" "caddy_config" {
  name = "vh-caddy-config"
}

# ---------------------------------------------------------------------------
# Veritabanı
# ---------------------------------------------------------------------------

resource "docker_container" "db" {
  name    = "vh-db"
  image   = docker_image.postgres.image_id
  restart = "unless-stopped"

  env = [
    "POSTGRES_DB=${var.db_name}",
    "POSTGRES_USER=${var.db_user}",
    "POSTGRES_PASSWORD=${var.db_password}",
  ]

  volumes {
    volume_name    = docker_volume.db.name
    container_path = "/var/lib/postgresql/data"
  }

  healthcheck {
    test         = ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
    interval     = "10s"
    timeout      = "5s"
    retries      = 10
    start_period = "20s"
  }

  networks_advanced {
    name    = docker_network.vh.name
    aliases = ["db"]
  }
}

# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

resource "docker_container" "api" {
  name    = "vh-api"
  image   = docker_image.api.image_id
  restart = "unless-stopped"

  depends_on = [docker_container.db]

  env = [
    "NODE_ENV=production",
    "APP_ROOT=/app",
    "HOST=0.0.0.0",
    "PORT=4000",
    "RUN_MIGRATIONS=true",
    "PUBLIC_API_URL=https://${var.domain}",
    "CORS_ORIGINS=https://${var.domain}",
    "DATABASE_URL=postgresql://${var.db_user}:${urlencode(var.db_password)}@db:5432/${var.db_name}",
    "DATABASE_SSL=${var.database_ssl ? "true" : "false"}",
    "SESSION_TTL_DAYS=${var.session_ttl_days}",
    "STORAGE_DRIVER=${var.storage_driver}",
    "STORAGE_DIR=/app/storage",
    "MAX_UPLOAD_MB=${var.max_upload_mb}",
    "S3_REGION=${var.s3_region}",
    "S3_BUCKET=${var.s3_bucket}",
    "S3_ENDPOINT=${var.s3_endpoint}",
    "S3_ACCESS_KEY_ID=${var.s3_access_key_id}",
    "S3_SECRET_ACCESS_KEY=${var.s3_secret_access_key}",
    "S3_FORCE_PATH_STYLE=${var.s3_force_path_style ? "true" : "false"}",
  ]

  volumes {
    volume_name    = docker_volume.media.name
    container_path = "/app/storage"
  }

  healthcheck {
    test         = ["CMD-SHELL", "wget -qO- http://127.0.0.1:4000/health || exit 1"]
    interval     = "30s"
    timeout      = "5s"
    retries      = 3
    start_period = "45s"
  }

  networks_advanced {
    name    = docker_network.vh.name
    aliases = ["api"]
  }
}

# ---------------------------------------------------------------------------
# Web (Next.js standalone)
# ---------------------------------------------------------------------------

resource "docker_container" "web" {
  name    = "vh-web"
  image   = docker_image.web.image_id
  restart = "unless-stopped"

  depends_on = [docker_container.api]

  env = [
    "NODE_ENV=production",
    "PORT=3000",
    "HOSTNAME=0.0.0.0",
    "API_URL=http://api:4000",
  ]

  healthcheck {
    test         = ["CMD-SHELL", "wget -qO- http://127.0.0.1:3000/api/health || exit 1"]
    interval     = "30s"
    timeout      = "5s"
    retries      = 3
    start_period = "25s"
  }

  networks_advanced {
    name    = docker_network.vh.name
    aliases = ["web"]
  }
}

# ---------------------------------------------------------------------------
# Caddy (TLS + ters vekil)
# ---------------------------------------------------------------------------

resource "terraform_data" "caddy_config" {
  input = filesha256("${path.module}/../../Caddyfile")
}

resource "docker_container" "caddy" {
  name    = "vh-caddy"
  image   = docker_image.caddy.image_id
  restart = "unless-stopped"

  depends_on = [
    docker_container.api,
    docker_container.web,
  ]

  env = [
    "DOMAIN=${var.domain}",
    "ACME_EMAIL=${var.acme_email}",
  ]

  upload {
    content = file("${path.module}/../../Caddyfile")
    file    = "/etc/caddy/Caddyfile"
  }

  ports {
    internal = 80
    external = 80
  }

  ports {
    internal = 443
    external = 443
  }

  ports {
    internal = 443
    external = 443
    protocol = "udp"
  }

  volumes {
    volume_name    = docker_volume.caddy_data.name
    container_path = "/data"
  }

  volumes {
    volume_name    = docker_volume.caddy_config.name
    container_path = "/config"
  }

  networks_advanced {
    name = docker_network.vh.name
  }

  lifecycle {
    replace_triggered_by = [terraform_data.caddy_config]
  }
}
