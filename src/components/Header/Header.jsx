import './Header.css';
import { useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const Header = ({ title, subtitle, showBack = false, onBack, isOpen = true, children }) => {
  const { isDark, toggleTheme, isTransitioning } = useTheme();
  const themeBtnRef = useRef(null);

  return (
    <header
      className={`app-header${isOpen ? ' open' : ' closed'}${isTransitioning ? ' theme-transitioning' : ''}`}
      aria-hidden={!isOpen}
    >
      <div className="header-content">
        {showBack && (
          <button className="back-button" onClick={onBack}>
            ← Назад
          </button>
        )}
        
        <div className="header-text">
          <h1 className="header-title">{title}</h1>
        </div>
        
        <div className="header-actions">
          <button
            className="theme-toggle-btn"
            ref={themeBtnRef}
            aria-label="Сменить тему"
            onClick={() => toggleTheme(themeBtnRef.current)}
          >
            {isDark ? '◐' : '◑'}
          </button>
        </div>
        
        {children}
      </div>
    </header>
  );
};

export default Header;
