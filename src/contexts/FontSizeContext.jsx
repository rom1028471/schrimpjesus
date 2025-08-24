import { createContext, useContext, useState, useEffect } from 'react';

const FontSizeContext = createContext();

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
};

export const FontSizeProvider = ({ children }) => {
  const [fontSize, setFontSize] = useState(1.02); // Текущий размер шрифта в rem
  
  const MIN_FONT_SIZE = 0.9;
  const MAX_FONT_SIZE = 1.5;
  const FONT_STEP = 0.05;

  useEffect(() => {
    // Загружаем сохраненный размер шрифта
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
      const size = parseFloat(savedFontSize);
      if (size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE) {
        setFontSize(size);
      }
    }
  }, []);

  useEffect(() => {
    // Применяем размер шрифта к документу
    document.documentElement.style.setProperty('--font-size', `${fontSize}rem`);
    localStorage.setItem('fontSize', fontSize.toString());
  }, [fontSize]);

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + FONT_STEP, MAX_FONT_SIZE));
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - FONT_STEP, MIN_FONT_SIZE));
  };

  const getFontSizePercent = () => {
    const range = MAX_FONT_SIZE - MIN_FONT_SIZE;
    const current = fontSize - MIN_FONT_SIZE;
    return Math.round((current / range) * 100);
  };

  return (
    <FontSizeContext.Provider value={{
      fontSize,
      increaseFontSize,
      decreaseFontSize,
      getFontSizePercent,
      MIN_FONT_SIZE,
      MAX_FONT_SIZE
    }}>
      {children}
    </FontSizeContext.Provider>
  );
}; 