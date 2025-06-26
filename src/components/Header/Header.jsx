import './Header.css';

const Header = ({ title, subtitle, showBack = false, onBack }) => {
  return (
    <header className="app-header">
      <div className="header-content">
        {showBack && (
          <button className="back-button" onClick={onBack}>
            ← Назад
          </button>
        )}
        
        <div className="header-text">
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
        
        <div className="header-decoration">
          <div className="glow-orb"></div>
          <div className="glow-orb"></div>
          <div className="glow-orb"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;
