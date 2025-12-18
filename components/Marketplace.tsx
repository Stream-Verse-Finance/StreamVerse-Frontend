import React from 'react';
import { MarketItem, InventoryItem, Rarity } from '../types';
import { Backpack, Skull, Zap, ShieldAlert, Biohazard, Hexagon, Anchor, Lock, Cpu, Radiation, Shield, Activity, MoveHorizontal, CloudFog } from 'lucide-react';

interface MarketplaceProps {
  tokens?: number; // Not really needed anymore but kept for compatibility if needed
  inventory: InventoryItem[];
  onBuy?: (item: MarketItem) => void; // Deprecated in GameRoom
  onUse: (item: InventoryItem) => void;
}

// Global definition, exported for use in GlobalMarket
export const MARKET_ITEMS: MarketItem[] = [
  {
    id: 'plasma_grenade',
    name: 'Plasma Grenade',
    description: 'Deals massive AoE damage to enemies.',
    cost: 300,
    icon: 'bomb',
    type: 'SUPPORT',
    effectId: 'EXPLOSION',
    rarity: 'COMMON',
    stock: 999,
    compatibleGames: ['Alien Defense', 'Cyber RPG']
  },
  {
    id: 'adrenaline',
    name: 'Stim Pack',
    description: 'Doubles movement speed for 10s.',
    cost: 400,
    icon: 'speed',
    type: 'SUPPORT',
    effectId: 'SPEED_BOOST',
    rarity: 'COMMON',
    stock: 50,
    compatibleGames: ['Alien Defense', 'Space Racer', 'Arena FPS']
  },
  {
    id: 'energy_shield',
    name: 'Void Shield',
    description: 'Invincibility for 8 seconds.',
    cost: 1000,
    icon: 'shield',
    type: 'SUPPORT',
    effectId: 'SHIELD',
    rarity: 'EPIC',
    stock: 15,
    compatibleGames: ['Alien Defense', 'Cyber RPG', 'Boss Rush']
  },
  {
    id: 'sentry_turret',
    name: 'Sentry Turret',
    description: 'Deploys an automated turret to cover a position.',
    cost: 800,
    icon: 'turret',
    type: 'SUPPORT',
    effectId: 'SPAWN_TURRET',
    rarity: 'EPIC',
    stock: 20,
    compatibleGames: ['Alien Defense', 'Tower Defense X']
  },
  {
    id: 'nuke',
    name: 'Tactical Nuke',
    description: 'Obliterates ALL enemies on screen.',
    cost: 2500,
    icon: 'nuke',
    type: 'SUPPORT',
    effectId: 'NUKE',
    rarity: 'LEGENDARY',
    stock: 3,
    compatibleGames: ['Alien Defense']
  },
  {
    id: 'freeze_ray',
    name: 'Cryo Ammo',
    description: 'Freezes all enemies for 5 seconds.',
    cost: 450,
    icon: 'snowflake',
    type: 'SUPPORT',
    effectId: 'FREEZE',
    rarity: 'RARE',
    stock: 40,
    compatibleGames: ['Alien Defense', 'Cyber RPG']
  },
  {
    id: 'graviton_anchor',
    name: 'Graviton Anchor',
    description: 'Troll Item: Slows the Streamer by 50% for 5s.',
    cost: 600,
    icon: 'anchor',
    type: 'ENEMY',
    effectId: 'SLOW_PLAYER',
    rarity: 'RARE',
    stock: 30,
    compatibleGames: ['Alien Defense', 'Space Racer']
  },
  {
    id: 'mind_scrambler',
    name: 'Neural Jammer',
    description: 'Troll Item: Inverts movement controls for 5s.',
    cost: 750,
    icon: 'confusion',
    type: 'ENEMY',
    effectId: 'INVERT_CONTROLS',
    rarity: 'RARE',
    stock: 25,
    compatibleGames: ['Alien Defense', 'Arena FPS', 'Space Racer']
  },
  {
    id: 'smoke_screen',
    name: 'Dark Matter',
    description: 'Troll Item: Blinds the streamer with darkness for 5s.',
    cost: 900,
    icon: 'darkness',
    type: 'ENEMY',
    effectId: 'DARKNESS',
    rarity: 'EPIC',
    stock: 15,
    compatibleGames: ['Alien Defense', 'Cyber RPG']
  },
  {
    id: 'stasis_field',
    name: 'Stasis Trap',
    description: 'Troll Item: Freezes the Streamer controls for 2s.',
    cost: 1200,
    icon: 'lock',
    type: 'ENEMY',
    effectId: 'FREEZE_PLAYER',
    rarity: 'LEGENDARY',
    stock: 5,
    compatibleGames: ['Alien Defense', 'Arena FPS']
  },
  {
    id: 'acid_queen',
    name: 'Acid Queen Egg',
    description: 'Spawns a Queen Boss that spits acid.',
    cost: 1500,
    icon: 'skull',
    type: 'ENEMY',
    effectId: 'BOSS_ACID',
    rarity: 'LEGENDARY',
    stock: 2,
    compatibleGames: ['Alien Defense']
  },
  {
    id: 'swarm_call',
    name: 'Zerg Swarm',
    description: 'Summons 20 small bugs to attack at once.',
    cost: 800,
    icon: 'bug',
    type: 'ENEMY',
    effectId: 'SWARM',
    rarity: 'EPIC',
    stock: 25,
    compatibleGames: ['Alien Defense', 'Tower Defense X']
  }
];

