import { useState, useEffect } from 'react';
import './BadUIGate.css';

const BadUIGate = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [buttonVisible, setButtonVisible] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [dragging, setDragging] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);

  const challenges = [
    {
      title: "Секретный пароль",
      instruction: "Введи слово, которое появляется при печати задом наперед",
      component: "text-challenge"
    },
    {
      title: "Сломанный слайдер",
      instruction: "Перетащи ползунок точно на 77%",
      component: "slider-challenge"
    }
  ];

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const MouseChallenge = () => {
    const [hoverTime, setHoverTime] = useState(0);
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
      let interval;
      if (isHovering) {
        interval = setInterval(() => {
          setHoverTime(prev => {
            if (prev >= 3000) {
              setStep(step + 1);
              return prev;
            }
            return prev + 100;
          });
        }, 100);
      } else {
        setHoverTime(0);
      }
      return () => clearInterval(interval);
    }, [isHovering]);

    const buttonStyle = {
      position: 'absolute',
      left: Math.sin(Date.now() / 1000) * 100 + mousePos.x / 10,
      top: Math.cos(Date.now() / 1000) * 50 + mousePos.y / 15,
      transition: isHovering ? 'none' : 'all 0.3s ease',
    };

    return (
      <div className="challenge-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${(hoverTime / 3000) * 100}%` }}
          />
        </div>
        <button
          className="floating-button"
          style={buttonStyle}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {isHovering ? `${Math.floor(hoverTime/100)/10}s` : '🎯'}
        </button>
      </div>
    );
  };

  const TextChallenge = () => {
    const secretWord = "текст";
    const reversedSecret = secretWord.split('').reverse().join('');
    
    const handleInputChange = (e) => {
      const value = e.target.value;
      setTextInput(value);
      
      if (value.toLowerCase() === secretWord) {
        setTimeout(() => setStep(step + 1), 500);
      }
    };

    return (
      <div className="challenge-container">
        <div className="glitch-text">
          {textInput.split('').reverse().join('') || 'Печатай...'}
        </div>
        <input
          type="text"
          value={textInput}
          onChange={handleInputChange}
          placeholder="Что ты видишь выше?"
          className="glitch-input"
          autoFocus
        />
        <div className="hint">
          💡 Секрет в отражении
        </div>
      </div>
    );
  };

  const SliderChallenge = () => {
    const targetValue = 77;
    const tolerance = 1;

    const handleSliderChange = (e) => {
      const value = parseInt(e.target.value);
      setSliderValue(value);
      
      if (Math.abs(value - targetValue) <= tolerance) {
        setTimeout(() => setStep(step + 1), 500);
      }
    };

    return (
      <div className="challenge-container">
        <div className="slider-container">
          <div className="slider-label">
            {sliderValue}% {Math.abs(sliderValue - targetValue) <= tolerance ? '✅' : '🎯'}
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={handleSliderChange}
            className="broken-slider"
            style={{
              transform: `rotate(${Math.sin(sliderValue / 10) * 10}deg)`,
              filter: `hue-rotate(${sliderValue * 3}deg)`
            }}
          />
          <div className="target-indicator" style={{ left: `${targetValue}%` }}>
            🎯
          </div>
        </div>
      </div>
    );
  };

  if (step >= challenges.length) {
    return (
      <div className="gate-complete">
        <div className="success-animation">
          <div className="success-text">Добро пожаловать!</div>
          <div className="sparkles">✨✨✨</div>
          <button 
            className="enter-button"
            onClick={onComplete}
          >
            Войти в мир произведений
          </button>
        </div>
      </div>
    );
  }

  const currentChallenge = challenges[step];

  return (
    <div className="bad-ui-gate">
      <div className="gate-header">
        <h1 className="gate-title">Испытание {step + 1} из {challenges.length}</h1>
        <h2 className="challenge-title">{currentChallenge.title}</h2>
        <p className="challenge-instruction">{currentChallenge.instruction}</p>
      </div>

      <div className="challenge-area">
        {currentChallenge.component === 'mouse-challenge' && <MouseChallenge />}
        {currentChallenge.component === 'text-challenge' && <TextChallenge />}
        {currentChallenge.component === 'slider-challenge' && <SliderChallenge />}
      </div>

      <div className="progress-dots">
        {challenges.map((_, index) => (
          <div 
            key={index} 
            className={`dot ${index <= step ? 'completed' : ''}`}
          />
        ))}
      </div>
    </div>
  );
};

export default BadUIGate;
