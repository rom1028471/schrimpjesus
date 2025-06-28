import { useState } from 'react';
import Header from '../Header/Header';
import './WorksList.css';

const WorksList = ({ works, onSelectWork }) => {
  const [hoveredWork, setHoveredWork] = useState(null);
  const base = import.meta.env.DEV ? '/schrimpjesus/' : (import.meta.env.BASE_URL || '/');
  
  // Отладочная информация
  console.log('🔧 WorksList - Все переменные окружения:');
  console.log('🔧 DEV:', import.meta.env.DEV);
  console.log('🔧 BASE_URL:', import.meta.env.BASE_URL);
  console.log('🔧 Вычисленный base:', base);
  console.log('🔧 window.location.pathname:', window.location.pathname);
  
  console.log('🔧 WorksList - Base path:', base, 'DEV:', import.meta.env.DEV);
  console.log('🔧 WorksList - Количество произведений:', works.length);
  works.forEach(work => {
    if (work.coverImage) {
      console.log(`🖼️ Обложка для ${work.title}: ${base}assets/images/${work.coverImage}`);
    }
  });

  return (
    <div className="works-list">
      <Header 
        title="Произведения SchrimpJesus" 
        subtitle="Выбери произведение для чтения" 
        isOpen={true}
      />

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
                  src={`${base}assets/images/${work.coverImage}`}
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
