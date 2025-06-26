import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Header from '../Header/Header';
import './WorkReader.css';

const VISIBILITY_OFFSET = 0.2; // 20% запас
const MAX_WIDTH = 900;

// Глобальная переменная для отслеживания состояния обработчика скролла
let scrollListenerAdded = false;

const WorkReader = ({ work, onBack }) => {
  if (!work || !work.blocks) return null;
  const [headerVisible, setHeaderVisible] = useState(true);
  const [activeImage, setActiveImage] = useState(null); // {file, idx, height}
  const [windowHeights, setWindowHeights] = useState({}); // {i: px}
  const scrollRef = useRef(null);
  const windowRefs = useRef([]);
  const imageHeights = useRef({}); // {i: px}
  const base = import.meta.env.BASE_URL || '/';
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerEl = useRef(null);

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
    // Инициализируем массив refs правильной длины
    windowRefs.current = new Array(work.blocks.length).fill(null);
    
    work.blocks.forEach((block, i) => {
      if (block.type === 'image') {
        const img = new window.Image();
        img.src = `${base}assets/images/${block.imageFile}`;
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
          console.error(`Failed to load image ${i}: ${block.imageFile}`);
        };
      }
    });
  }, [work]);

  // Пересчитываем высоты при изменении размера окна
  useEffect(() => {
    const handleResize = () => {
      work.blocks.forEach((block, i) => {
        if (block.type === 'image' && imageHeights.current[i]) {
          const containerWidth = scrollRef.current?.offsetWidth || window.innerWidth;
          const maxWidth = Math.min(MAX_WIDTH, containerWidth);
          const actualWidth = Math.min(block.naturalWidth || 700, maxWidth);
          const actualHeight = (actualWidth / (block.naturalWidth || 700)) * imageHeights.current[i];
          setWindowHeights(prev => ({ ...prev, [i]: actualHeight * 1.3 }));
        }
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
        return windowRefs.current[globalIndex] !== null;
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
          // Если окно в зоне активации, выбираем его
          // Если уже есть активное окно, выбираем то, которое ближе к центру viewport
          if (found === null) {
            found = globalIndex;
          } else {
            const currentRect = windowRefs.current[found].getBoundingClientRect();
            const currentDist = Math.abs((currentRect.top + currentRect.bottom) / 2 - viewportHeight / 2);
            const newDist = Math.abs((rect.top + rect.bottom) / 2 - viewportHeight / 2);
            
            if (newDist < currentDist) {
              found = globalIndex;
            }
          }
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
    if (scrollListenerAdded) {
      return;
    }
    
    // Слушаем скролл на window
    const handleScroll = () => handleScrollRef.current();
    window.addEventListener('scroll', handleScroll, { passive: true });
    scrollListenerAdded = true;
    
    // Вызываем обработчик с небольшой задержкой, чтобы refs успели установиться
    const timer = setTimeout(handleScroll, 100);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
      scrollListenerAdded = false;
    };
  }); // Убираем массив зависимостей полностью

  return (
    <div className="workreader-root">
      {/* Фиксированный хедер вверху области просмотра */}
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
              ↑ Скрыть хедер
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
