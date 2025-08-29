import './Header.css';
import { useRef, useState, useEffect } from 'react';

// Флаг для отслеживания touch на ползунке громкости
let isTouchingVolumeSlider = false;
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { useFontSize } from '../../contexts/FontSizeContext';
import Portal from '../Portal.jsx';

const Header = ({ title, subtitle, showBack = false, onBack, isOpen = true, children, showVolumeControl = false }) => {
  const { isDark, toggleTheme, isTransitioning } = useTheme();
  const themeBtnRef = useRef(null);
  const { muted, setMuted, volume, setVolume } = useSound();
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeSliderRef = useRef(null);
  const volumeBtnRef = useRef(null);
  const { fontSize, increaseFontSize, decreaseFontSize, getFontSizePercent } = useFontSize();
  const [showFontSlider, setShowFontSlider] = useState(false);
  const fontSliderRef = useRef(null);
  const fontBtnRef = useRef(null);

  // Закрытие других слайдеров при открытии нового
  const openVolumeSlider = () => {
    setShowFontSlider(false);
    setShowVolumeSlider(!showVolumeSlider);
  };

  const openFontSlider = () => {
    setShowVolumeSlider(false);
    setShowFontSlider(!showFontSlider);
  };

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

  // Закрытие слайдеров при клике вне их
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Не закрывать, если клик по кнопкам
      if (volumeBtnRef.current && volumeBtnRef.current.contains(event.target)) return;
      if (fontBtnRef.current && fontBtnRef.current.contains(event.target)) return;
      
      if (volumeSliderRef.current && !volumeSliderRef.current.contains(event.target)) {
        setShowVolumeSlider(false);
      }
      if (fontSliderRef.current && !fontSliderRef.current.contains(event.target)) {
        setShowFontSlider(false);
      }
    };

    if (showVolumeSlider || showFontSlider) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showVolumeSlider, showFontSlider]);

  // Общий стиль для кнопок (уменьшены на 25%)
  const buttonStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    width: '27px',
    height: '27px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '12px',
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
                  onClick={openVolumeSlider}
                  style={buttonStyle}
                  onMouseEnter={(e) => Object.assign(e.target.style, buttonHoverStyle)}
                  onMouseLeave={(e) => Object.assign(e.target.style, buttonStyle)}
                >
                  🎚️
                </button>
                
                {/* Вертикальный слайдер громкости */}
                <Portal>
                {showVolumeSlider && (
                  <div 
                    className="vertical-volume-slider"
                    style={{
                      position: 'fixed',
                      top: '100px',
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
                    
                    {/* Кнопка вкл/выкл звука внутри слайдера */}
                    <button
                      className="sound-toggle-btn"
                      aria-label="Вкл/Выкл звук"
                      onClick={() => setMuted(m => !m)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'inherit',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginTop: '8px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      {muted ? '🔇' : '🔊'}
                    </button>
                  </div>
                )}
                </Portal>
              </div>

              {/* Кнопка управления размером шрифта */}
              <div 
                className="font-control-container" 
                style={{ position: 'relative' }}
                ref={fontSliderRef}
              >
                <button
                  className="font-control-btn"
                  aria-label="Настройка размера шрифта"
                  aria-pressed={showFontSlider}
                  ref={fontBtnRef}
                  onClick={openFontSlider}
                  style={buttonStyle}
                  onMouseEnter={(e) => Object.assign(e.target.style, buttonHoverStyle)}
                  onMouseLeave={(e) => Object.assign(e.target.style, buttonStyle)}
                >
                  🔤
                </button>
                
                {/* Вертикальный слайдер размера шрифта */}
                <Portal>
                {showFontSlider && (
                  <div 
                    className="vertical-font-slider"
                    style={{
                      position: 'fixed',
                      top: '100px',
                      right: '80px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '12px 8px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
                      zIndex: 2147483647,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: '140px',
                      minWidth: '44px',
                      marginTop: 0
                    }}
                    ref={fontSliderRef}
                  >
                    <button
                      onClick={increaseFontSize}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.1)';
                        e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
                      }}
                    >
                      +
                    </button>
                    <span style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-color)',
                      textAlign: 'center',
                      lineHeight: '1.2'
                    }}>
                      {fontSize.toFixed(2)}rem
                    </span>
                    <button
                      onClick={decreaseFontSize}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.1)';
                        e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
                      }}
                    >
                      -
                    </button>
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

