
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import GameCanvas, { GameRef } from '../components/GameCanvas';
import StreamerAvatar from '../components/StreamerAvatar';
import Marketplace from '../components/Marketplace';
import { GameEvent, EventType, ChatMessage, UserProfile, UserRole, InventoryItem, RoomData, GameResultDistribution } from '../types';
import { generateStreamerReaction } from '../services/geminiService';
import { userStore } from '../services/userStore';
import { Crosshair, Coins, ChevronLeft, Gamepad2, Eye, ShoppingCart, Trophy, AlertTriangle } from 'lucide-react';

type PendingAction = {
    type: 'EVENT' | 'ITEM';
    eventType?: EventType;
    item?: InventoryItem;
    cost?: number;
    label?: string;
}

const GameRoom: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isHost = searchParams.get('host') === 'true';
  const navigate = useNavigate();
  const gameRef = useRef<GameRef>(null);
  
  // Game/Room State
  const [room, setRoom] = useState<RoomData | null>(null);
  const [pool, setPool] = useState(0);
  const [gameResult, setGameResult] = useState<GameResultDistribution | null>(null);

  // User State
  const [user, setUser] = useState<UserProfile>({ 
    username: "Guest_Commander", 
    tokens: 0, 
    role: isHost ? 'STREAMER' : 'VIEWER',
    inventory: [] 
  });
  
  // Game UI State
  const [health, setHealth] = useState(100);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  
  // Interaction State
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showInventory, setShowInventory] = useState(true); 
  const [targetingAction, setTargetingAction] = useState<PendingAction | null>(null);
  
  // AI Streamer
  const [reaction, setReaction] = useState("Get to battle stations! The Aliens are coming!");
  const [isAiSpeaking, setIsAiSpeaking] = useState(true);

  // Initialize Room & User
  useEffect(() => {
     if (!id) return;
     const r = userStore.getRoom(id);
     if (!r) {
         navigate('/');
         return;
     }
     setRoom(r);
     setPool(r.currentPool);

     const data = userStore.getData();
     setUser(prev => ({
         ...prev,
         tokens: data.tokens,
         inventory: data.inventory,
         role: isHost ? 'STREAMER' : 'VIEWER' // Force role based on URL for demo
     }));

     // Poll for pool updates
     const interval = setInterval(() => {
         const updatedRoom = userStore.getRoom(id);
         if (updatedRoom) {
             setPool(updatedRoom.currentPool);
             // If game ended elsewhere? (Not implemented in this single-client demo but good practice)
         }
     }, 3000);
     return () => clearInterval(interval);
  }, [id, isHost, navigate]);

  const addEvent = (event: GameEvent) => {
    setEvents(prev => [event, ...prev].slice(0, 10));
    triggerAiReaction(event);
  };

  const addChat = (user: string, text: string, isSystem = false) => {
    setChatMessages(prev => [...prev, {
      id: Math.random().toString(),
      user,
      text,
      isSystem
    }].slice(-20));
  };

  const triggerAiReaction = async (event: GameEvent) => {
    setIsAiSpeaking(false);
    setTimeout(async () => {
      const text = await generateStreamerReaction(event, health, score);
      setReaction(text);
      setIsAiSpeaking(true);
      setTimeout(() => setIsAiSpeaking(false), 5000);
    }, 800);
  };

  const initiateUseItem = (item: InventoryItem) => {
     if (isGameOver) return;
     setTargetingAction({
         type: 'ITEM',
         item: item
     });
  };

  const initiateAction = (type: EventType, cost: number, label: string) => {
     if (isGameOver) return;
     if (user.role === 'VIEWER' && user.tokens < cost) {
         addChat("SYSTEM", "Warning: Not enough Bio-Tokens!", true);
         return;
     }
     
     setTargetingAction({
         type: 'EVENT',
         eventType: type,
         cost,
         label
     });
  };

  const executeAction = (x: number, y: number) => {
     if (!targetingAction || !id) return;

     if (targetingAction.type === 'ITEM' && targetingAction.item) {
         const item = targetingAction.item;
         
         // Use Item via Store
         const usedItem = userStore.useItem(item.id);
         
         if (usedItem) {
             // Effect
             gameRef.current?.triggerEffect(item.effectId, x, y);
             
             // Update Local State
             const newData = userStore.getData();
             setUser(prev => ({ ...prev, inventory: newData.inventory }));

             // ADD TO POOL logic for items (Value of item goes to pool? 
             // Prompt says: "một lượng tiền tương ứng với giá trị của NFT sẽ được gửi vào pool thưởng")
             userStore.addToPool(id, user.username, item.cost, item.type);
             setPool(prev => prev + item.cost); // Optimistic update

             addEvent({
               id: Date.now().toString(),
               type: EventType.USE_SPECIAL_ITEM,
               user: user.username,
               message: `Deployed NFT: ${item.name}`,
               timestamp: Date.now(),
               itemId: item.id,
               targetX: x,
               targetY: y
             });
         } else {
             addChat("SYSTEM", "Error: Item does not exist.", true);
         }

     } else if (targetingAction.type === 'EVENT' && targetingAction.eventType) {
         // Standard event logic
         let success = true;
         if (user.role === 'VIEWER') {
             success = userStore.deductTokens(targetingAction.cost || 0);
             if (success) {
                 const newData = userStore.getData();
                 setUser(prev => ({ ...prev, tokens: newData.tokens }));
                 
                 // Add to Pool
                 const isEnemy = targetingAction.eventType === EventType.SPAWN_ENEMY || targetingAction.eventType === EventType.SPAWN_BOSS;
                 userStore.addToPool(id, user.username, targetingAction.cost || 0, isEnemy ? 'ENEMY' : 'SUPPORT');
                 setPool(prev => prev + (targetingAction.cost || 0));
             }
         }
         
         if (success) {
             const type = targetingAction.eventType;
             switch (type) {
               case EventType.SPAWN_ENEMY: gameRef.current?.spawnEnemy(false, 3, x, y); break;
               case EventType.SPAWN_BOSS: gameRef.current?.spawnEnemy(true, 1, x, y); break;
               case EventType.GIVE_HEALTH: gameRef.current?.healPlayer(20); break; 
               case EventType.GIVE_WEAPON: gameRef.current?.upgradeWeapon(); break; 
             }
         
             addEvent({
               id: Date.now().toString(),
               type: type,
               user: user.role === 'STREAMER' ? 'ADMIN' : user.username,
               message: targetingAction.label || "Action",
               cost: user.role === 'VIEWER' ? targetingAction.cost : 0,
               timestamp: Date.now(),
               targetX: x,
               targetY: y
             });
         } else {
             addChat("SYSTEM", "Transaction failed. Not enough Tokens.", true);
         }
     }

     setTargetingAction(null);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    addChat(user.username, chatInput);
    setChatInput("");
  };

  const handleGameOver = useCallback(() => {
    if(!id) return;
    setIsGameOver(true);
    setReaction("FALLEN! Base overrun! Calculating losses...");
    setIsAiSpeaking(true);

    // Calculate Results (Streamer Lost)
    const result = userStore.concludeGame(id, false);
    setGameResult(result);

  }, [id]);

  // For testing/demo: Streamer can manually trigger "Win"
  const handleVictory = () => {
      if(!id) return;
      setIsGameOver(true);
      setReaction("VICTORY! The swarm is defeated!");
      setIsAiSpeaking(true);
      const result = userStore.concludeGame(id, true);
      setGameResult(result);
  };

  if (!room) return <div className="text-white">Loading Room...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans">
      <div className="scanline"></div>

      {/* Header */}
      <header className="h-14 border-b border-green-900/50 flex items-center px-4 justify-between bg-[#0a0a0a] z-20 shadow-lg">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-green-600 hover:text-green-400 flex items-center gap-1 font-mono text-sm uppercase">
            <ChevronLeft size={16} /> EXIT ROOM
          </Link>
          <div className="flex flex-col">
              <h1 className="font-tech font-bold text-lg text-white tracking-wider flex items-center gap-2">
                {room.gameTitle}
              </h1>
              <span className="text-[10px] text-slate-500 font-mono">HOST: {room.hostName}</span>
          </div>
        </div>
        
        {/* POOL DISPLAY */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1 bg-black/80 border border-yellow-500/50 px-6 py-1 rounded-b-xl shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            <div className="text-[10px] text-yellow-500 font-bold uppercase text-center tracking-widest">Current Prize Pool</div>
            <div className="text-2xl font-black font-tech text-white text-center flex items-center justify-center gap-2">
                <Coins className="text-yellow-400" size={20} />
                {pool.toLocaleString()}
            </div>
        </div>

        {user.role === 'VIEWER' && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-black/50 border border-yellow-600/30 px-3 py-1 rounded text-yellow-500">
                <Coins size={16} />
                <span className="font-mono font-bold text-lg">{user.tokens.toLocaleString()}</span>
            </div>
            <Link 
              to="/market"
              className="flex items-center gap-2 px-3 py-1 rounded text-sm font-bold border bg-purple-900/20 text-purple-400 border-purple-900 hover:bg-purple-900/40"
            >
              <ShoppingCart size={16} /> GET NFTs
            </Link>
          </div>
        )}
        {user.role === 'STREAMER' && !isGameOver && (
             <button onClick={handleVictory} className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-500">TRIGGER VICTORY</button>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden z-10">
        {/* GAME AREA */}
        <div className="flex-1 relative bg-black flex flex-col">
           {/* Classic Retro HUD (Bottom Overlay) */}
           <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none flex items-end justify-center pb-4 px-10 gap-10">
              <div className="relative">
                 <div className="w-40 h-6 bg-red-950/80 border border-red-800 skew-x-[-20deg] overflow-hidden">
                    <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${health}%` }}></div>
                 </div>
                 <div className="absolute -top-6 left-0 text-red-500 font-tech text-xl font-bold tracking-widest">HEALTH {Math.max(0, Math.floor(health))}</div>
              </div>

              <div className="flex flex-col items-center mb-1">
                 <div className="text-yellow-400 font-tech text-2xl tracking-[0.2em] drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                    {score.toString().padStart(6, '0')}
                 </div>
                 <div className="text-[10px] text-yellow-700 font-mono">CONFIRMED KILLS</div>
              </div>

              <div className="relative">
                 <div className="w-40 h-6 bg-blue-950/80 border border-blue-800 skew-x-[20deg] overflow-hidden">
                    <div className="h-full bg-blue-500 w-3/4"></div>
                 </div>
                 <div className="absolute -top-6 right-0 text-blue-500 font-tech text-xl font-bold tracking-widest">PLASMA</div>
              </div>
           </div>

           {/* Targeting Overlay for Viewer */}
           {targetingAction && (
               <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/80 border border-red-500 text-white px-4 py-2 rounded z-40 animate-pulse pointer-events-none">
                   <div className="flex items-center gap-2 font-tech">
                       <Crosshair size={20} />
                       CLICK ON MAP TO DEPLOY {targetingAction.label || targetingAction.item?.name}
                   </div>
                   <div className="text-[10px] text-center mt-1">(Click anywhere to cancel)</div>
               </div>
           )}

           {/* GAME OVER & RESULTS SCREEN */}
           {isGameOver && (
             <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto p-8">
               {gameResult ? (
                   <div className="w-full max-w-2xl bg-[#111] border-2 border-yellow-600 rounded-xl p-8 shadow-[0_0_50px_rgba(234,179,8,0.2)]">
                       <div className="text-center mb-8">
                           <h2 className={`text-6xl font-tech font-bold drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] mb-2 tracking-widest ${gameResult.winningTeam === 'SUPPORT' ? 'text-green-500' : 'text-red-500'}`}>
                               {gameResult.winningTeam === 'SUPPORT' ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED'}
                           </h2>
                           <p className="text-xl font-mono text-slate-400">
                               WINNER: {gameResult.winningTeam === 'SUPPORT' ? 'STREAMER & SUPPORT' : 'ENEMY FACTION'}
                           </p>
                       </div>

                       <div className="grid grid-cols-2 gap-8 mb-8">
                           <div className="bg-slate-900 p-4 rounded border border-slate-700">
                               <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Total Pool</h3>
                               <p className="text-3xl font-tech text-white">{gameResult.totalPool.toLocaleString()} CR</p>
                           </div>
                           <div className="bg-slate-900 p-4 rounded border border-slate-700">
                               <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">MVP (Most Contributed/Damage)</h3>
                               <p className="text-xl font-tech text-yellow-400">{gameResult.mvpUser}</p>
                           </div>
                       </div>

                       <div className="space-y-3 mb-8">
                           <h3 className="text-sm font-bold text-slate-400 uppercase border-b border-slate-800 pb-1">Payout Distribution</h3>
                           <div className="flex justify-between items-center text-sm">
                               <span className="text-slate-500">Platform Fee (10%)</span>
                               <span className="font-mono text-slate-300">{gameResult.platformFee.toLocaleString()}</span>
                           </div>
                           <div className="flex justify-between items-center text-sm">
                               <span className="text-slate-500">Streamer Base (10%)</span>
                               <span className="font-mono text-slate-300">{gameResult.streamerBase.toLocaleString()}</span>
                           </div>
                           <div className="flex justify-between items-center text-sm">
                               <span className={gameResult.winningTeam === 'SUPPORT' ? "text-green-500 font-bold" : "text-slate-500"}>
                                   Streamer Win Bonus (20%)
                               </span>
                               <span className="font-mono text-white">{gameResult.streamerBonus.toLocaleString()}</span>
                           </div>
                           <div className="flex justify-between items-center text-lg font-bold bg-slate-800 p-2 rounded">
                               <span className={gameResult.winningTeam === 'SUPPORT' ? "text-green-400" : "text-red-400"}>
                                   {gameResult.winningTeam} TEAM SHARE ({gameResult.winningTeam === 'SUPPORT' ? '60%' : '80%'})
                               </span>
                               <span className="font-mono text-white">{gameResult.teamPool.toLocaleString()}</span>
                           </div>
                       </div>

                       <div className="text-center">
                           <button onClick={() => navigate('/')} className="bg-yellow-600 hover:bg-yellow-500 text-black px-8 py-3 font-tech uppercase font-bold rounded">
                               RETURN TO HUB
                           </button>
                       </div>
                   </div>
               ) : (
                   <div className="text-white font-mono animate-pulse">Calculating Blockchain Payouts...</div>
               )}
             </div>
           )}
           
           <StreamerAvatar image={room.avatarUrl} name={room.hostName} reaction={reaction} isSpeaking={isAiSpeaking} />
           
           <div 
             className="w-full h-full relative border-[20px] border-[#0a0a0a]"
           > 
             <GameCanvas 
                ref={gameRef}
                role={user.role}
                onHealthChange={setHealth}
                onScoreChange={setScore}
                onGameOver={handleGameOver}
                isTargeting={!!targetingAction}
                onLocationSelect={executeAction}
             />
           </div>
        </div>

        {/* RIGHT PANEL */}
        {user.role === 'VIEWER' && (
          <div className="w-96 bg-[#0c0c0c] border-l border-green-900/30 flex flex-col shadow-2xl relative z-30">
            {showInventory ? (
              <>
                  <Marketplace 
                    inventory={user.inventory}
                    onUse={initiateUseItem}
                  />
                  
                  {/* Quick Basic Actions (Fallback) */}
                  <div className="p-3 bg-[#111] border-t border-b border-green-900/30">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Standard Support</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => initiateAction(EventType.SPAWN_ENEMY, 50, "Spawn Swarm")} 
                            disabled={!!targetingAction}
                            className={`bg-red-950/20 hover:bg-red-900/40 border border-red-900/50 p-1.5 rounded text-left group ${targetingAction ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                           <div className="text-[10px] text-red-500 font-bold">50 CR</div>
                           <div className="text-[10px] text-red-300 font-tech">SPAWN SWARM</div>
                        </button>
                        <button 
                            onClick={() => initiateAction(EventType.GIVE_HEALTH, 100, "Drop Medkit")} 
                            className="bg-green-950/20 hover:bg-green-900/40 border border-green-900/50 p-1.5 rounded text-left group"
                        >
                           <div className="text-[10px] text-green-500 font-bold">100 CR</div>
                           <div className="text-[10px] text-green-300 font-tech">DROP MEDKIT</div>
                        </button>
                    </div>
                  </div>
              </>
            ) : null}

             {/* Event Log & Chat (Always Visible below inventory) */}
             <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-4 bg-black/40 border-b border-green-900/30">
                   <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Battle Log</h3>
                   <div className="space-y-2">
                     {events.map(ev => (
                       <div key={ev.id} className="text-xs flex gap-2">
                         <span className="text-slate-600 font-mono">[{new Date(ev.timestamp).getSeconds()}]</span>
                         <span className="text-green-400">{ev.user}: {ev.message}</span>
                       </div>
                     ))}
                   </div>
                </div>

                <div className="h-40 flex flex-col bg-[#0f0f0f]">
                  <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {chatMessages.map(msg => (
                      <div key={msg.id} className="text-xs break-words">
                        <span className="font-bold text-slate-400">{msg.user}:</span> <span className="text-slate-300">{msg.text}</span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleChatSubmit} className="p-2 border-t border-slate-800">
                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type msg..." className="w-full bg-black border border-slate-700 px-2 py-1 text-xs text-white focus:border-green-500 outline-none" />
                  </form>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameRoom;