import React, { useState, useRef, useEffect, useMemo } from 'react';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import Header from '../Header/Header';
import './WorkReader.css';
import { useSound } from '../../contexts/SoundContext';
import Portal from '../Portal.jsx';

const VISIBILITY_OFFSET = 0.2; // 20% запас
const MAX_WIDTH = 900;

const DEFAULT_MUSIC_RADIUS = 0.3;
const FADE_DURATION = 5000; // 5 секунд
const PAUSE_MEMORY = 30000; // 30 секунд

const WorkReader = ({ work, onBack }) => {
  useLockBodyScroll();
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 480 : false;
  const musicRefs = useRef([]); // refs для аудио-маркеров
  const scrollRef = useRef(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [musicPatchRects, setMusicPatchRects] = useState([]);
  const [debugMode, setDebugMode] = useState(false); // Отладочный режим

  // Предрасчёт индексов блоков по типам для быстрых проходов
  const imageBlockIndices = useMemo(() => {
    if (!work?.blocks) return [];
    const result = [];
    for (let i = 0; i < work.blocks.length; i++) if (work.blocks[i].type === 'image') result.push(i);
    return result;
  }, [work]);

  const musicBlockIndices = useMemo(() => {
    if (!work?.blocks) return [];
    const result = [];
    for (let i = 0; i < work.blocks.length; i++) if (work.blocks[i].type === 'music') result.push(i);
    return result;
  }, [work]);

  // Патчи для аудиомаркеров
  useEffect(() => {
    if (!scrollRef.current || !work?.blocks) return;
    const rects = [];
    for (const i of musicBlockIndices) {
      if (musicRefs.current[i]) {
        const el = musicRefs.current[i];
        const r = el.getBoundingClientRect();
        const scrollRect = scrollRef.current.getBoundingClientRect();
        rects.push({
          top: r.top - scrollRect.top + scrollRef.current.scrollTop,
          left: r.left - scrollRect.left + scrollRef.current.scrollLeft,
        });
      }
    }
    setMusicPatchRects(rects);
  }, [work, musicBlockIndices, musicRefs.current, scrollRef.current, headerVisible, headerHeight]);

  // Обновлять патчи при ресайзе/скролле
  useEffect(() => {
    const update = () => {
      if (!scrollRef.current || !work?.blocks) return;
      const rects = [];
      for (const i of musicBlockIndices) {
        if (musicRefs.current[i]) {
          const el = musicRefs.current[i];
          const r = el.getBoundingClientRect();
          const scrollRect = scrollRef.current.getBoundingClientRect();
          rects.push({
            top: r.top - scrollRect.top + scrollRef.current.scrollTop,
            left: r.left - scrollRect.left + scrollRef.current.scrollLeft,
          });
        }
      }
      setMusicPatchRects(rects);
    };
    window.addEventListener('resize', update);
    if (scrollRef.current) scrollRef.current.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      if (scrollRef.current) scrollRef.current.removeEventListener('scroll', update);
    };
  }, [work, musicBlockIndices, musicRefs.current, scrollRef.current]);
  if (!work || !work.blocks) return null;
  
  const [activeImage, setActiveImage] = useState(null); // {file, idx, height}
  const [windowHeights, setWindowHeights] = useState({}); // {i: px}
  const windowRefs = useRef([]);
  const imageHeights = useRef({}); // {i: px}
  const base = import.meta.env.BASE_URL || '/';
  const headerEl = useRef(null);
  const [activeMusic, setActiveMusic] = useState(null); // { musicFile, idx, radius }
  const audioRef = useRef(null);
  const [audioState, setAudioState] = useState({ playing: false, src: null });
  const [fadeTarget, setFadeTarget] = useState(1); // 1 - громко, 0 - тихо
  const fadeRafId = useRef(0);
  const lastPauseTime = useRef({}); // { [musicFile]: timestamp }
  const lastPositions = useRef({}); // { [musicFile]: position }
  const lastLog = useRef(0);
  const { muted, volume } = useSound();
  const previousMusicFileRef = useRef(null);
  const currentActiveRef = useRef(null); // стабилизация активного трека

  // helper
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

 
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
    
    for (const i of imageBlockIndices) {
      const block = work.blocks[i];
        const img = new window.Image();
        const imagePath = `${base}assets/images/${block.imageFile}`;
      if (import.meta.env.DEV) console.log(`🖼️ Загружаю картинку ${i}: ${block.imageFile} по пути ${imagePath}`);
        img.src = imagePath;
        img.onload = () => {
          imageHeights.current[i] = img.naturalHeight;
          work.blocks[i].naturalWidth = img.naturalWidth;
          const containerWidth = scrollRef.current?.offsetWidth || window.innerWidth;
          const maxWidth = Math.min(MAX_WIDTH, containerWidth);
          const actualWidth = Math.min(img.naturalWidth, maxWidth);
          const actualHeight = (actualWidth / img.naturalWidth) * img.naturalHeight;
          const windowHeight = actualHeight * 1.3;
        if (import.meta.env.DEV) {
          console.log(`📏 Блок ${i} (${block.imageFile}):`, {
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            containerWidth,
            maxWidth,
            actualWidth,
            actualHeight,
            windowHeight
          });
        }
          setWindowHeights(prev => ({ ...prev, [i]: windowHeight }));
        };
        img.onerror = () => {
          console.error(`❌ Ошибка загрузки картинки ${i}: ${block.imageFile} по пути ${imagePath}`);
        };
      }
  }, [work, base, imageBlockIndices]);

  // Пересчитываем высоты при изменении размера окна
  useEffect(() => {
    const handleResize = () => {
      for (const i of imageBlockIndices) {
        if (imageHeights.current[i]) {
          const containerWidth = scrollRef.current?.offsetWidth || window.innerWidth;
          const maxWidth = Math.min(MAX_WIDTH, containerWidth);
          const naturalWidth = work.blocks[i].naturalWidth || 700;
          const actualWidth = Math.min(naturalWidth, maxWidth);
          const actualHeight = (actualWidth / naturalWidth) * imageHeights.current[i];
          setWindowHeights(prev => ({ ...prev, [i]: actualHeight * 1.3 }));
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [work, imageBlockIndices]);

  // --- MUSIC: refs для аудио ---
  useEffect(() => {
    musicRefs.current = new Array(work.blocks.length).fill(null);
  }, [work]);

  // --- MUSIC: обработка скролла и активация ---
  useEffect(() => {
    let lastDistsLog = 0;
    const handleMusic = () => {
      const now = Date.now();
      if (now - lastLog.current > 1000) {
        if (scrollRef.current && import.meta.env.DEV) {
          const pos = scrollRef.current.scrollTop;
          console.log('[AUDIO] scroll pos:', pos);
        }
        lastLog.current = now;
      }
      if (!scrollRef.current) return;
      const viewportHeight = window.innerHeight;
      let found = null;
      let foundDist = Infinity;
      const dists = [];
      for (const i of musicBlockIndices) {
          const ref = musicRefs.current[i];
        if (!ref) continue;
          const rect = ref.getBoundingClientRect();
          const center = (rect.top + rect.bottom) / 2;
          const dist = Math.abs(center - viewportHeight / 2);
        const radius = typeof work.blocks[i].radius === 'number' ? work.blocks[i].radius : DEFAULT_MUSIC_RADIUS;
          const activationZone = viewportHeight * radius;
        dists.push({ file: work.blocks[i].musicFile, dist, activationZone });
          if (center >= 0 && center <= viewportHeight) {
            if (dist < foundDist && dist < activationZone) {
            found = { musicFile: work.blocks[i].musicFile, idx: i, radius };
              foundDist = dist;
            }
          }
        }
      if (dists.length && import.meta.env.DEV && now - lastDistsLog > 1000) {
        console.log('[AUDIO] dists:', dists);
        lastDistsLog = now;
      }

      // Стабилизация: не обновляем state, если трек не изменился
      const prev = currentActiveRef.current;
      if (
        (prev?.musicFile || null) === (found?.musicFile || null) &&
        (prev?.idx ?? null) === (found?.idx ?? null)
      ) {
        return;
      }
      currentActiveRef.current = found;
      setActiveMusic(found);
    };
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    scrollContainer.addEventListener('scroll', handleMusic, { passive: true });
    setTimeout(handleMusic, 100);
    return () => scrollContainer.removeEventListener('scroll', handleMusic);
  }, [work, musicBlockIndices]);

  // --- MUSIC: основной контроль аудио ---
  useEffect(() => {
    if (!audioRef.current) return;

    const previousFile = previousMusicFileRef.current;
    const currentFile = activeMusic?.musicFile;

    // Сохраняем позицию предыдущего трека при переключении
    if (previousFile && currentFile && previousFile !== currentFile) {
      if (audioRef.current.src && audioRef.current.src.endsWith(previousFile)) {
        lastPauseTime.current[previousFile] = Date.now();
        lastPositions.current[previousFile] = audioRef.current.currentTime;
        if (import.meta.env.DEV) console.log('[AUDIO] saving position on switch:', audioRef.current.currentTime, 'for', previousFile);
      }
    }

    // Если выходим из зоны - сохраняем позицию и останавливаем
    if (!activeMusic || !activeMusic.musicFile || muted) {
      if (import.meta.env.DEV) console.log('[AUDIO] exiting zone, previousFile:', previousFile, 'currentFile:', currentFile);
      if (import.meta.env.DEV) console.log('[AUDIO] audioRef.src:', audioRef.current?.src);
      if (previousFile && audioRef.current.src) {
        // Извлекаем имя файла из URL
        const urlFileName = audioRef.current.src.split('/').pop();
        const decodedFileName = decodeURIComponent(urlFileName);
        
        if (decodedFileName === previousFile) {
          lastPauseTime.current[previousFile] = Date.now();
          lastPositions.current[previousFile] = audioRef.current.currentTime;
          if (import.meta.env.DEV) console.log('[AUDIO] saving position on exit:', audioRef.current.currentTime, 'for', previousFile);
        } else {
          if (import.meta.env.DEV) console.log('[AUDIO] filename mismatch, decoded:', decodedFileName, 'vs previousFile:', previousFile);
          // Сохраняем позицию в любом случае
          lastPauseTime.current[previousFile] = Date.now();
          lastPositions.current[previousFile] = audioRef.current.currentTime;
          if (import.meta.env.DEV) console.log('[AUDIO] forcing save position:', audioRef.current.currentTime, 'for', previousFile);
        }
      }
      setFadeTarget(0);
      setAudioState(s => ({ ...s, playing: false }));
      previousMusicFileRef.current = currentFile || null;
      return;
    }

    // Если тот же трек уже играет - просто поднимаем громкость
    if (audioRef.current.src) {
      const urlFileName = audioRef.current.src.split('/').pop();
      const decodedFileName = decodeURIComponent(urlFileName);
      
      if (decodedFileName === activeMusic.musicFile) {
        if (audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
        }
        setFadeTarget(1);
        setAudioState(s => ({ ...s, playing: true, src: activeMusic.musicFile }));
        previousMusicFileRef.current = currentFile;
        return;
      }
    }

    // Новый трек или перезапуск того же трека
    const base = import.meta.env.BASE_URL || '/';
    const src = `${base}assets/audio/${activeMusic.musicFile}`;
    
    audioRef.current.src = src;
    audioRef.current.loop = true;
    
    // Проверяем сохраненную позицию
    const lastPause = lastPauseTime.current[activeMusic.musicFile];
    const lastPos = lastPositions.current[activeMusic.musicFile];
    
    if (import.meta.env.DEV) console.log('[AUDIO] checking saved position for', activeMusic.musicFile, 'lastPause:', lastPause, 'lastPos:', lastPos, 'timeDiff:', lastPause ? Date.now() - lastPause : 'N/A');
    
    if (lastPause && Date.now() - lastPause < PAUSE_MEMORY && lastPos) {
      if (import.meta.env.DEV) console.log('[AUDIO] restoring position:', lastPos, 'for', activeMusic.musicFile);
      audioRef.current.currentTime = lastPos;
    } else {
      if (import.meta.env.DEV) console.log('[AUDIO] starting from beginning for', activeMusic.musicFile);
      audioRef.current.currentTime = 0;
    }
    
    // Для нового трека начинаем с 0 громкости, для того же трека - с текущей
    if (previousFile !== currentFile) {
      audioRef.current.volume = 0;
    }
    
    audioRef.current.play().catch(() => {});
    setFadeTarget(1);
    setAudioState({ playing: true, src: activeMusic.musicFile });
    previousMusicFileRef.current = currentFile;
  }, [activeMusic, muted]);

  // --- MUSIC: fade in/out и громкость (time-based, rAF) ---
  useEffect(() => {
    if (!audioRef.current) return;
    if (fadeRafId.current) cancelAnimationFrame(fadeRafId.current);

    const startVolume = clamp01(Number(audioRef.current.volume) || 0);
    const targetVolume = clamp01(fadeTarget * (muted ? 0 : volume));
    if (Math.abs(startVolume - targetVolume) < 0.005) {
      try { audioRef.current.volume = targetVolume; } catch {}
      // при полном затухании — пауза и сохранение позиции (только если не muted)
      if (targetVolume === 0 && !audioRef.current.paused && !muted) {
        const file = audioRef.current.src.split('/').pop();
        const currentTime = audioRef.current.currentTime;
        lastPauseTime.current[file] = Date.now();
        lastPositions.current[file] = currentTime;
        if (import.meta.env.DEV) console.log('[AUDIO] saving position on fade-out:', currentTime, 'for', file);
        audioRef.current.pause();
      }
      return;
    }

    const startTime = performance.now();
    const duration = FADE_DURATION;
    
    // Разные easing функции для fade-in и fade-out
    const easeInQuint = (t) => t * t * t * t * t; // медленное начало для fade-in
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3); // быстрое начало для fade-out
    const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // плавное для переключений
    
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - startTime) / duration));
      
      // Используем разные easing в зависимости от направления и контекста
      let eased;
      if (targetVolume > startVolume) {
        // Fade-in: используем очень плавное начало
        eased = easeInQuint(t);
      } else if (targetVolume === 0) {
        // Fade-out: быстрое затухание
        eased = easeOutCubic(t);
      } else {
        // Переключение громкости: плавное изменение
        eased = easeInOutCubic(t);
      }
      
      // Для того же трека используем более плавное изменение
      if (Math.abs(startVolume - targetVolume) < 0.1) {
        eased = easeInOutCubic(t);
      }
      
      const next = clamp01(startVolume + (targetVolume - startVolume) * eased);
      try { audioRef.current.volume = next; } catch {}
      if (t < 1) {
        fadeRafId.current = requestAnimationFrame(tick);
      } else {
        try { audioRef.current.volume = targetVolume; } catch {}
        fadeRafId.current = 0;
        if (targetVolume === 0 && !audioRef.current.paused && !muted) {
          const file = audioRef.current.src.split('/').pop();
          lastPauseTime.current[file] = Date.now();
          lastPositions.current[file] = audioRef.current.currentTime;
          audioRef.current.pause();
        }
      }
    };

    fadeRafId.current = requestAnimationFrame(tick);
    return () => {
      if (fadeRafId.current) cancelAnimationFrame(fadeRafId.current);
      fadeRafId.current = 0;
    };
  }, [fadeTarget, muted, volume]);

  // --- MUSIC: остановка при сворачивании/выключении экрана ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && audioRef.current && !audioRef.current.paused) {
        if (import.meta.env.DEV) console.log('[AUDIO] paused due to page hidden');
        audioRef.current.pause();
      } else if (!document.hidden && audioRef.current && audioRef.current.paused && activeMusic) {
        // Автоматически возобновляем воспроизведение при возвращении в зону
        if (import.meta.env.DEV) console.log('[AUDIO] resuming after page visible');
        audioRef.current.play().catch(e => {
          if (import.meta.env.DEV) console.warn('[AUDIO] resume failed:', e);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeMusic]);

  // --- MUSIC: логирование статуса ---
  useEffect(() => {
    const now = Date.now();
    if (audioState.playing && activeMusic && activeMusic.musicFile) {
      if (!window.__lastAudioPlayLog || now - window.__lastAudioPlayLog > 1000) {
        if (import.meta.env.DEV) console.log('[AUDIO] play:', activeMusic.musicFile);
        window.__lastAudioPlayLog = now;
      }
    } else {
      if (!window.__lastAudioPauseLog || now - window.__lastAudioPauseLog > 1000) {
        if (import.meta.env.DEV) console.log('[AUDIO] pause');
        window.__lastAudioPauseLog = now;
      }
    }
  }, [audioState.playing, activeMusic]);

  // Создаем стабильный обработчик скролла
  const handleScrollRef = useRef();
  
  // Обновляем обработчик скролла при изменении work
  useEffect(() => {
    handleScrollRef.current = () => {
      const viewportHeight = window.innerHeight;
      let found = null;
      // Проверяем, что все refs готовы
      const allRefsReady = imageBlockIndices.every((i) => windowRefs.current[i] != null);
      if (!allRefsReady) return;

      for (const i of imageBlockIndices) {
        const ref = windowRefs.current[i];
        if (!ref) continue;
        const rect = ref.getBoundingClientRect();
        const activationZone = viewportHeight;
        const isInActivationZone = rect.top <= viewportHeight + activationZone && rect.bottom >= 0;
        if (isInActivationZone) {
          if (found === null) {
            found = i;
          } else {
            const currentRect = windowRefs.current[found].getBoundingClientRect();
            const currentDist = Math.abs((currentRect.top + currentRect.bottom) / 2 - viewportHeight / 2);
            const newDist = Math.abs((rect.top + rect.bottom) / 2 - viewportHeight / 2);
            if (newDist < currentDist) found = i;
          }
        }
      }
      
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
  }, [work, imageBlockIndices]);

  // Следим за скроллом - создаем обработчик только один раз
  useEffect(() => {
    const handleScroll = () => {
      handleScrollRef.current();
    };
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      const timer = setTimeout(handleScroll, 100);
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        clearTimeout(timer);
      };
    }
  }, [work]);

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
          showVolumeControl={true}
        >
          {/* Кнопка отладки */}
          <button
            onClick={() => setDebugMode(!debugMode)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '27px',
              height: '27px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: debugMode ? '#ff6b6b' : 'inherit',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)',
              marginLeft: '6px'
            }}
            title={debugMode ? 'Отключить отладку' : 'Включить отладку'}
          >
            🐛
          </button>
          
          {headerVisible && (
            isMobile ? (
              <button className="hide-header-button" onClick={() => setHeaderVisible(false)}>
                <span className="button-multiline">
                  <span>Скрыть</span>
                  <span>меню</span>
                  <span>↑</span>
                </span>
              </button>
            ) : (
              <button className="hide-header-button" onClick={() => setHeaderVisible(false)}>
                <span>Скрыть меню ↑</span>
              </button>
            )
          )}
        </Header>
      </div>
      
      {/* Кнопка показать меню ↓дер — фиксирована в правом верхнем углу */}
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
              aria-hidden="true"
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
          position: 'relative',
          transform: headerVisible ? `translateY(${headerHeight}px)` : 'translateY(0)',
          transition: 'transform 0.3s ease, height 0.3s ease',
          height: headerVisible ? `calc(100vh - ${headerHeight}px)` : '100vh'
        }}
      >
        {/* Патчи для аудиомаркеров */}
        <Portal>
          {musicPatchRects.map((rect, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                top: rect.top,
                left: rect.left,
                width: '2px',
                height: '1em',
                background: 'var(--bg-color, #23233a)',
                pointerEvents: 'none',
                zIndex: 10,
                opacity: 1,
                borderRadius: '1px',
                boxSizing: 'border-box',
                transition: 'background 0.3s',
                willChange: 'top,left'
              }}
              aria-hidden="true"
            />
          ))}
        </Portal>

      {/* Отладочные прямоугольники */}
      {debugMode && (
        <Portal>
          {/* Зона просмотра */}
          <div
            style={{
              position: 'fixed',
              top: headerVisible ? headerHeight : 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100vw',
              height: '100vh',
              border: '2px solid rgba(255, 0, 0, 0.5)',
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              pointerEvents: 'none',
              zIndex: 9999
            }}
          />
          
          {/* Центр зоны просмотра */}
          <div
            style={{
              position: 'fixed',
              top: `calc(${headerVisible ? headerHeight : 0}px + 50vh)`,
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '20px',
              height: '20px',
              border: '2px solid rgba(0, 255, 0, 0.8)',
              backgroundColor: 'rgba(0, 255, 0, 0.3)',
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: 10000
            }}
          />
        </Portal>
      )}
        {work.blocks.map((block, i) => {
          if (block.type === 'text') {
            return (
              <div className="workreader-block no-radius" key={i}>{block.content}</div>
            );
          }
          if (block.type === 'image') {
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
          if (block.type === 'music') {
            return (
              <div key={i} style={{ position: 'relative' }}>
              <span
                ref={el => { musicRefs.current[i] = el; }}
                  className="music-marker"
                  aria-hidden="true"
                />
                {/* Отладочная зона музыки */}
                {debugMode && (
                  <div
                style={{
                  position: 'absolute',
                      top: '-50%',
                      left: '-50%',
                      width: '100%',
                      height: '100%',
                      border: '2px solid rgba(0, 0, 255, 0.6)',
                      backgroundColor: 'rgba(0, 0, 255, 0.1)',
                      borderRadius: '50%',
                  pointerEvents: 'none',
                      zIndex: 9998
                }}
              />
                )}
              </div>
            );
          }
          return null;
        })}
        
        {/* Блок концовки внутри скроллируемого контейнера */}
        <div className="workreader-footer">
          <div className="footer-content">
            <p> </p>
            <p>кто прочитал тот милашкааар </p>
            <p></p>
          </div>
        </div>
        <audio ref={audioRef} preload="auto" style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default WorkReader;
