import { createContext, useContext, useState } from 'react';

const SoundContext = createContext();

export const useSound = () => useContext(SoundContext);

export const SoundProvider = ({ children }) => {
  // Звук всегда включен при загрузке, громкость 1
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  
  return (
    <SoundContext.Provider value={{ muted, setMuted, volume, setVolume }}>
      {children}
    </SoundContext.Provider>
  );
}; 