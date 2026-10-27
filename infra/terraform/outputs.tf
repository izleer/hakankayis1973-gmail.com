output "url" {
  description = "Uygulama adresi."
  value       = "https://${var.domain}"
}

output "health" {
  description = "API sağlık adresi."
  value       = "https://${var.domain}/health"
}

output "docker_host" {
  description = "Terraform'un bağlandığı Docker motoru."
  value       = local.docker_host
}

output "containers" {
  description = "Oluşturulan konteynerler."
  value = [
    docker_container.db.name,
    docker_container.api.name,
    docker_container.web.name,
    docker_container.caddy.name,
  ]
}

output "image_tags" {
  description = "Derlenen uygulama imajları."
  value = [
    local.api_image,
    local.web_image,
  ]
}
