import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Crosshair, Radio, ShoppingCart, PlusCircle, Coins, Lock, AlertTriangle } from 'lucide-react';
import { RoomData, UserProfile } from '../types';
import { userStore } from '../services/userStore';

const Hub: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  
  // Create Room State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomFee, setNewRoomFee] = useState(100);
  const [newRoomTitle, setNewRoomTitle] = useState("Alien Defense");

  const refreshData = () => {
      setRooms(userStore.getRooms());
      setUserData(userStore.getData() as any);
  };

  useEffect(() => {
    refreshData();
    
    // Auto-refresh rooms every 5s to see pool updates
    const interval = setInterval(() => {
        refreshData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = () => {
      const roomId = userStore.createRoom("Me_Streamer", newRoomTitle, "Join the battle! Pool prizes enabled.", newRoomFee);
      navigate(`/room/${roomId}?host=true`);
  };

  const handleJoinRoom = (roomId: string, fee: number) => {
      const currentUserData = userStore.getData(); // Get fresh data
      
      if (currentUserData.tokens < fee) {
          alert(`Insufficient Funds! You have ${currentUserData.tokens} tokens, but need ${fee}.`);
          return;
      }
      
      // Direct join without blocking confirmation for better UX
      const result = userStore.joinRoom(roomId);
      if (result.success) {
          refreshData(); 
          navigate(`/room/${roomId}`);
      } else {
          alert(result.msg);
      }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-green-500 selection:text-black">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none opacity-20" 
           style={{backgroundImage: 'radial-gradient(circle at 50% 50%, #1a2e1a 0%, #000 70%)'}}>
      </div>
      
      {/* Absolute Balance Display */}
      {userData && (
         <div className="fixed top-6 right-8 z-50 flex items-center gap-2 bg-black/80 backdrop-blur px-4 py-2 rounded-full border border-yellow-900/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            <Coins size={16} className="text-yellow-500" />
            <span className="text-sm font-mono font-bold text-yellow-500">{userData.tokens.toLocaleString()} CR</span>
         </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <header className="mb-12 flex flex-col items-center relative">
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-green-400 to-green-800 mb-6 font-tech tracking-tighter drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">
            STREAM VERSE
          </h1>
          
          <div className="flex gap-4">
              <Link to="/market" className="px-6 py-3 bg-purple-900/30 border border-purple-500 rounded flex items-center gap-2 hover:bg-purple-900/50 transition-all">
                  <ShoppingCart className="text-purple-400" size={18} />
                  <span className="font-bold text-purple-200 font-tech">MARKETPLACE</span>
              </Link>
              
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-green-900/30 border border-green-500 rounded flex items-center gap-2 hover:bg-green-900/50 transition-all"
              >
                  <PlusCircle className="text-green-400" size={18} />
                  <span className="font-bold text-green-200 font-tech">CREATE ROOM</span>
              </button>
          </div>
        </header>

        <section>
          <div className="flex items-center justify-between mb-8 border-l-4 border-green-600 pl-4">
            <div className="flex items-center gap-3">
              <Radio className="text-red-500 animate-pulse w-6 h-6" />
              <h2 className="text-2xl font-bold text-white font-tech tracking-wide">LIVE WARZONES</h2>
            </div>
            <span className="text-sm font-mono text-slate-500 animate-pulse">{rooms.length} Active Feeds</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {rooms.map((room) => (
              <div 
                key={room.id} 
                className="group cursor-pointer"
              >
                <article 
                  onClick={() => handleJoinRoom(room.id, room.entryFee)}
                  className="bg-[#0a0a0a] rounded border border-green-900/30 hover:border-green-500/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(22,163,74,0.2)] overflow-hidden relative"
                >
                  {/* Card Image */}
                  <div className="relative h-56">
                    <img 
                      src={room.thumbnailUrl} 
                      alt={room.gameTitle} 
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all grayscale group-hover:grayscale-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                    
                    <div className="absolute top-2 left-2 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm flex items-center gap-1 uppercase tracking-wider shadow z-10">
                      <Radio size={10} /> Live
                    </div>
                    <div className="absolute top-2 right-2 bg-yellow-500/90 text-black text-[10px] font-bold px-2 py-0.5 rounded-sm flex items-center gap-1 shadow z-10">
                       <Coins size={10} /> Fee: {room.entryFee}
                    </div>
                    
                    {/* Pool Display on Card */}
                    <div className="absolute bottom-4 left-0 right-0 text-center z-10">
                        <div className="inline-block bg-black/80 backdrop-blur border border-yellow-500/50 px-4 py-1 rounded-full">
                            <div className="text-[10px] text-yellow-500 uppercase font-bold tracking-widest">Prize Pool</div>
                            <div className="text-xl font-tech font-black text-white text-shadow-neon">{room.currentPool.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* INTERACTIVE OVERLAY */}
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                       <div className="w-16 h-16 rounded-full border-2 border-green-500 flex items-center justify-center mb-4 transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-75 pointer-events-none">
                          <Lock className="text-green-500 w-8 h-8" />
                       </div>
                       
                       <div className="bg-green-600 hover:bg-green-500 text-black font-bold px-6 py-3 rounded shadow-[0_0_15px_rgba(22,163,74,0.5)] transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-100 hover:scale-105 active:scale-95 font-tech pointer-events-none">
                           PAY TO JOIN
                       </div>
                    </div>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-5 relative">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="relative">
                        <img src={room.avatarUrl} alt={room.hostName} className="w-12 h-12 rounded border border-slate-600" />
                        <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-black"></div>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white font-tech leading-none mb-1 group-hover:text-green-400 transition-colors">
                          {room.gameTitle}
                        </h3>
                        <p className="text-xs text-green-600 font-mono uppercase">{room.hostName}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500 border-t border-slate-800 pt-3">
                       <span className="flex items-center gap-1"><Users size={12} /> {room.viewers} Viewers</span>
                       <span className="text-slate-400">{room.id}</span>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </section>

        {/* Create Room Modal */}
        {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-[#111] border border-green-500 w-full max-w-md rounded-xl shadow-[0_0_50px_rgba(22,163,74,0.2)] p-6">
                    <h2 className="text-2xl font-tech text-white mb-6 border-b border-green-900 pb-2">HOST A GAME ROOM</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-mono text-green-400 mb-1">GAME TITLE</label>
                            <input 
                                type="text" 
                                value={newRoomTitle}
                                onChange={e => setNewRoomTitle(e.target.value)}
                                className="w-full bg-black border border-slate-700 p-2 text-white focus:border-green-500 outline-none rounded"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-mono text-yellow-400 mb-1">ENTRY FEE (TOKENS)</label>
                            <input 
                                type="number" 
                                value={newRoomFee}
                                onChange={e => setNewRoomFee(parseInt(e.target.value))}
                                className="w-full bg-black border border-slate-700 p-2 text-white focus:border-yellow-500 outline-none rounded"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">100 Tokens ≈ $1. This fee goes directly into the Prize Pool.</p>
                        </div>

                        <div className="bg-slate-900 p-3 rounded border border-slate-700 text-xs text-slate-400">
                            <p className="mb-1"><strong className="text-white">Rule:</strong> Prize Pool Distribution</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>10% Platform Fee</li>
                                <li>10% Streamer Guaranteed</li>
                                <li>80% Win/Loss Pot (Streamer +20% or Enemy Team)</li>
                            </ul>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded">CANCEL</button>
                            <button onClick={handleCreateRoom} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-black font-bold font-tech rounded">CREATE & GO LIVE</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Hub;