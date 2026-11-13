export function buildAssetSelect(extraColumns = ''): string {
  return `
  SELECT a.id, a.owner_id, a.type_id, a.title, a.description, a.cover_url,
         a.visibility, a.status, a.attributes, a.custom_fields, a.location_name, a.latitude, a.longitude,
         a.acquired_at, a.created_at, a.updated_at,
         ${extraColumns}
         t.label AS type_label, t.parent_id AS type_parent_id, t.icon AS type_icon,
         u.username AS owner_username, u.display_name AS owner_display_name,
         u.avatar_url AS owner_avatar_url,
         mc.id AS manager_id, mc.slug AS manager_slug, mc.name AS manager_name,
         cm.storage_key AS cover_storage_key,
         (SELECT count(*) FROM journal_entries je
          WHERE je.asset_id = a.id AND je.deleted_at IS NULL) AS entry_count
  FROM assets a
  JOIN users u ON u.id = a.owner_id AND u.deleted_at IS NULL
  JOIN asset_types t ON t.id = a.type_id
  LEFT JOIN communities mc ON mc.id = a.manager_community_id AND mc.deleted_at IS NULL
  LEFT JOIN media cm ON cm.id = a.cover_media_id
`;
}

export const assetSelect = buildAssetSelect();
