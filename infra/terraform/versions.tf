terraform {
  required_version = ">= 1.7.0"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }

  # Takım kullanımı için uzak durum dosyası önerilir (S3 uyumlu herhangi bir servis):
  #
  # backend "s3" {
  #   bucket                      = "varlik-hafizasi-tfstate"
  #   key                         = "prod/terraform.tfstate"
  #   region                      = "eu-central-1"
  #   endpoint                    = "https://s3.example.com"
  #   skip_credentials_validation = true
  #   skip_region_validation      = true
  #   use_path_style              = true
  # }
}