const Marketplace: React.FC<MarketplaceProps> = ({ inventory, onUse }) => {
  
  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'bomb': return <Zap size={20} className="text-blue-400" />;
      case 'skull': return <Biohazard size={20} className="text-green-500" />;
      case 'snowflake': return <ShieldAlert size={20} className="text-cyan-300" />;
      case 'bug': return <Skull size={20} className="text-red-500" />;
      case 'anchor': return <Anchor size={20} className="text-purple-500" />;
      case 'lock': return <Lock size={20} className="text-indigo-400" />;
      case 'turret': return <Cpu size={20} className="text-teal-400" />;
      case 'nuke': return <Radiation size={20} className="text-orange-500 animate-pulse" />;
      case 'shield': return <Shield size={20} className="text-blue-500" />;
      case 'speed': return <Activity size={20} className="text-yellow-400" />;
      case 'confusion': return <MoveHorizontal size={20} className="text-pink-500" />;
      case 'darkness': return <CloudFog size={20} className="text-slate-500" />;
      default: return <Hexagon size={20} />;
    }
  };

  const getRarityBorder = (rarity: Rarity) => {
      switch (rarity) {
        case 'LEGENDARY': return 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
        case 'EPIC': return 'border-purple-500';
        case 'RARE': return 'border-cyan-500';
        default: return 'border-slate-700';
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#111] border-l border-green-900/30">
      <div className="flex border-b border-green-900/30 bg-[#0a0a0a] p-3">
        <h3 className="text-sm font-bold font-tech text-white flex items-center gap-2 uppercase tracking-wider">
           <Backpack size={16} className="text-green-500" /> Tactical Backpack
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
            {inventory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-600 opacity-60">
                <Backpack size={40} className="mb-2" />
                <p className="text-xs font-mono text-center">No Assets Found.</p>
                <p className="text-[10px] mt-1 text-center">Visit Global Market to Mint NFTs.</p>
              </div>
            ) : (
              inventory.map((item, idx) => (
                <div 
                    key={`${item.id}-${idx}`} 
                    className={`bg-[#0f0f0f] border-2 p-3 rounded-lg flex items-center justify-between group transition-all hover:bg-[#1a1a1a] ${getRarityBorder(item.rarity)}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="p-2 bg-black rounded border border-white/10">
                        {getIcon(item.icon)}
                      </div>
                      <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full border border-black font-bold">
                        x{item.quantity}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm font-tech">{item.name}</h4>
                      <div className="flex flex-col gap-0.5">
                          <span className={`text-[9px] font-bold uppercase ${
                            item.type === 'ENEMY' ? 'text-red-400' : 'text-blue-400'
                          }`}>
                            {item.type === 'ENEMY' ? 'DEBUFF (ENEMY)' : 'BUFF (SUPPORT)'}
                          </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onUse(item)}
                    className="px-4 py-2 bg-white text-black hover:bg-green-400 text-xs font-bold font-tech rounded uppercase transition-colors"
                  >
                    USE
                  </button>
                </div>
              ))
            )}
      </div>
      
      <div className="p-3 border-t border-white/10 bg-[#0a0a0a] text-[10px] text-slate-500 font-mono text-center">
          Assets minted in Global Market are available here.
      </div>
    </div>
  );
};

export default Marketplace;