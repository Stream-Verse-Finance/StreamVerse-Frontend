
import { InventoryItem, MarketItem, MarketListing, RoomData, PlayerContribution, GameResultDistribution } from '../types';
import { MARKET_ITEMS } from '../components/Marketplace';

// Mock initial state
const INITIAL_TOKENS = 999999;
const INITIAL_INVENTORY: InventoryItem[] = [];

const USER_STORAGE_KEY = 'streamverse_user_data';
const LISTINGS_STORAGE_KEY = 'streamverse_p2p_listings';
const SYSTEM_STOCK_KEY = 'streamverse_system_stock';
const ROOMS_STORAGE_KEY = 'streamverse_active_rooms';

// Helper to seed some fake P2P listings
const seedListings = (): MarketListing[] => {
  const sellers = [
      'CryptoKing_99', 'VoidWalker', 'NoobMaster69', 'AlienSlayer_X', 
      'TraderJoe', 'GalacticWhale', 'StarLord_22', 'Mercenary_V', 
      'LootGoblin', 'ShadowBroker'
  ];
  
  const listings: MarketListing[] = [];
  
  // Generate 25 fake listings
  for (let i = 0; i < 25; i++) {
      const randomItem = MARKET_ITEMS[Math.floor(Math.random() * MARKET_ITEMS.length)];
      const randomSeller = sellers[Math.floor(Math.random() * sellers.length)];
      // Random price variation +/- 20%
      const priceVariance = (Math.random() * 0.4) - 0.2; 
      const price = Math.floor(randomItem.cost * (1 + priceVariance));
      const quantity = Math.floor(Math.random() * 5) + 1; // 1 to 5 items

      listings.push({
          id: `seed_${i}_${Date.now()}`,
          seller: randomSeller,
          price: price * quantity, // Total price for the bundle
          item: randomItem,
          quantity: quantity,
          timestamp: Date.now() - Math.floor(Math.random() * 10000000)
      });
  }
  
  // Sort by newest
  return listings.sort((a, b) => b.timestamp - a.timestamp);
};

// Helper to seed initial rooms
const seedRooms = (): RoomData[] => {
    return [
        {
            id: "room_1",
            hostName: "Commander_Shepard",
            gameTitle: "Alien Shooter: Last Defense",
            description: "Entry fee goes to the pot! Defenders needed!",
            entryFee: 100, // $1
            currentPool: 5000,
            status: 'LIVE',
            thumbnailUrl: "https://picsum.photos/seed/alien1/600/340",
            avatarUrl: "https://picsum.photos/seed/soldier1/100",
            viewers: 2341,
            contributors: {}
        },
        {
            id: "room_2",
            hostName: "XenoHunter_99",
            gameTitle: "Bug Swarm: Survival",
            description: "High Stakes Room. 500 Entry. Winner takes all.",
            entryFee: 500, // $5
            currentPool: 12500,
            status: 'LIVE',
            thumbnailUrl: "https://picsum.photos/seed/alien2/600/340",
            avatarUrl: "https://picsum.photos/seed/soldier2/100",
            viewers: 856,
            contributors: {}
        }
    ];
};

