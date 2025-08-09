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

  // --- MUSIC: управление аудио ---
  useEffect(() => {
    if (!audioRef.current) return;

    const previousFile = previousMusicFileRef.current;
    const currentFile = activeMusic?.musicFile;

    // Если переключаемся на другой трек — сохраняем позицию предыдущего
    if (
      previousFile &&
      currentFile &&
      previousFile !== currentFile &&
      audioRef.current.src &&
      audioRef.current.src.endsWith(previousFile)
    ) {
      lastPauseTime.current[previousFile] = Date.now();
      lastPositions.current[previousFile] = audioRef.current.currentTime;
    }

    if (!activeMusic || !activeMusic.musicFile || muted) {
      setFadeTarget(0);
      setAudioState(s => ({ ...s, playing: false }));
      if (activeMusic && audioRef.current.src && audioRef.current.src.endsWith(activeMusic.musicFile)) {
        lastPauseTime.current[activeMusic.musicFile] = Date.now();
        lastPositions.current[activeMusic.musicFile] = audioRef.current.currentTime;
      }
      previousMusicFileRef.current = currentFile || null;
      return;
    }

    // Если уже играет этот же трек — поднимаем громкость и гарантируем play()
    if (audioRef.current.src && audioRef.current.src.endsWith(activeMusic.musicFile)) {
      audioRef.current.loop = true;
      if (audioRef.current.paused) {
        try { audioRef.current.volume = 0; } catch {}
        Promise.resolve(audioRef.current.play()).catch(() => {});
      }
      setFadeTarget(1);
      setAudioState(s => ({ ...s, playing: true, src: activeMusic.musicFile }));
      previousMusicFileRef.current = currentFile;
      return;
    }

    // Новый трек — переключаем с возможным восстановлением позиции
    const base = import.meta.env.BASE_URL || '/';
    const src = `${base}assets/audio/${activeMusic.musicFile}`;
    audioRef.current.src = src;
    const lastPause = lastPauseTime.current[activeMusic.musicFile];
    const lastPos = lastPositions.current[activeMusic.musicFile];
    if (lastPause && Date.now() - lastPause < PAUSE_MEMORY && lastPos) {
      audioRef.current.currentTime = lastPos;
    } else {
      audioRef.current.currentTime = 0;
    }
    audioRef.current.loop = true;
    try { audioRef.current.volume = 0; } catch {}
    Promise.resolve(audioRef.current.play()).catch(() => {});
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
      // при полном затухании — пауза и сохранение позиции
      if (targetVolume === 0 && !audioRef.current.paused) {
        const file = audioRef.current.src.split('/').pop();
        lastPauseTime.current[file] = Date.now();
        lastPositions.current[file] = audioRef.current.currentTime;
        audioRef.current.pause();
      }
      return;
    }

    const startTime = performance.now();
    const duration = FADE_DURATION;
    const smoothstep = (t) => t * t * (3 - 2 * t); // мягкое начало/конец

    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - startTime) / duration));
      const eased = smoothstep(t);
      const next = clamp01(startVolume + (targetVolume - startVolume) * eased);
      try { audioRef.current.volume = next; } catch {}
      if (t < 1) {
        fadeRafId.current = requestAnimationFrame(tick);
      } else {
        try { audioRef.current.volume = targetVolume; } catch {}
        fadeRafId.current = 0;
        if (targetVolume === 0 && !audioRef.current.paused) {
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
              <span
                key={i}
                ref={el => { musicRefs.current[i] = el; }}
                className="music-marker"
                aria-hidden="true"
              />
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
