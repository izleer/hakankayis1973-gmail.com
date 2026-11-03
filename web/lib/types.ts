export type Visibility = 'private' | 'selected' | 'public';
export type AssetStatus = 'active' | 'archived';
export type EntryType =
  | 'note'
  | 'photo'
  | 'maintenance'
  | 'acquisition'
  | 'measurement'
  | 'health'
  | 'event'
  | 'document';

export type UserMini = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type User = UserMini & {
  email?: string;
  bio?: string | null;
  role: 'user' | 'moderator' | 'admin';
  interests?: string[];
  createdAt?: string;
  onboardedAt?: string | null;
  stats?: {
    assets: number;
    entries: number;
    posts: number;
    followers: number;
    following: number;
  };
  isSelf?: boolean;
  isFollowing?: boolean;
};

export type AttributeField = {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'number' | string;
  options?: string[];
};

export type AssetType = {
  id: string;
  parentId: string | null;
  label: string;
  icon: string | null;
  sortOrder: number;
  attributesSchema: { fields?: AttributeField[] };
  children: AssetType[];
};

export type Asset = {
  id: string;
  title: string;
  description: string | null;
  visibility: Visibility;
  status: AssetStatus;
  coverUrl: string | null;
  locationName: string | null;
  acquiredAt: string | null;
  attributes: Record<string, unknown>;
  owner: UserMini;
  type: { id: string; label: string; parentId: string | null; icon: string | null };
  entryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Media = {
  id: string;
  kind: 'image' | 'video' | 'document';
  status: 'pending' | 'ready' | 'failed';
  url: string | null;
  mimeType: string;
  originalName: string | null;
  byteSize: number;
  width: number | null;
  height: number | null;
  createdAt: string;
};

export type Entry = {
  id: string;
  assetId: string;
  type: EntryType;
  title: string | null;
  body: string | null;
  occurredAt: string;
  visibility: Visibility;
  locationName: string | null;
  attributes: Record<string, unknown>;
  author: UserMini;
  media: Media[];
  createdAt: string;
  updatedAt: string;
  asset?: { id: string; title: string; typeId: string; typeLabel: string };
};

export type Stats = {
  assets: number;
  archivedAssets: number;
  publicAssets: number;
  entries: number;
  media: number;
  images: number;
  documents: number;
  videos: number;
  sharedWithMe: number;
  followers: number;
  following: number;
  recentEntries: Entry[];
};

export type Paged<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export type ArchiveItem = Media & {
  asset: { id: string; title: string; typeId: string; typeLabel: string };
  entry: { id: string; title: string | null; occurredAt: string | null } | null;
};

export type ArchiveResponse = CursorPage<ArchiveItem> & {
  counts: { total: number; images: number; documents: number; videos: number };
};

export type Measurement = {
  id: string;
  metric: string;
  value: number;
  unit: string;
  measuredAt: string;
};

export type AssetDetailData = {
  asset: Asset;
  entries: Entry[];
  entriesNextCursor: string | null;
  ownerships: {
    id: string;
    owner: UserMini;
    status: 'active' | 'ended';
    startedAt: string;
    endedAt: string | null;
    note: string | null;
  }[];
  access: {
    isOwner: boolean;
    isShared: boolean;
    viewers: { user: UserMini; grantedAt: string }[];
  };
};

export type FeedPost = {
  id: string;
  body: string;
  audience: 'public' | 'community';
  status: string;
  createdAt: string;
  updatedAt: string;
  author: UserMini;
  asset: {
    id: string;
    title: string;
    coverUrl: string | null;
    visibility: Visibility;
    typeLabel: string;
  } | null;
  entry: { id: string; title: string | null; type: EntryType; occurredAt: string | null } | null;
  community: { id: string; slug: string; name: string } | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  media: Media[];
};

export type PostComment = {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  status: string;
  author: UserMini;
  createdAt: string;
};

export type Notification = {
  id: string;
  type: string;
  entityType: string | null;
  entityId: string | null;
  message: string | null;
  readAt: string | null;
  createdAt: string;
  actor: UserMini | null;
};

export type ProfileData = {
  user: User;
  assets: Asset[];
};

export type CommunityRole = 'member' | 'moderator' | 'admin' | 'owner';
export type GroupJoinPolicy = 'open' | 'approval';
export type GroupAssetScope = 'summary' | 'timeline' | 'all';

export type Group = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  rules: string | null;
  visibility: 'public' | 'private';
  joinPolicy: GroupJoinPolicy;
  coverUrl: string | null;
  memberCount: number;
  postCount: number;
  assetCount: number;
  role: CommunityRole | null;
  membershipStatus: 'active' | 'pending' | null;
  owner: UserMini | null;
  createdAt: string;
};

export type GroupMember = {
  user: UserMini;
  role: CommunityRole;
  joinedAt: string;
};

export type GroupDetailData = {
  community: Group;
  members: GroupMember[];
  isMember: boolean;
  isOwner: boolean;
  canPost: boolean;
  canManage: boolean;
  membershipStatus: 'active' | 'pending' | null;
};

export type GroupAsset = Asset & {
  shareId: string;
  scope: GroupAssetScope;
  sharedAt: string;
  addedBy: UserMini;
};

export type GroupAssetDetail = {
  asset: Asset;
  share: {
    scope: GroupAssetScope;
    sharedAt: string;
    addedBy: UserMini;
  };
  community: { id: string; slug: string; name: string };
  entries: Entry[];
};

export type GroupInvitation = {
  id: string;
  createdAt: string;
  expiresAt: string;
  community: { id: string; slug: string; name: string; coverUrl: string | null };
  inviter: UserMini;
};

export type GroupRequests = {
  requests: { user: UserMini; requestedAt: string }[];
  invitations: {
    id: string;
    invitee: UserMini;
    createdAt: string;
    expiresAt: string;
  }[];
};

export type SessionResponse = { user: User };

export type SocialProvider = 'facebook' | 'instagram';
export type SocialShareFormat = 'post' | 'story' | 'reel';

export type SocialConfig = {
  configured: boolean;
  missing: string[];
  graphVersion: string;
  redirectUri: string;
  webReturnUrl: string;
  mediaPublicReady: boolean;
  instagramReady: boolean;
};

export type SocialConnection = {
  id: string;
  provider: SocialProvider;
  externalId: string;
  accountName: string;
  accountUsername: string | null;
  pageId: string;
  pageName: string;
  createdAt: string;
};

export type SocialConnectionsResponse = {
  config: SocialConfig;
  items: SocialConnection[];
};

export type SocialShare = {
  id: string;
  assetId: string;
  provider: SocialProvider;
  format: SocialShareFormat;
  status: 'pending' | 'published' | 'failed';
  caption: string | null;
  permalink: string | null;
  externalId: string | null;
  error: string | null;
  createdAt: string;
  publishedAt: string | null;
};
