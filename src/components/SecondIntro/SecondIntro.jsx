import { useState, useEffect } from 'react';
import './SecondIntro.css';

const SecondIntro = ({ work, onStartReading, onBack }) => {
  const [showFirstButton, setShowFirstButton] = useState(false);
  const [showSecondButton, setShowSecondButton] = useState(false);
  const [firstButtonClicked, setFirstButtonClicked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFirstButton(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleFirstButtonClick = () => {
    setFirstButtonClicked(true);
    setTimeout(() => {
      setShowSecondButton(true);
    }, 1000);
  };

  const handleStartReading = () => {
    onStartReading();
  };

  return (
    <div className="second-intro">
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
          <div className="intro-line visible">
            когда создаешь такие произведения и занимаешься оным продолжительное время, то ожидаешь и должного уровня вовлечённости от читателя и базовый минимум - бегло прочитал - вообще не подходит.
          </div>
          <div className="intro-line visible">
            базара нет
          </div>
          <div className="intro-line visible">
            ожидаю солидный фидбек от вас
          </div>
          <div className="intro-line visible">
            надеюсь слишком умные слова не будут проигнорированы вами и вы их хотя бы загуглите. возможно некоторые шутки вы не поймёте. Но я всегда рад растолковать, разжевать, переживать и вложить вам свое мягкое объяснение обратно. а также не забудете оценивать и музыкальный подбор, над которым я так же старался.
          </div>
        </div>

        {/* Первая кнопка */}
        <div className={`intro-action ${showFirstButton ? 'visible' : ''}`}>
          <button 
            className={`intro-button ${firstButtonClicked ? 'clicked' : ''}`}
            onClick={handleFirstButtonClick}
            disabled={!showFirstButton}
            aria-disabled={!showFirstButton}
          >
            <span className="button-text">Да заебал, где твоя паста ебаная?</span>
          </button>
        </div>

        {/* Вторая кнопка */}
        <div className={`intro-action ${showSecondButton ? 'visible' : ''}`}>
          <button 
            className="start-reading-button"
            onClick={handleStartReading}
            disabled={!showSecondButton}
            aria-disabled={!showSecondButton}
          >
            <span className="button-text">Обещаю быть внимательным читателем!</span>
            <span className="button-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecondIntro; 