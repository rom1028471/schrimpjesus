import { useTheme } from '../../contexts/ThemeContext';
import './WorkIntro.css';

function WorkIntro({ work, onStartReading, onBack }) {
  const { theme } = useTheme();

  return (
    <div className={`work-intro ${theme}`}>
      <div className="intro-header">
        <button className="back-button" onClick={onBack}>
          ← Назад к списку
        </button>
      </div>
      
      <div className="intro-content">
        <h1>{work.title}</h1>
        <p className="description">{work.description}</p>
        
        <div className="work-stats">
          <div className="stat">
            <span className="stat-label">Количество изображений:</span>
            <span className="stat-value">{work.blocks?.filter(b => b.type === 'image').length || 0}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Текстовых блоков:</span>
            <span className="stat-value">{work.blocks?.filter(b => b.type === 'text').length || 0}</span>
          </div>
        </div>
        
        <button className="start-reading-btn" onClick={onStartReading}>
          Начать чтение
        </button>
      </div>
    </div>
  );
}

export default WorkIntro;
