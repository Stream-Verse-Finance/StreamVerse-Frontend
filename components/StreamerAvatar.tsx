import React from 'react';

interface StreamerAvatarProps {
  image: string;
  name: string;
  reaction: string;
  isSpeaking: boolean;
}

const StreamerAvatar: React.FC<StreamerAvatarProps> = ({ image, name, reaction, isSpeaking }) => {
  return (
    <div className="absolute top-4 left-4 flex items-start space-x-3 max-w-[80%] z-20 pointer-events-none">
      <div className="relative">
        <img 
          src={image} 
          alt={name} 
          className={`w-16 h-16 rounded-full border-2 ${isSpeaking ? 'border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'border-slate-500'} object-cover`}
        />
        <div className="absolute -bottom-1 -right-1 bg-red-600 text-xs text-white px-1 rounded font-bold">
          LIVE
        </div>
      </div>
      
      {reaction && (
        <div className={`
          bg-white/90 text-slate-900 p-3 rounded-2xl rounded-tl-none shadow-lg backdrop-blur-sm
          transform transition-all duration-300 origin-top-left
          ${isSpeaking ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}
        `}>
          <p className="font-bold text-sm text-indigo-800 mb-0.5">{name}</p>
          <p className="font-medium text-sm leading-snug">{reaction}</p>
        </div>
      )}
    </div>
  );
};

export default StreamerAvatar;