import { useState, useEffect } from 'react';
import './WorksList.css';

const WorksList = ({ works, onSelectWork }) => {
  const [hoveredWork, setHoveredWork] = useState(null);

  return (
    <div className="works-list">
      <header className="list-header">
        <h1 className="main-title">Произведения SchrimpJesus</h1>
        <p className="subtitle">Выбери произведение для чтения</p>
      </header>

      <div className="works-grid">
        {works.map((work, index) => (
          <div
            key={work.id}
            className={`work-card ${hoveredWork === work.id ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredWork(work.id)}
            onMouseLeave={() => setHoveredWork(null)}
            onClick={() => onSelectWork(work)}
            style={{
              animationDelay: `${index * 0.1}s`
            }}
          >
            <div className="card-background">
              {work.coverImage && (
                <img 
                  src={work.coverImage} 
                  alt={work.title}
                  className="cover-image"
                />
              )}
              <div className="card-overlay" />
            </div>

            <div className="card-content">
              <h3 className="work-title">{work.title}</h3>
              <p className="work-author">{work.author}</p>
              <p className="work-genre">{work.genre}</p>
              <p className="work-description">{work.description}</p>
              
              <div className="work-stats">
                <span className="reading-time">
                  🕒 {work.readingTime || '15 мин'}
                </span>
                <span className="sections-count">
                  📄 {work.sections?.length || 0} частей
                </span>
              </div>
            </div>

            <div className="card-hover-effect">
              <span className="read-button">Читать →</span>
            </div>
          </div>
        ))}

        {/* Заглушки для будущих произведений */}
        {[1, 2, 3].map((index) => (
          <div key={`placeholder-${index}`} className="work-card placeholder">
            <div className="card-content">
              <h3 className="work-title">Скоро...</h3>
              <p className="work-description">
                Здесь появится новое произведение
              </p>
            </div>
          </div>
        ))}
      </div>

      <footer className="list-footer">
        <p>© 2025 SchrimpJesus. Все произведения защищены авторским правом.</p>
      </footer>
    </div>
  );
};

export default WorksList;
