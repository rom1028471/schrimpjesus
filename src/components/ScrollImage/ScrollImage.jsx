import { useState, useEffect, useRef } from 'react';
import './ScrollImage.css';

const ScrollImage = ({ imageSrc, triggerProgress = 0, children }) => {
  const [imageVisible, setImageVisible] = useState(false);
  const [reveal, setReveal] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageVisible(true);
        }
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!imageVisible || !containerRef.current) return;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      // Прогресс скролла через контейнер
      const scrollProgress = Math.max(0, Math.min(1, (windowHeight - rect.top) / (windowHeight + rect.height)));
      // reveal: 0 — фото не видно, 1 — фото полностью видно
      if (scrollProgress >= triggerProgress) {
        setReveal(Math.min(1, (scrollProgress - triggerProgress) / 0.3));
      } else {
        setReveal(0);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [imageVisible, triggerProgress]);

  return (
    <div className="scroll-image-container" ref={containerRef}>
      {/* Фото под текстом, появляется через маску */}
      {imageVisible && (
        <div 
          className="window-image"
          style={{
            '--reveal': reveal
          }}
        >
          <img src={imageSrc} alt="" loading="lazy" />
        </div>
      )}
      <div className="window-text-content">
        {children}
      </div>
    </div>
  );
};

export default ScrollImage;
