
export enum EventType {
  SPAWN_ENEMY = 'SPAWN_ENEMY',
  SPAWN_BOSS = 'SPAWN_BOSS',
  GIVE_HEALTH = 'GIVE_HEALTH',
  GIVE_WEAPON = 'GIVE_WEAPON',
  USE_SPECIAL_ITEM = 'USE_SPECIAL_ITEM',
  CHAT = 'CHAT'
}

export type UserRole = 'STREAMER' | 'VIEWER';

export interface GameEvent {
  id: string;
  user: string;
  type: EventType;
  message: string;
  cost?: number; // Token cost
  timestamp: number;
  itemId?: string; // For special items
  targetX?: number; // X coordinate for spawn
  targetY?: number; // Y coordinate for spawn
}

export interface StreamerProfile {
  id: string;
  name: string;
  gameTitle: string;
  description: string;
  viewers: number;
  avatarUrl: string;
  thumbnailUrl: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  isSystem?: boolean;
}

export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface MarketItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  type: 'ENEMY' | 'SUPPORT';
  effectId: string;
  rarity: Rarity;
  imageUrl?: string; // For NFT display
  stock?: number; // Initial stock for system items (undefined = infinite)
  compatibleGames: string[]; // List of Game Titles this item works in
}

export interface InventoryItem extends MarketItem {
  quantity: number;
  instanceIds?: string[]; // Unique IDs for each NFT instance
}

export interface MarketListing {
  id: string;
  seller: string;
  price: number;
  item: MarketItem;
  quantity: number; // Added quantity
  timestamp: number;
  isSystem?: boolean;
}

export interface UserProfile {
  username: string;
  tokens: number;
  role: UserRole;
  inventory: InventoryItem[];
}

// --- NEW TYPES FOR POOL SYSTEM ---

export interface PlayerContribution {
    username: string;
    team: 'SUPPORT' | 'ENEMY'; // Based on items used
    contributionAmount: number; // How much they spent/contributed
    damageDealt: number; // For bonus calc
    kills: number; // For bonus calc
}

export interface RoomData {
    id: string;
    hostName: string; // Streamer
    gameTitle: string;
    description: string;
    entryFee: number; // In Tokens
    currentPool: number; // Total Prize Pool
    status: 'WAITING' | 'LIVE' | 'ENDED';
    thumbnailUrl: string;
    avatarUrl: string;
    viewers: number;
    // Contributors tracking
    contributors: Record<string, PlayerContribution>;
}

export interface GameResultDistribution {
    totalPool: number;
    platformFee: number; // 10%
    streamerBase: number; // 10%
    streamerBonus: number; // 20% (if won)
    teamPool: number; // 60% (Support) or 80% (Enemy)
    winningTeam: 'SUPPORT' | 'ENEMY';
    mvpUser: string; // Most damage/spent
    lastHitUser?: string;
}