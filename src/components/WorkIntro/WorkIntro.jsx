import { useState, useEffect } from 'react';
import './WorkIntro.css';

const WorkIntro = ({ work, onStartReading, onBack }) => {
  const [currentLine, setCurrentLine] = useState(-1);
  const [showButton, setShowButton] = useState(false);

  // Отладочная информация
  console.log('🔧 WorkIntro для произведения:', work.title);
  console.log('🔧 Количество блоков:', work.blocks?.length || 0);
  console.log('🔧 Блоки с картинками:', work.blocks?.filter(b => b.type === 'image').map(b => b.imageFile) || []);

  // Интро текст с анимированными строками
  const introLines = [
    `Добро пожаловать в "${work.title}"`,
    `Произведение от ${work.author}`,
    work.genre && `Жанр: ${work.genre}`,
    '',
    work.description,
    '',
    work.introText || 'Погрузитесь в удивительный мир, где каждое слово имеет значение...',
    '',
    'Приготовьтесь к уникальному опыту чтения с визуальными эффектами и музыкальным сопровождением.'
  ].filter(Boolean);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentLine < introLines.length - 1) {
        setCurrentLine(prev => prev + 1);
      } else if (!showButton) {
        setTimeout(() => setShowButton(true), 800);
      }
    }, 1200); // Задержка между строками

    return () => clearTimeout(timer);
  }, [currentLine, introLines.length, showButton]);

  return (
    <div className="work-intro">
      {/* Фоновые эффекты */}
      <div className="intro-background">
        <div className="floating-orb orb-1"></div>
        <div className="floating-orb orb-2"></div>
        <div className="floating-orb orb-3"></div>
      </div>

      {/* Кнопка назад */}
      <button className="intro-back-button" onClick={onBack}>
        ← Назад к списку
      </button>

      {/* Основной контент */}
      <div className="intro-content">
        <div className="intro-text">
          {introLines.map((line, index) => (
            <div
              key={index}
              className={`intro-line ${index <= currentLine ? 'visible' : ''} ${
                index === 0 ? 'title-line' : 
                index === 1 ? 'author-line' :
                index === 2 ? 'genre-line' : ''
              }`}
              style={{
                animationDelay: `${index * 0.3}s`
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* Кнопка начать чтение */}
        <div className={`intro-action ${showButton ? 'visible' : ''}`}>
          <button 
            className="start-reading-button"
            onClick={onStartReading}
          >
            <span className="button-text">Приступить к чтению</span>
            <span className="button-arrow">→</span>
          </button>
          
          <div className="reading-stats">
            <span className="stat">
              📖 {work.blocks?.length || 0} частей
            </span>
            <span className="stat">
              ⏱️ {work.readingTime || '15 мин'}
            </span>
            {work.hasAudio && (
              <span className="stat">
                🎵 Музыкальное сопровождение
              </span>
            )}
            {work.hasImages && (
              <span className="stat">
                🖼️ Визуальные эффекты
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkIntro;
