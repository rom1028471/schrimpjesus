import { useState, useEffect, useRef } from 'react';
import './ScrollImage.css';

const ScrollImage = ({ imageSrc, triggerProgress = 0, children }) => {
  const [imageVisible, setImageVisible] = useState(false);
  const [imageOpacity, setImageOpacity] = useState(0);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

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
      
      // Вычисляем прогресс скролла через контейнер
      const scrollProgress = Math.max(0, Math.min(1, 
        (windowHeight - rect.top) / (windowHeight + rect.height)
      ));

      // Показываем изображение когда достигаем triggerProgress
      if (scrollProgress >= triggerProgress) {
        const imageProgress = Math.min(1, 
          (scrollProgress - triggerProgress) / (0.3) // 30% прогресса для полного проявления
        );
        setImageOpacity(imageProgress);
      } else {
        setImageOpacity(0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Проверяем сразу

    return () => window.removeEventListener('scroll', handleScroll);
  }, [imageVisible, triggerProgress]);

  return (
    <div className="scroll-image-container" ref={containerRef}>
      {/* Фиксированное изображение */}
      {imageVisible && (
        <div 
          className="fixed-image"
          ref={imageRef}
          style={{
            opacity: imageOpacity,
            transform: `scale(${0.8 + imageOpacity * 0.2})` // Плавное увеличение
          }}
        >
          <img src={imageSrc} alt="" loading="lazy" />
        </div>
      )}
      
      {/* Контент, который скроллится поверх */}
      <div className="scroll-content">
        {children}
      </div>
      
      {/* Прозрачная область для reveal эффекта */}
      <div 
        className="reveal-area"
        style={{
          opacity: Math.max(0, 1 - imageOpacity * 2) // Исчезает когда изображение появляется
        }}
      />
    </div>
  );
};

export default ScrollImage;
