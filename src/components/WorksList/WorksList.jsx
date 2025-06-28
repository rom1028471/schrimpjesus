import { useState } from 'react';
import './WorksList.css';

function WorksList({ works, onSelectWork }) {
  const [hoveredWork, setHoveredWork] = useState(null);
  
  const base = import.meta.env.DEV ? '/schrimpjesus/' : (import.meta.env.BASE_URL || '/');

  return (
    <div className="works-list">
      <div className="works-grid">
        {works.map((work, index) => (
          <div
            key={work.id}
            className={`work-card ${hoveredWork === work.id ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredWork(work.id)}
            onMouseLeave={() => setHoveredWork(null)}
            onClick={() => onSelectWork(work)}
          >
            <div className="work-cover">
              <img 
                src={`${base}assets/images/${work.coverImage}`} 
                alt={work.title}
                loading="lazy"
              />
            </div>
            <div className="work-info">
              <h3>{work.title}</h3>
              <p>{work.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WorksList;
