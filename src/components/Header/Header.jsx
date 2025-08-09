import './Header.css';
import { useRef, useState, useEffect } from 'react';

// Флаг для отслеживания touch на ползунке громкости
let isTouchingVolumeSlider = false;
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import Portal from '../Portal.jsx';

const Header = ({ title, subtitle, showBack = false, onBack, isOpen = true, children, showVolumeControl = false }) => {
  const { isDark, toggleTheme, isTransitioning } = useTheme();
  const themeBtnRef = useRef(null);
  const { muted, setMuted, volume, setVolume } = useSound();
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeSliderRef = useRef(null);
  const volumeBtnRef = useRef(null);

  // Навешиваем нативный touchmove с passive: false для блокировки скролла
  useEffect(() => {
    const slider = volumeSliderRef.current?.querySelector('input[type="range"]');
    if (!slider) return;
    const handleTouchStart = () => { isTouchingVolumeSlider = true; };
    const handleTouchEnd = () => { isTouchingVolumeSlider = false; };
    const handleTouchMove = (e) => {
      if (isTouchingVolumeSlider) e.preventDefault();
    };
    slider.addEventListener('touchstart', handleTouchStart, { passive: false });
    slider.addEventListener('touchend', handleTouchEnd, { passive: false });
    slider.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      slider.removeEventListener('touchstart', handleTouchStart);
      slider.removeEventListener('touchend', handleTouchEnd);
      slider.removeEventListener('touchmove', handleTouchMove);
    };
  }, [showVolumeSlider]);

  // Закрытие слайдера при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Не закрывать, если клик по кнопке громкости
      if (volumeBtnRef.current && volumeBtnRef.current.contains(event.target)) return;
      if (volumeSliderRef.current && !volumeSliderRef.current.contains(event.target)) {
        setShowVolumeSlider(false);
      }
    };

    if (showVolumeSlider) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showVolumeSlider]);

  // Общий стиль для кнопок
  const buttonStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)'
  };

  const buttonHoverStyle = {
    background: 'rgba(255, 255, 255, 0.2)',
    transform: 'scale(1.05)'
  };

  return (
    <header
      className={`app-header${isOpen ? ' open' : ' closed'}${isTransitioning ? ' theme-transitioning' : ''}`}
      aria-hidden={!isOpen}
    >
      <div className="header-content">
        {showBack && (
          <button className="back-button" onClick={onBack}>
  <span className="button-multiline">
    <span>Назад</span>
    <span>←</span>
  </span>
</button>
        )}
        
        <div className="header-text">
          {typeof window !== 'undefined' && window.innerWidth <= 480 ? (
  <h1 className="header-title">
    {title.split(' ').map((word, idx) => (
      <span key={idx} style={{ display: 'block' }}>{word}</span>
    ))}
  </h1>
) : (
  <h1 className="header-title">{title}</h1>
)}
        </div>
        
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="theme-toggle-btn"
            ref={themeBtnRef}
            aria-label="Сменить тему"
            onClick={() => toggleTheme(themeBtnRef.current)}
            style={buttonStyle}
            onMouseEnter={(e) => Object.assign(e.target.style, buttonHoverStyle)}
            onMouseLeave={(e) => Object.assign(e.target.style, buttonStyle)}
          >
            {isDark ? '◐' : '◑'}
          </button>
          
          {/* Показываем кнопки звука только если разрешен контроль громкости */}
          {showVolumeControl && (
            <>
              <button
                className="sound-toggle-btn"
                aria-label="Вкл/Выкл звук"
                onClick={() => setMuted(m => !m)}
                style={buttonStyle}
                onMouseEnter={(e) => Object.assign(e.target.style, buttonHoverStyle)}
                onMouseLeave={(e) => Object.assign(e.target.style, buttonStyle)}
              >
                {muted ? '🔇' : '🔊'}
              </button>
              
              {/* Кнопка для вертикального слайдера */}
              <div 
                className="volume-control-container" 
                style={{ position: 'relative' }}
                ref={volumeSliderRef}
              >
                <button
                  className="volume-control-btn"
                  aria-label="Настройка громкости"
                  aria-pressed={showVolumeSlider}
                  ref={volumeBtnRef}
                  onClick={() => setShowVolumeSlider(v => !v)}
                  style={buttonStyle}
                  onMouseEnter={(e) => Object.assign(e.target.style, buttonHoverStyle)}
                  onMouseLeave={(e) => Object.assign(e.target.style, buttonStyle)}
                >
                  🎚️
                </button>
                
                {/* Вертикальный слайдер */}
                <Portal>
                {showVolumeSlider && (
                  <div 
                    className="vertical-volume-slider"
                    style={{
                      position: 'fixed',
                      top: '100px', // чуть ниже хедера
                      right: '40px',
                      background: 'var(--bg-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '12px 8px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
                      zIndex: 2147483647,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minHeight: '120px',
                      minWidth: '44px',
                      marginTop: 0
                    }}
                    ref={volumeSliderRef}
                  >
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={e => setVolume(Number(e.target.value))}
                      style={{
                        writingMode: 'vertical-lr',
                        direction: 'rtl',
                        width: '20px',
                        height: '100px',
                        background: 'linear-gradient(to top, #6a11cb 0%, #2575fc 100%)',
                        outline: 'none',
                        appearance: 'none',
                        zIndex: 2147483647
                      }}
                      aria-label="Громкость"
                    />
                    <span style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-color)' }}>
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                )}
                </Portal>
              </div>
            </>
          )}
        </div>
        
        {children}
      </div>
    </header>
  );
};

export default Header;

