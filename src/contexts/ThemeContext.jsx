import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Загружаем сохраненную тему
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    }
  }, []);

  useEffect(() => {
    // Применяем тему к документу
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = (buttonElement) => {
    setIsTransitioning(true);
    
    // Получаем позицию кнопки для анимации
    const rect = buttonElement.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // Создаем анимированный переход
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: ${y}px;
      left: ${x}px;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: ${isDark ? 'linear-gradient(135deg, #f8fafc, #e2e8f0)' : 'linear-gradient(135deg, #0f172a, #1e293b)'};
      z-index: 9999;
      pointer-events: none;
      transform: translate(-50%, -50%);
      transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    document.body.appendChild(overlay);

    // Запускаем анимацию
    requestAnimationFrame(() => {
      const diagonal = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2);
      overlay.style.width = `${diagonal * 2}px`;
      overlay.style.height = `${diagonal * 2}px`;
    });

    // Переключаем тему в середине анимации
    setTimeout(() => {
      setIsDark(!isDark);
    }, 300);

    // Убираем overlay после анимации
    setTimeout(() => {
      document.body.removeChild(overlay);
      setIsTransitioning(false);
    }, 600);
  };

  return (
    <ThemeContext.Provider value={{
      isDark,
      toggleTheme,
      isTransitioning
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
