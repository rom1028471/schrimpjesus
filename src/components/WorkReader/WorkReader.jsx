import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import Header from '../Header/Header';
import './WorkReader.css';
import { useTheme } from '../../contexts/ThemeContext';
import { useReadingState } from '../../hooks/useReadingState';
import { useAudioTrigger } from '../../hooks/useAudioTrigger';

const VISIBILITY_OFFSET = 0.2; // 20% запас
const MAX_WIDTH = 900;

const WorkReader = ({ work, onBack }) => {
  const { theme } = useTheme();
  const [headerVisible, setHeaderVisible] = useState(true);
  const [activeImage, setActiveImage] = useState(null); // {file, idx, height}
  const [windowHeights, setWindowHeights] = useState({}); // {i: px}
  const scrollRef = useRef(null);
  const windowRefs = useRef([]);
  const imageHeights = useRef({}); // {i: px}
  const base = import.meta.env.DEV ? '/schrimpjesus/' : (import.meta.env.BASE_URL || '/');
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerEl = useRef(null);

  const { readingState, updateReadingState } = useReadingState(work.id);
  const { triggerAudio } = useAudioTrigger();

  // Считаем высоту хедера для отступа картинки
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerEl.current) {
        const height = headerEl.current.offsetHeight;
        setHeaderHeight(height);
      }
    };
    
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, [headerVisible]);

  // Для каждого image-разрыва создаём offscreen img для вычисления высоты
  useEffect(() => {
    work.blocks.forEach((block, i) => {
      if (block.type === 'image') {
        const img = new window.Image();
        const imagePath = `${base}assets/images/${block.imageFile}`;
        img.src = imagePath;
        img.onload = () => {
          imageHeights.current[i] = img.naturalHeight;
          // Сохраняем натуральную ширину для пересчета
          work.blocks[i].naturalWidth = img.naturalWidth;
          // Вычисляем реальную высоту картинки в контейнере
          // Используем реальную ширину контейнера (с учетом padding 2vw с каждой стороны)
          const containerWidth = scrollRef.current?.offsetWidth || window.innerWidth;
          const maxWidth = Math.min(MAX_WIDTH, containerWidth);
          const actualWidth = Math.min(img.naturalWidth, maxWidth);
          const actualHeight = (actualWidth / img.naturalWidth) * img.naturalHeight;
          const windowHeight = actualHeight * 1.3;
          
          setWindowHeights(prev => ({ ...prev, [i]: windowHeight }));
        };
        img.onerror = () => {
          console.error(`❌ Ошибка загрузки картинки ${i}: ${block.imageFile} по пути ${imagePath}`);
        };
      }
    });
  }, [work, base]);

  // Пересчитываем высоты при изменении размера окна
  useEffect(() => {
    work.blocks.forEach((block, i) => {
      if (block.type === 'image' && imageHeights.current[i]) {
        const containerWidth = scrollRef.current?.offsetWidth || window.innerWidth;
        const maxWidth = Math.min(MAX_WIDTH, containerWidth);
        const actualWidth = Math.min(block.naturalWidth || 700, maxWidth);
        const actualHeight = (actualWidth / (block.naturalWidth || 700)) * imageHeights.current[i];
        setWindowHeights(prev => ({ ...prev, [i]: actualHeight * 1.3 }));
      }
    });
  }, [work]);

  // Проверяем состояние refs после рендера
  useEffect(() => {
    const checkRefs = () => {
      const imageBlocks = work.blocks.filter(block => block.type === 'image');
      imageBlocks.forEach((block, blockIndex) => {
        const globalIndex = work.blocks.findIndex(b => b === block);
        const ref = windowRefs.current[globalIndex];
      });
    };
    
    // Проверяем сразу и через небольшую задержку
    checkRefs();
    const timer = setTimeout(checkRefs, 100);
    return () => clearTimeout(timer);
  }, [work, windowHeights]);

  // Создаем стабильный обработчик скролла
  const handleScrollRef = useRef();
  
  // Обновляем обработчик скролла при изменении work
  useEffect(() => {
    handleScrollRef.current = () => {
      const viewportHeight = window.innerHeight;
      let found = null;
      
      const imageBlocks = work.blocks.filter(block => block.type === 'image');
      
      // Проверяем, что все refs готовы
      const allRefsReady = imageBlocks.every((block, blockIndex) => {
        const globalIndex = work.blocks.findIndex(b => b === block);
        const ref = windowRefs.current[globalIndex];
        return ref !== null;
      });
      
      if (!allRefsReady) {
        return;
      }
      
      // Ищем окно, которое находится в зоне активации (100% ниже viewport)
      imageBlocks.forEach((block, blockIndex) => {
        // Находим индекс этого блока в общем массиве
        const globalIndex = work.blocks.findIndex(b => b === block);
        const ref = windowRefs.current[globalIndex];
        
        if (!ref) {
          return;
        }
        
        const rect = ref.getBoundingClientRect();
        const activationZone = viewportHeight; // 100% от высоты viewport
        
        // Окно активируется, когда его верхняя граница находится в пределах 100% ниже viewport
        // и деактивируется, когда оно уходит выше этой зоны
        const isInActivationZone = rect.top <= viewportHeight + activationZone && rect.bottom >= 0;
        
        if (isInActivationZone) {
          found = globalIndex;
        }
      });
      
      if (found !== null && work.blocks[found]?.type === 'image') {
        const newActiveImage = {
          file: work.blocks[found].imageFile,
          idx: found,
          height: imageHeights.current[found] || (scrollRef.current?.offsetWidth * 0.7) || 300
        };
        setActiveImage(newActiveImage);
      } else {
        setActiveImage(null);
      }
    };
  }, [work]);

  // Следим за скроллом - создаем обработчик только один раз
  useEffect(() => {
    // Слушаем скролл на контейнере, а не на window
    const handleScroll = () => {
      handleScrollRef.current();
    };
    
    const scrollContainer = scrollRef.current;
    
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      // Вызываем обработчик с небольшой задержкой, чтобы refs успели установиться
      const timer = setTimeout(handleScroll, 100);
      
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        clearTimeout(timer);
      };
    }
  }, [work]); // Добавляем зависимость от work

  // Аудио триггер при смене картинки
  useEffect(() => {
    if (activeImage) {
      triggerAudio(activeImage.file);
      updateReadingState(activeImage.idx);
    }
  }, [activeImage, triggerAudio, updateReadingState]);

  const winHeight = window.innerHeight;

  return (
    <div className={`work-reader ${theme}`}>
      <div 
        ref={headerEl} 
        className="workreader-header-container"
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          zIndex: 1000,
          transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.3s ease'
        }}
      >
        <Header
          title={work.title}
          subtitle={`${work.author} • ${work.genre}`}
          showBack={true}
          onBack={onBack}
          isOpen={true}
        >
          {headerVisible && (
            <button className="hide-header-button" onClick={() => setHeaderVisible(false)}>
              ↑ Скрыть меню
            </button>
          )}
        </Header>
      </div>
      
      {/* Кнопка показать хедер — фиксирована в правом верхнем углу */}
      {!headerVisible && (
        <button className="show-header-button fixed-show-header" onClick={() => setHeaderVisible(true)}>
          ↓
        </button>
      )}
      
      {/* Фиксированное фото, только если есть активное окно */}
      {activeImage ? (
        <div
          className="workreader-fixed-bg"
          style={{
            top: headerVisible ? headerHeight : 0,
            height: `calc(100vh - ${headerVisible ? headerHeight : 0}px)`
          }}
        >
          <div className="workreader-img-container">
            <img
              src={`${base}assets/images/${activeImage.file}`}
              alt=""
              className="workreader-bg-img"
              draggable={false}
              loading="lazy"
            />
          </div>
        </div>
      ) : null}
      
      {/* Отладочная информация */}
      {console.log('🔧 Рендер - activeImage:', activeImage?.file, 'headerVisible:', headerVisible)}
      
      {/* Скроллируемый текст с отступом сверху для хедера */}
      <div 
        className="workreader-scroll" 
        ref={scrollRef} 
        style={{ 
          transform: headerVisible ? `translateY(${headerHeight}px)` : 'translateY(0)',
          transition: 'transform 0.3s ease, height 0.3s ease',
          height: headerVisible ? `calc(100vh - ${headerHeight}px)` : '100vh'
        }}
      >
        {work.blocks.map((block, i) => {
          if (block.type === 'text') {
            return (
              <div className="workreader-block no-radius" key={i}>{block.content}</div>
            );
          }
          if (block.type === 'image') {
            // Высота окна = 1.3 * высота картинки (или 0.8 * ширина блока, если нет картинки)
            const winHeight = windowHeights[i] || scrollRef.current?.offsetWidth * 0.8 || '80vw';
            console.log(`🏗️ Рендерим блок картинки ${i} (${block.imageFile}) с высотой:`, winHeight);
            return (
              <div
                className="workreader-window"
                key={i}
                ref={el => {
                  windowRefs.current[i] = el;
                }}
                style={{ height: winHeight }}
              />
            );
          }
          return null;
        })}
        
        {/* Блок концовки внутри скроллируемого контейнера */}
        <div className="workreader-footer">
          <div className="footer-content">
            <p>© 2025 SchrimpJesus. Все произведения защищены авторским правом.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkReader;
