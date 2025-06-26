import React, { useState, useRef, useEffect } from 'react';
import Header from '../Header/Header';
import './WorkReader.css';

const VISIBILITY_OFFSET = 0.2; // 20% запас
const MAX_WIDTH = 900;

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
    console.log('Initializing refs array with length:', work.blocks.length);
    
    work.blocks.forEach((block, i) => {
      if (block.type === 'image') {
        console.log(`Loading image ${i}: ${block.imageFile}`);
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
          console.log(`Image ${i} loaded, setting window height to: ${windowHeight}`);
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

  // Следим за скроллом и определяем, какой image активен (ищем ближайший к центру viewport)
  useEffect(() => {
    const handleScroll = () => {
      const viewportHeight = window.innerHeight;
      let found = null;
      let minDist = Infinity;
      
      const imageBlocks = work.blocks.filter(block => block.type === 'image');
      console.log('Checking scroll, image blocks:', imageBlocks.length);
      console.log('Window heights state:', windowHeights);
      console.log('Window refs:', windowRefs.current.filter(Boolean).length);
      
      imageBlocks.forEach((block, blockIndex) => {
        // Находим индекс этого блока в общем массиве
        const globalIndex = work.blocks.findIndex(b => b === block);
        const ref = windowRefs.current[globalIndex];
        
        if (!ref) {
          console.log(`No ref for image block ${globalIndex}`);
          return;
        }
        
        const rect = ref.getBoundingClientRect();
        const winHeight = windowHeights[globalIndex] || viewportHeight * 0.6;
        const offset = winHeight * VISIBILITY_OFFSET;
        
        console.log(`Window ${globalIndex}: top=${rect.top}, bottom=${rect.bottom}, viewport=${viewportHeight}, offset=${offset}`);
        
        // Окно считается активным, если хотя бы часть его в зоне видимости с запасом
        if (rect.bottom > offset && rect.top < viewportHeight - offset) {
          // Чем ближе к центру viewport, тем "активнее"
          const dist = Math.abs((rect.top + rect.bottom) / 2 - viewportHeight / 2);
          console.log(`Window ${globalIndex} in range, distance: ${dist}`);
          if (dist < minDist) {
            minDist = dist;
            found = globalIndex;
          }
        }
      });
      
      console.log('Active window found:', found);
      
      if (found !== null && work.blocks[found]?.type === 'image') {
        const newActiveImage = {
          file: work.blocks[found].imageFile,
          idx: found,
          height: imageHeights.current[found] || (scrollRef.current?.offsetWidth * 0.7) || 300
        };
        console.log('Setting active image:', newActiveImage);
        setActiveImage(newActiveImage);
      } else {
        console.log('No active image, setting to null');
        setActiveImage(null);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [work, windowHeights]);

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
      {activeImage && (
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
              onLoad={() => console.log('Image loaded successfully:', activeImage.file)}
              onError={(e) => console.error('Image failed to load:', activeImage.file, e)}
            />
          </div>
        </div>
      )}
      {!activeImage && console.log('No active image to display')}
      
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
            console.log(`Creating window ${i} with height: ${winHeight}`);
            return (
              <div
                className="workreader-window"
                key={i}
                ref={el => {
                  windowRefs.current[i] = el;
                  if (el) {
                    console.log(`Ref set for window ${i}:`, el);
                  } else {
                    console.log(`Ref cleared for window ${i}`);
                  }
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