export const userStore = {
  getData: (): { tokens: number; inventory: InventoryItem[] } => {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return { tokens: INITIAL_TOKENS, inventory: INITIAL_INVENTORY };
  },

  saveData: (tokens: number, inventory: InventoryItem[]) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ tokens, inventory }));
  },

  // --- ROOM & POOL MANAGEMENT ---

  getRooms: (): RoomData[] => {
      const stored = localStorage.getItem(ROOMS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
      const seeds = seedRooms();
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(seeds));
      return seeds;
  },

  getRoom: (roomId: string): RoomData | undefined => {
      const rooms = userStore.getRooms();
      return rooms.find(r => r.id === roomId);
  },

  createRoom: (hostName: string, gameTitle: string, description: string, entryFee: number): string => {
      const rooms = userStore.getRooms();
      const newRoom: RoomData = {
          id: `room_${Date.now()}`,
          hostName,
          gameTitle,
          description,
          entryFee,
          currentPool: 0,
          status: 'LIVE',
          thumbnailUrl: `https://picsum.photos/seed/${Date.now()}/600/340`,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${hostName}`,
          viewers: 0,
          contributors: {}
      };
      rooms.unshift(newRoom);
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
      return newRoom.id;
  },

  // Called when a user joins a room
  joinRoom: (roomId: string): { success: boolean, msg: string } => {
      const rooms = userStore.getRooms();
      const roomIndex = rooms.findIndex(r => r.id === roomId);
      if (roomIndex === -1) return { success: false, msg: "Room not found" };

      const room = rooms[roomIndex];
      const userData = userStore.getData();

      if (userData.tokens < room.entryFee) {
          return { success: false, msg: "Insufficient Tokens for Entry Fee" };
      }

      // Deduct fee and add to pool
      userStore.saveData(userData.tokens - room.entryFee, userData.inventory);
      
      room.currentPool += room.entryFee;
      room.viewers += 1;
      
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
      return { success: true, msg: "Joined Room" };
  },

  // Called when user uses an item/event in the game
  addToPool: (roomId: string, username: string, amount: number, itemType: 'ENEMY' | 'SUPPORT') => {
      const rooms = userStore.getRooms();
      const roomIndex = rooms.findIndex(r => r.id === roomId);
      if (roomIndex === -1) return;

      const room = rooms[roomIndex];
      room.currentPool += amount;

      // Track Contribution
      if (!room.contributors[username]) {
          room.contributors[username] = {
              username,
              team: itemType, // First action determines team for simplicity, or we update logic below
              contributionAmount: 0,
              damageDealt: 0,
              kills: 0
          };
      }
      
      // Update existing contributor
      const contributor = room.contributors[username];
      contributor.contributionAmount += amount;
      // If they switch sides, maybe we re-evaluate? For now, let's stick to:
      // If you help the enemy, you are ENEMY team. If you help Player, SUPPORT.
      // If mixed, last action counts? Or weighted? Let's assume itemType overrides.
      contributor.team = itemType;

      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
  },

  recordDamage: (roomId: string, username: string, damage: number, isKill: boolean) => {
      const rooms = userStore.getRooms();
      const roomIndex = rooms.findIndex(r => r.id === roomId);
      if (roomIndex === -1) return;
      
      const room = rooms[roomIndex];
      if (room.contributors[username]) {
          room.contributors[username].damageDealt += damage;
          if (isKill) room.contributors[username].kills += 1;
          localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
      }
  },

  // The Big Logic: Distribute Rewards
  concludeGame: (roomId: string, streamerWon: boolean): GameResultDistribution | null => {
      const rooms = userStore.getRooms();
      const roomIndex = rooms.findIndex(r => r.id === roomId);
      if (roomIndex === -1) return null;

      const room = rooms[roomIndex];
      const totalPool = room.currentPool;

      // 1. Platform Fee (10%)
      const platformFee = totalPool * 0.10;
      
      // 2. Streamer Base (10%)
      const streamerBase = totalPool * 0.10;
      
      // 3. Remaining 80%
      const remaining = totalPool * 0.80;
      
      let streamerBonus = 0;
      let teamPool = 0;
      let winningTeam: 'SUPPORT' | 'ENEMY' = 'SUPPORT';

      if (streamerWon) {
          winningTeam = 'SUPPORT';
          // Streamer gets +20% (of total? or of remaining? Prompt says "adds 20% bonus")
          // "20% tiền thưởng và 60% còn lại cho team support" implies percentages of total usually, 
          // or splits of the remaining 80%. Let's assume percentages of Total for clarity relative to the 10/10 split.
          // Wait, "80% còn lại sẽ trả dựa theo kết quả... Nếu thắng nhận thêm 20%...". 
          // This implies 20% of the Total is given to streamer, 60% of Total to team.
          // 10 (Plat) + 10 (Base) + 20 (Bonus) + 60 (Team) = 100%. Matches perfectly.
          
          streamerBonus = totalPool * 0.20;
          teamPool = totalPool * 0.60;
      } else {
          winningTeam = 'ENEMY';
          // Streamer loses. No bonus.
          // "80% còn lại cho team đối thủ"
          // 10 (Plat) + 10 (Base) + 0 (Bonus) + 80 (Team) = 100%. Matches perfectly.
          
          streamerBonus = 0;
          teamPool = totalPool * 0.80;
      }

      // Find MVP (Highest contribution or damage?)
      // For Enemy team: Damage to streamer.
      // For Support team: Money spent (contributionAmount).
      let bestValue = -1;
      let mvp = "None";
      
      Object.values(room.contributors).forEach(c => {
          if (c.team === winningTeam) {
              const score = winningTeam === 'ENEMY' ? c.damageDealt : c.contributionAmount;
              if (score > bestValue) {
                  bestValue = score;
                  mvp = c.username;
              }
          }
      });

      // Distribute winnings to current user if they are the MVP or part of winning team (Simplified simulation)
      // In a real app, we would loop through all contributors and update their balances.
      // Here, we just return the calculation structure for display.

      room.status = 'ENDED';
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));

      return {
          totalPool,
          platformFee,
          streamerBase,
          streamerBonus,
          teamPool,
          winningTeam,
          mvpUser: mvp
      };
  },

  // --- System Stock Management ---
  
  getSystemStock: (): Record<string, number> => {
      const stored = localStorage.getItem(SYSTEM_STOCK_KEY);
      if (stored) {
          return JSON.parse(stored);
      }
      // Initialize from default MARKET_ITEMS
      const initialStock: Record<string, number> = {};
      MARKET_ITEMS.forEach(item => {
          if (item.stock !== undefined) {
              initialStock[item.id] = item.stock;
          } else {
              initialStock[item.id] = 9999; // Infinite
          }
      });
      localStorage.setItem(SYSTEM_STOCK_KEY, JSON.stringify(initialStock));
      return initialStock;
  },

  updateSystemStock: (itemId: string, quantityBought: number) => {
      const stock = userStore.getSystemStock();
      if (stock[itemId] !== undefined) {
          stock[itemId] = Math.max(0, stock[itemId] - quantityBought);
          localStorage.setItem(SYSTEM_STOCK_KEY, JSON.stringify(stock));
      }
  },

  // --- Inventory Management ---

  buyItem: (item: MarketItem, quantity: number = 1): boolean => {
    const data = userStore.getData();
    const totalCost = item.cost * quantity;
    const stock = userStore.getSystemStock();
    const currentStock = stock[item.id] !== undefined ? stock[item.id] : 9999;

    if (data.tokens < totalCost) return false; // Not enough money
    if (currentStock < quantity) return false; // Not enough stock

    const newTokens = data.tokens - totalCost;
    const existingItemIndex = data.inventory.findIndex(i => i.id === item.id);
    const newInventory = [...data.inventory];

    if (existingItemIndex >= 0) {
      newInventory[existingItemIndex].quantity += quantity;
    } else {
      newInventory.push({ ...item, quantity: quantity });
    }

    userStore.saveData(newTokens, newInventory);
    userStore.updateSystemStock(item.id, quantity);
    
    return true;
  },

  useItem: (itemId: string): InventoryItem | null => {
    const data = userStore.getData();
    const itemIndex = data.inventory.findIndex(i => i.id === itemId);
    
    if (itemIndex === -1) return null;

    const item = { ...data.inventory[itemIndex] };
    const newInventory = [...data.inventory];

    if (newInventory[itemIndex].quantity > 1) {
      newInventory[itemIndex].quantity -= 1;
    } else {
      newInventory.splice(itemIndex, 1);
    }

    userStore.saveData(data.tokens, newInventory);
    return item;
  },
  
  deductTokens: (amount: number): boolean => {
      const data = userStore.getData();
      if (data.tokens < amount) return false;
      userStore.saveData(data.tokens - amount, data.inventory);
      return true;
  },

  // --- P2P Market Logic ---

  getListings: (): MarketListing[] => {
    const stored = localStorage.getItem(LISTINGS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    const seeds = seedListings();
    localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(seeds));
    return seeds;
  },

  createListing: (item: InventoryItem, price: number, sellerName: string, quantity: number) => {
    // 1. Remove quantity from inventory
    const data = userStore.getData();
    const itemIndex = data.inventory.findIndex(i => i.id === item.id);
    if (itemIndex === -1 || data.inventory[itemIndex].quantity < quantity) return false;

    const newInventory = [...data.inventory];
    if (newInventory[itemIndex].quantity === quantity) {
        newInventory.splice(itemIndex, 1);
    } else {
        newInventory[itemIndex].quantity -= quantity;
    }
    userStore.saveData(data.tokens, newInventory);

    // 2. Add to global listings
    const listings = userStore.getListings();
    const newListing: MarketListing = {
      id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      seller: sellerName,
      price: price, // Total price
      item: item, 
      quantity: quantity,
      timestamp: Date.now()
    };
    
    listings.unshift(newListing); // Add to top
    localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(listings));
    return true;
  },

  buyListing: (listingId: string): boolean => {
    const data = userStore.getData();
    const listings = userStore.getListings();
    const listingIndex = listings.findIndex(l => l.id === listingId);

    if (listingIndex === -1) return false; // Listing gone
    const listing = listings[listingIndex];

    if (data.tokens < listing.price) return false; // Too poor

    // 1. Deduct tokens
    const newTokens = data.tokens - listing.price;
    
    // 2. Add items to buyer inventory
    const existingItemIndex = data.inventory.findIndex(i => i.id === listing.item.id);
    const newInventory = [...data.inventory];

    if (existingItemIndex >= 0) {
      newInventory[existingItemIndex].quantity += listing.quantity;
    } else {
      newInventory.push({ ...listing.item, quantity: listing.quantity });
    }

    // 3. Save User Data
    userStore.saveData(newTokens, newInventory);

    // 4. Remove listing
    listings.splice(listingIndex, 1);
    localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(listings));

    return true;
  }
};