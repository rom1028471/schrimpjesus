import { useEffect, useRef, useState } from 'react';

const useScrollReveal = (triggerProgress = 0.7) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const elementRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!elementRef.current) return;

      const element = elementRef.current;
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Вычисляем прогресс скролла через элемент
      const scrollProgress = Math.max(0, Math.min(1, 
        (windowHeight - rect.top) / (windowHeight + rect.height)
      ));

      setProgress(scrollProgress);
      
      // Элемент становится видимым при достижении triggerProgress
      if (scrollProgress >= triggerProgress && !isVisible) {
        setIsVisible(true);
      } else if (scrollProgress < triggerProgress && isVisible) {
        setIsVisible(false);
      }
    };

    // Intersection Observer для оптимизации
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          window.addEventListener('scroll', handleScroll);
          handleScroll(); // Проверяем сразу
        } else {
          window.removeEventListener('scroll', handleScroll);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [triggerProgress, isVisible]);

  return {
    elementRef,
    isVisible,
    progress,
    // Дополнительные утилиты
    opacity: Math.min(1, Math.max(0, (progress - triggerProgress) / 0.3)),
    scale: 0.8 + Math.min(1, Math.max(0, (progress - triggerProgress) / 0.3)) * 0.2,
    translateY: Math.max(0, (1 - progress) * 100)
  };
};

export default useScrollReveal;
