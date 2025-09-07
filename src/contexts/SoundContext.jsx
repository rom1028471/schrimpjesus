import { createContext, useContext, useState, useEffect } from 'react';

const SoundContext = createContext();

export const useSound = () => useContext(SoundContext);

export const SoundProvider = ({ children }) => {
  // Звук всегда включен при загрузке, громкость 1
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  
  // Контроль видимости страницы - автоматически ставим на паузу при сворачивании
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Страница скрыта - ставим на паузу
        setMuted(true);
      } else {
        // Страница видна - возобновляем воспроизведение
        setMuted(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  return (
    <SoundContext.Provider value={{ muted, setMuted, volume, setVolume }}>
      {children}
    </SoundContext.Provider>
  );
}; 