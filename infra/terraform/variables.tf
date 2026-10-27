variable "ssh_host" {
  description = "Docker motorunun bulunduğu sunucunun IP'si veya DNS adı."
  type        = string
}

variable "ssh_user" {
  description = "SSH kullanıcısı (docker grubunda olmalı)."
  type        = string
  default     = "deploy"
}

variable "ssh_port" {
  description = "SSH portu."
  type        = number
  default     = 22
}

variable "ssh_private_key_path" {
  description = "SSH özel anahtar yolu. Terraform Docker sağlayıcısı bu anahtarla bağlanır."
  type        = string
  default     = "~/.ssh/id_ed25519"
}

variable "docker_host" {
  description = "İsteğe bağlı doğrudan Docker adresi. Boşsa ssh:// üzerinden bağlanılır. Yerel test: unix:///var/run/docker.sock"
  type        = string
  default     = ""
}

variable "domain" {
  description = "Uygulamanın yayınlanacağı alan adı; DNS A/AAAA kaydı sunucuya yönlenmeli."
  type        = string
}

variable "acme_email" {
  description = "Let's Encrypt bildirim e-postası."
  type        = string
  default     = "admin@example.com"
}

variable "image_prefix" {
  description = "Yerel Docker imaj adı öneki."
  type        = string
  default     = "varlik-hafizasi"
}

variable "image_tag" {
  description = "İmaj etiketi; her sürümde değiştirin."
  type        = string
  default     = "1.0.0"
}

variable "postgres_image" {
  description = "PostgreSQL imajı."
  type        = string
  default     = "postgres:17-alpine"
}

variable "caddy_image" {
  description = "Caddy imajı."
  type        = string
  default     = "caddy:2.8-alpine"
}

variable "db_name" {
  description = "Veritabanı adı."
  type        = string
  default     = "varlik_hafizasi"
}

variable "db_user" {
  description = "Veritabanı kullanıcısı."
  type        = string
  default     = "vh_app"
}

variable "db_password" {
  description = "Veritabanı şifresi. TF_VAR_db_password ortam değişkeniyle verin; URL-güvenli karakterler kullanın."
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.db_password) >= 12
    error_message = "Veritabanı şifresi en az 12 karakter olmalı."
  }
}

variable "database_ssl" {
  description = "Yönetilen PostgreSQL için true yapın."
  type        = bool
  default     = false
}

variable "session_ttl_days" {
  description = "Oturum ömrü (gün)."
  type        = number
  default     = 30
}

variable "max_upload_mb" {
  description = "Dosya başına üst sınır (MB)."
  type        = number
  default     = 10
}

variable "storage_driver" {
  description = "Medya deposu: local veya s3."
  type        = string
  default     = "local"
  validation {
    condition     = contains(["local", "s3"], var.storage_driver)
    error_message = "storage_driver local veya s3 olmalı."
  }
}

variable "s3_region" {
  type    = string
  default = "eu-central-1"
}

variable "s3_bucket" {
  type    = string
  default = "varlik-hafizasi-media"
}

variable "s3_endpoint" {
  description = "S3 uyumlu servis adresi (MinIO vb.). Boşsa AWS varsayılanı kullanılır."
  type        = string
  default     = ""
}

variable "s3_access_key_id" {
  type      = string
  default   = ""
  sensitive = true
}

variable "s3_secret_access_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "s3_force_path_style" {
  type    = bool
  default = false
}
