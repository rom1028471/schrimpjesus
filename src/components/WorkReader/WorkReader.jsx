import { useState, useEffect } from 'react';
import ScrollImage from '../ScrollImage/ScrollImage';
import AudioManager from '../AudioManager/AudioManager';
import './WorkReader.css';

const WorkReader = ({ work, onBack }) => {
  const [currentSection, setCurrentSection] = useState(0);

  if (!work) return null;

  return (
    <div className="work-reader">
      <header className="reader-header">
        <button className="back-button" onClick={onBack}>
          ← Назад к произведениям
        </button>
        <h1 className="work-title">{work.title}</h1>
        <div className="work-meta">
          <span className="author">{work.author}</span>
          <span className="genre">{work.genre}</span>
        </div>
      </header>

      <main className="reader-content">
        {work.sections.map((section, index) => (
          <div key={index} className="work-section">
            {/* Обычный текст */}
            {section.type === 'text' && (
              <div className="text-section">
                <div className="text-content">
                  {section.content.split('\n').map((paragraph, pIndex) => (
                    <p key={pIndex} className="paragraph">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Секция с изображением */}
            {section.type === 'image' && (
              <ScrollImage 
                imageSrc={section.imageSrc} 
                triggerProgress={section.triggerProgress || 0.7}
              >
                <div className="image-text-overlay">
                  {section.content.split('\n').map((paragraph, pIndex) => (
                    <p key={pIndex} className="overlay-paragraph">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </ScrollImage>
            )}

            {/* Аудио для секции */}
            {section.audioSrc && (
              <AudioManager
                audioSrc={section.audioSrc}
                triggerElement={`.work-section:nth-child(${index + 1})`}
                volume={section.volume || 0.3}
                loop={section.loop !== false}
              />
            )}
          </div>
        ))}

        {/* Финальная секция */}
        <div className="work-ending">
          <div className="ending-content">
            <h2>Конец произведения</h2>
            <p>Спасибо за чтение!</p>
            <button className="back-to-list" onClick={onBack}>
              Вернуться к списку произведений
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WorkReader;
