import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Coins, Zap, ShieldAlert, Biohazard, Skull, Hexagon, ShoppingCart, Users, Tag, Plus, X, Anchor, Lock, Cpu, Radiation, Shield, Activity, MoveHorizontal, CloudFog, Minus, Gamepad2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { MARKET_ITEMS } from '../components/Marketplace'; 
import { userStore } from '../services/userStore';
import { Rarity, MarketListing, InventoryItem, MarketItem } from '../types';

const GlobalMarket: React.FC = () => {
  const [tokens, setTokens] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'P2P'>('SYSTEM');
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [userInventory, setUserInventory] = useState<InventoryItem[]>([]);
  const [systemStock, setSystemStock] = useState<Record<string, number>>({});
  
  // Local state for system item buy quantities
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});
  
  // Sell Modal State
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedSellItem, setSelectedSellItem] = useState<InventoryItem | null>(null);
  const [sellPrice, setSellPrice] = useState<number>(100);
  const [sellQuantity, setSellQuantity] = useState<number>(1);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const data = userStore.getData();
    setTokens(data.tokens);
    setUserInventory(data.inventory);
    setListings(userStore.getListings());
    setSystemStock(userStore.getSystemStock());
  };

  const updateBuyQuantity = (itemId: string, delta: number) => {
    setBuyQuantities(prev => {
        const current = prev[itemId] || 1;
        const max = systemStock[itemId] || 999;
        const next = Math.min(max, Math.max(1, current + delta));
        return { ...prev, [itemId]: next };
    });
  };

  const handleBuySystem = (item: any) => {
    const qty = buyQuantities[item.id] || 1;
    const success = userStore.buyItem(item, qty);
    if (success) {
      refreshData();
      showNotification(`PURCHASED: ${item.name} (x${qty})`);
      // Reset quantity after buy
      setBuyQuantities(prev => ({ ...prev, [item.id]: 1 }));
    } else {
      showNotification("ERROR: INSUFFICIENT FUNDS OR STOCK");
    }
  };

  const handleBuyP2P = (listing: MarketListing) => {
    const success = userStore.buyListing(listing.id);
    if (success) {
      refreshData();
      showNotification(`ACQUIRED x${listing.quantity} FROM ${listing.seller}`);
    } else {
      showNotification("ERROR: INSUFFICIENT FUNDS OR ITEM SOLD");
    }
  };

  const handleCreateListing = () => {
      if (!selectedSellItem) return;
      if (sellPrice <= 0) {
          showNotification("PRICE MUST BE > 0");
          return;
      }
      if (sellQuantity <= 0 || sellQuantity > selectedSellItem.quantity) {
          showNotification("INVALID QUANTITY");
          return;
      }
      
      const success = userStore.createListing(selectedSellItem, sellPrice, "Guest_Commander", sellQuantity);
      if (success) {
          showNotification("LISTING CREATED");
          setIsSellModalOpen(false);
          setSelectedSellItem(null);
          setSellPrice(100);
          setSellQuantity(1);
          refreshData();
      }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const getRarityColor = (rarity: Rarity, isP2P = false) => {
    if (isP2P) {
        // P2P Items have a distinct "Used/Traded" aesthetic (Orange/Rust)
        return 'border-orange-900/50 bg-[#1a0f05] shadow-orange-900/20';
    }
    switch (rarity) {
      case 'COMMON': return 'border-slate-600 text-slate-400 shadow-slate-900/50';
      case 'RARE': return 'border-cyan-500 text-cyan-400 shadow-cyan-500/20';
      case 'EPIC': return 'border-purple-500 text-purple-400 shadow-purple-500/30';
      case 'LEGENDARY': return 'border-amber-400 text-amber-300 shadow-amber-500/40 bg-gradient-to-b from-amber-900/20 to-black';
      default: return 'border-slate-600';
    }
  };

  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'bomb': return <Zap size={48} className="mb-4" />;
      case 'skull': return <Biohazard size={48} className="mb-4" />;
      case 'snowflake': return <ShieldAlert size={48} className="mb-4" />;
      case 'bug': return <Skull size={48} className="mb-4" />;
      case 'anchor': return <Anchor size={48} className="mb-4" />;
      case 'lock': return <Lock size={48} className="mb-4" />;
      case 'turret': return <Cpu size={48} className="mb-4" />;
      case 'nuke': return <Radiation size={48} className="mb-4" />;
      case 'shield': return <Shield size={48} className="mb-4" />;
      case 'speed': return <Activity size={48} className="mb-4" />;
      case 'confusion': return <MoveHorizontal size={48} className="mb-4" />;
      case 'darkness': return <CloudFog size={48} className="mb-4" />;
      default: return <Hexagon size={48} className="mb-4" />;
    }
  };

  // Helper to render Buff/Debuff Badge
  const renderTypeBadge = (type: 'ENEMY' | 'SUPPORT') => {
      const isBuff = type === 'SUPPORT';
      return (
          <div className={`absolute bottom-2 left-2 z-30 flex items-center gap-1 px-2 py-1 rounded-full border shadow-lg backdrop-blur-md ${isBuff ? 'bg-blue-900/80 border-blue-400 text-blue-200' : 'bg-red-900/80 border-red-500 text-red-200'}`}>
              {isBuff ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
              <span className="text-[10px] font-bold uppercase tracking-wide">{isBuff ? 'BUFF' : 'DEBUFF'}</span>
          </div>
      );
  };

  // Helper to render Game Compatibility Chips
  const renderGameChips = (games: string[]) => {
      if (!games || games.length === 0) return null;
      return (
          <div className="mt-3">
              <div className="flex items-center gap-1 text-[9px] text-slate-500 uppercase font-bold mb-1">
                  <Gamepad2 size={10} /> Compatible Games:
              </div>
              <div className="flex flex-wrap gap-1">
                  {games.slice(0, 3).map((game, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-slate-400 font-mono">
                          {game}
                      </span>
                  ))}
                  {games.length > 3 && (
                      <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-slate-400 font-mono">
                          +{games.length - 3}
                      </span>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans relative overflow-hidden">
        <div className="scanline"></div>
        
        {/* Header */}
        <header className="h-20 border-b border-purple-900/30 bg-[#0a0a0a] flex items-center justify-between px-8 sticky top-0 z-30 backdrop-blur-md bg-opacity-80">
            <div className="flex items-center gap-6">
                <Link to="/" className="text-purple-400 hover:text-white transition-colors flex items-center gap-2 font-mono uppercase tracking-widest text-sm">
                    <ChevronLeft /> HUB
                </Link>
                <div className="flex items-baseline gap-2">
                    <h1 className="font-tech text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 tracking-tighter">
                        BLACK MARKET
                    </h1>
                    <span className="text-xs font-mono text-slate-500">v.2.4.0</span>
                </div>
            </div>
            
            <div className="flex items-center gap-4 bg-black/60 border border-purple-500/30 px-6 py-2 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <Coins className="text-yellow-400" />
                <span className="font-mono text-2xl font-bold text-white tracking-wider">{tokens.toLocaleString()}</span>
                <span className="text-xs text-purple-400 font-bold">BIO-TOKENS</span>
            </div>
        </header>

        {/* Notification Toast */}
        {notification && (
            <div className="fixed top-24 right-8 z-50 bg-green-900/90 border border-green-500 text-white px-6 py-4 rounded shadow-[0_0_20px_rgba(34,197,94,0.4)] animate-bounce font-mono z-[100]">
                {notification}
            </div>
        )}

        <main className="max-w-7xl mx-auto p-8 relative z-10">
            
            {/* Market Tabs */}
            <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-1">
                <div className="flex gap-4">
                    <button 
                        onClick={() => setActiveTab('SYSTEM')}
                        className={`px-6 py-3 font-tech font-bold text-lg tracking-widest transition-all ${activeTab === 'SYSTEM' ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-900/10' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        OFFICIAL ARMORY <span className="text-[10px] align-top bg-purple-500 text-black px-1 rounded">SYSTEM</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('P2P')}
                        className={`px-6 py-3 font-tech font-bold text-lg tracking-widest transition-all ${activeTab === 'P2P' ? 'text-orange-400 border-b-2 border-orange-500 bg-orange-900/10' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        ROGUE TRADERS <span className="text-[10px] align-top bg-orange-500 text-black px-1 rounded">P2P</span>
                    </button>
                </div>

                {activeTab === 'P2P' && (
                    <button 
                        onClick={() => setIsSellModalOpen(true)}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-black font-bold px-4 py-2 rounded font-tech uppercase transition-colors"
                    >
                        <Plus size={16} /> Sell Asset
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {activeTab === 'SYSTEM' ? (
                    // SYSTEM ITEMS
                    MARKET_ITEMS.map((item) => {
                        const currentStock = systemStock[item.id] !== undefined ? systemStock[item.id] : 999;
                        const isSoldOut = currentStock <= 0;
                        const currentQty = buyQuantities[item.id] || 1;
                        const totalCost = item.cost * currentQty;

                        return (
                        <div 
                            key={item.id} 
                            className={`
                                relative group rounded-xl bg-[#0f0f0f] border-2 transition-all duration-300 overflow-hidden flex flex-col
                                ${getRarityColor(item.rarity)}
                                ${isSoldOut ? 'opacity-60 grayscale' : 'hover:-translate-y-2 hover:shadow-2xl'}
                            `}
                        >
                            <div className="absolute top-0 left-0 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 z-20 font-mono">
                                SYSTEM
                            </div>
                            
                            {/* SOLD OUT OVERLAY */}
                            {isSoldOut && (
                                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-[2px]">
                                    <div className="border-4 border-red-600 text-red-600 font-black font-tech text-3xl px-4 py-2 -rotate-12 tracking-widest opacity-80">
                                        SOLD OUT
                                    </div>
                                </div>
                            )}

                            <div className="h-48 bg-gradient-to-b from-black/50 to-[#0f0f0f] flex items-center justify-center relative p-6 border-b border-white/5">
                                {/* Stock Quantity Badge (Updated style) */}
                                <div className={`absolute top-2 right-2 z-30 text-white font-black font-tech text-sm px-2 py-1 rounded shadow-lg border border-white/20 ${isSoldOut ? 'bg-red-600' : 'bg-purple-600'}`}>
                                    {isSoldOut ? 'SOLD' : `x${currentStock > 999 ? '999+' : currentStock}`}
                                </div>

                                {/* Buff/Debuff Badge */}
                                {renderTypeBadge(item.type)}

                                <div className="z-10 transform group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                    {getIcon(item.icon)}
                                </div>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold font-tech mb-2 tracking-wide">{item.name}</h3>
                                <p className="text-sm text-slate-400 font-mono leading-tight">{item.description}</p>
                                
                                {/* Compatible Games */}
                                {renderGameChips(item.compatibleGames)}
                                
                                <div className="mt-auto pt-4 border-t border-white/10">
                                    {/* Quantity Control */}
                                    <div className="flex items-center justify-center mb-3 bg-black/40 rounded border border-slate-700 p-1">
                                        <button 
                                            onClick={() => updateBuyQuantity(item.id, -1)}
                                            disabled={isSoldOut || currentQty <= 1}
                                            className="p-1 hover:text-white text-slate-500 disabled:opacity-30"
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <div className="w-12 text-center font-mono font-bold text-white">{currentQty}</div>
                                        <button 
                                            onClick={() => updateBuyQuantity(item.id, 1)}
                                            disabled={isSoldOut || currentQty >= currentStock}
                                            className="p-1 hover:text-white text-slate-500 disabled:opacity-30"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="text-yellow-500 font-bold font-mono text-lg">{totalCost} CR</div>
                                        <button 
                                            onClick={() => handleBuySystem(item)}
                                            disabled={tokens < totalCost || isSoldOut}
                                            className={`px-4 py-2 font-bold font-tech uppercase text-xs rounded transition-all flex items-center gap-2 ${tokens >= totalCost && !isSoldOut ? 'bg-white text-black hover:bg-purple-400' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                        >
                                            BUY
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )})
                ) : (
                    // P2P LISTINGS
                    listings.length === 0 ? (
                        <div className="col-span-4 text-center py-20 opacity-50">
                            <Users size={64} className="mx-auto mb-4 text-slate-600" />
                            <h3 className="text-xl font-tech text-slate-400">NO ACTIVE TRADES</h3>
                            <p className="font-mono text-slate-600">Be the first to list an item.</p>
                        </div>
                    ) : (
                        listings.map((listing) => (
                            <div 
                                key={listing.id} 
                                className={`
                                    relative group rounded-xl border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(234,88,12,0.2)] overflow-hidden flex flex-col
                                    ${getRarityColor(listing.item.rarity, true)}
                                `}
                            >
                                {/* Seller Badge */}
                                <div className="absolute top-0 left-0 right-0 flex justify-between px-3 py-2 z-20 bg-black/60 backdrop-blur-sm border-b border-orange-900/30">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-red-600"></div>
                                        <span className="text-xs font-mono text-orange-200 font-bold">{listing.seller}</span>
                                    </div>
                                    <span className="text-[9px] text-slate-500 font-mono uppercase">Verified</span>
                                </div>

                                <div className="h-40 bg-gradient-to-b from-[#1a0f05] to-[#0f0f0f] flex items-center justify-center relative p-6 mt-6 border-b border-orange-900/20">
                                    {/* Quantity Badge */}
                                    <div className="absolute top-2 right-2 z-30 bg-orange-600 text-white font-black font-tech text-sm px-2 py-1 rounded shadow-lg border border-white/20">
                                        x{listing.quantity}
                                    </div>

                                    {/* Buff/Debuff Badge */}
                                    {renderTypeBadge(listing.item.type)}

                                    <div className="z-10 transform group-hover:scale-110 transition-transform duration-300">
                                        {getIcon(listing.item.icon)}
                                    </div>
                                </div>
                                <div className="p-4 flex-1 flex flex-col bg-[#0a0a0a]">
                                    <h3 className="text-lg font-bold font-tech mb-1 text-slate-200">{listing.item.name}</h3>
                                    <p className="text-xs text-slate-500 font-mono mb-2 flex-1">Original Mint: Corp.System</p>
                                    
                                    {/* Compatible Games P2P */}
                                    {renderGameChips(listing.item.compatibleGames)}

                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-dashed border-slate-800">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-500 uppercase">Bundle Price</span>
                                            <div className="text-orange-400 font-bold font-mono text-lg">{listing.price} CR</div>
                                        </div>
                                        <button 
                                            onClick={() => handleBuyP2P(listing)}
                                            disabled={tokens < listing.price}
                                            className={`px-4 py-2 font-bold font-tech uppercase text-xs rounded transition-all flex items-center gap-2 ${tokens >= listing.price ? 'bg-orange-600 text-black hover:bg-orange-500' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                        >
                                            BUY NOW
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>
        </main>

        {/* SELL MODAL */}
        {isSellModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-[#111] border border-orange-900 w-full max-w-2xl rounded-xl shadow-[0_0_50px_rgba(234,88,12,0.15)] flex flex-col max-h-[80vh]">
                    <div className="p-6 border-b border-orange-900/30 flex justify-between items-center bg-[#1a0f05]">
                        <h2 className="text-2xl font-tech text-orange-500 flex items-center gap-3">
                            <Tag /> LIST ASSET FOR SALE
                        </h2>
                        <button onClick={() => setIsSellModalOpen(false)} className="text-slate-500 hover:text-white"><X /></button>
                    </div>
                    
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        {/* Inventory List */}
                        <div className="flex-1 overflow-y-auto p-6 border-r border-slate-800">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Select Item from Inventory</h3>
                            <div className="space-y-2">
                                {userInventory.length === 0 ? (
                                    <p className="text-center text-slate-600 font-mono py-10">Inventory Empty.</p>
                                ) : (
                                    userInventory.map((item, idx) => (
                                        <div 
                                            key={`${item.id}-${idx}`}
                                            onClick={() => {
                                                setSelectedSellItem(item);
                                                setSellQuantity(1);
                                                setSellPrice(item.cost); // Default to market price
                                            }}
                                            className={`p-3 rounded border cursor-pointer flex items-center justify-between group transition-all ${selectedSellItem?.id === item.id ? 'bg-orange-900/20 border-orange-500' : 'bg-[#0a0a0a] border-slate-800 hover:border-slate-600'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                 <div className="scale-75 text-slate-400">{getIcon(item.icon)}</div>
                                                 <div>
                                                     <div className="font-bold text-sm text-slate-200">{item.name}</div>
                                                     <div className="text-[10px] text-slate-500">{item.type}</div>
                                                 </div>
                                            </div>
                                            <div className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-400">x{item.quantity}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Price Settings */}
                        <div className="w-full md:w-72 bg-[#0a0a0a] p-6 flex flex-col justify-center">
                            {selectedSellItem ? (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="inline-block p-4 bg-[#111] rounded-full border border-orange-900/50 mb-2">
                                            {getIcon(selectedSellItem.icon)}
                                        </div>
                                        <h3 className="font-tech text-xl text-white">{selectedSellItem.name}</h3>
                                        <p className="text-xs text-slate-500">Market Avg: {selectedSellItem.cost} CR</p>
                                        <p className="text-xs text-orange-400 mt-1">Owned: {selectedSellItem.quantity}</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-orange-500 uppercase mb-2">Quantity to Sell</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            max={selectedSellItem.quantity}
                                            value={sellQuantity}
                                            onChange={(e) => setSellQuantity(Math.min(selectedSellItem.quantity, Math.max(1, parseInt(e.target.value))))}
                                            className="w-full bg-[#111] border border-orange-900/50 rounded p-3 text-right text-xl font-mono text-white focus:border-orange-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-orange-500 uppercase mb-2">Total Price (Tokens)</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                value={sellPrice}
                                                onChange={(e) => setSellPrice(parseInt(e.target.value))}
                                                className="w-full bg-[#111] border border-orange-900/50 rounded p-3 text-right text-xl font-mono text-white focus:border-orange-500 outline-none"
                                            />
                                            <span className="absolute left-3 top-4 text-slate-500 text-xs">CR</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleCreateListing}
                                        className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-black font-tech font-bold uppercase rounded shadow-[0_0_20px_rgba(234,88,12,0.3)] transition-all"
                                    >
                                        CONFIRM LISTING
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center text-slate-600">
                                    <ShoppingCart size={40} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-sm font-mono">Select an item to set price.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default GlobalMarket;