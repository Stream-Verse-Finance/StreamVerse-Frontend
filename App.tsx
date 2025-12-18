
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Hub from './pages/Hub';
import GameRoom from './pages/GameRoom';
import GlobalMarket from './pages/GlobalMarket';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="antialiased text-slate-100 selection:bg-blue-500 selection:text-white">
        <Routes>
          <Route path="/" element={<Hub />} />
          <Route path="/market" element={<GlobalMarket />} />
          <Route path="/room/:id" element={<GameRoom />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
