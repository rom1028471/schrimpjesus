import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
  const base = import.meta.env.DEV ? '/schrimpjesus/' : (import.meta.env.BASE_URL || '/');
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerEl = useRef(null);

  // Отладочная информация
  console.log('🔧 WorkReader - Все переменные окружения:');
  console.log('🔧 DEV:', import.meta.env.DEV);
  console.log('🔧 BASE_URL:', import.meta.env.BASE_URL);
  console.log('🔧 Вычисленный base:', base);
  console.log('🔧 window.location.pathname:', window.location.pathname);

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
    console.log('🔧 WorkReader для произведения:', work.title);
    console.log('🔧 Количество блоков:', work.blocks.length);
    console.log('🔧 Блоки с картинками:', work.blocks.filter(b => b.type === 'image').map(b => b.imageFile));
    console.log('🔧 Base path:', base, 'DEV:', import.meta.env.DEV);
    
    // Инициализируем массив refs правильной длины
    windowRefs.current = new Array(work.blocks.length).fill(null);
    
    work.blocks.forEach((block, i) => {
      if (block.type === 'image') {
        const img = new window.Image();
        const imagePath = `${base}assets/images/${block.imageFile}`;
        console.log(`🖼️ Загружаю картинку ${i}: ${block.imageFile} по пути ${imagePath}`);
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
          
          console.log(`📏 Блок ${i} (${block.imageFile}):`, {
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            containerWidth,
            maxWidth,
            actualWidth,
            actualHeight,
            windowHeight
          });
          
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
      console.log('🔍 Обработка скролла - imageBlocks:', imageBlocks.length);
      
      // Проверяем, что все refs готовы
      const allRefsReady = imageBlocks.every((block, blockIndex) => {
        const globalIndex = work.blocks.findIndex(b => b === block);
        const ref = windowRefs.current[globalIndex];
        console.log(`🔍 Блок ${globalIndex} (${block.imageFile}) - ref готов:`, ref !== null);
        return ref !== null;
      });
      
      console.log('🔍 Все refs готовы:', allRefsReady);
      
      if (!allRefsReady) {
        console.log('❌ Не все refs готовы, выходим');
        return;
      }
      
      // Ищем окно, которое находится в зоне активации (100% ниже viewport)
      imageBlocks.forEach((block, blockIndex) => {
        // Находим индекс этого блока в общем массиве
        const globalIndex = work.blocks.findIndex(b => b === block);
        const ref = windowRefs.current[globalIndex];
        
        if (!ref) {
          console.log(`❌ Нет ref для блока ${globalIndex}`);
          return;
        }
        
        const rect = ref.getBoundingClientRect();
        const activationZone = viewportHeight; // 100% от высоты viewport
        
        console.log(`🔍 Блок ${globalIndex} (${block.imageFile}):`, {
          rectTop: rect.top,
          rectBottom: rect.bottom,
          viewportHeight,
          activationZone,
          isInActivationZone: rect.top <= viewportHeight + activationZone && rect.bottom >= 0
        });
        
        // Окно активируется, когда его верхняя граница находится в пределах 100% ниже viewport
        // и деактивируется, когда оно уходит выше этой зоны
        const isInActivationZone = rect.top <= viewportHeight + activationZone && rect.bottom >= 0;
        
        if (isInActivationZone) {
          console.log(`✅ Блок ${globalIndex} (${block.imageFile}) в зоне активации`);
          // Если окно в зоне активации, выбираем его
          // Если уже есть активное окно, выбираем то, которое ближе к центру viewport
          if (found === null) {
            found = globalIndex;
            console.log(`🎯 Устанавливаем активный блок: ${globalIndex} (${block.imageFile})`);
          } else {
            const currentRect = windowRefs.current[found].getBoundingClientRect();
            const currentDist = Math.abs((currentRect.top + currentRect.bottom) / 2 - viewportHeight / 2);
            const newDist = Math.abs((rect.top + rect.bottom) / 2 - viewportHeight / 2);
            
            console.log(`🔍 Сравнение: текущий ${found} (dist: ${currentDist}) vs новый ${globalIndex} (dist: ${newDist})`);
            
            if (newDist < currentDist) {
              found = globalIndex;
              console.log(`🎯 Меняем активный блок на: ${globalIndex} (${block.imageFile})`);
            }
          }
        }
      });
      
      console.log('🔍 Найденный блок:', found);
      
      if (found !== null && work.blocks[found]?.type === 'image') {
        const newActiveImage = {
          file: work.blocks[found].imageFile,
          idx: found,
          height: imageHeights.current[found] || (scrollRef.current?.offsetWidth * 0.7) || 300
        };
        console.log('🎯 Активная картинка:', newActiveImage.file, '(блок', found + ')');
        setActiveImage(newActiveImage);
      } else {
        console.log('❌ Активная картинка не найдена');
        setActiveImage(null);
      }
    };
  }, [work]);

  // Следим за скроллом - создаем обработчик только один раз
  useEffect(() => {
    // Слушаем скролл на контейнере, а не на window
    const handleScroll = () => {
      console.log('📜 Скролл обрабатывается');
      handleScrollRef.current();
    };
    
    const scrollContainer = scrollRef.current;
    console.log('🔧 Контейнер скролла найден:', scrollContainer !== null);
    
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
