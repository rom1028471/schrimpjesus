import React, { useState, useRef, useEffect, useMemo } from 'react';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import Header from '../Header/Header';
import './WorkReader.css';
import { useSound } from '../../contexts/SoundContext';

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
  const [musicDebugBands, setMusicDebugBands] = useState([]);
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

  // Debug: рассчитываем полосы активации аудио внутри скролл-контейнера (во всю ширину контейнера)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !work?.blocks) return;
    const containerRect = container.getBoundingClientRect();
    const clientH = container.clientHeight;
    const scrollTop = container.scrollTop;
    const bands = [];
    for (const i of musicBlockIndices) {
      const el = musicRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const centerViewportY = (r.top + r.bottom) / 2;
      const centerInContainer = centerViewportY - containerRect.top + scrollTop;
      const radius = typeof work.blocks[i].radius === 'number' ? work.blocks[i].radius : DEFAULT_MUSIC_RADIUS;
      const activationZone = clientH * radius;
      const top = centerInContainer - activationZone;
      const height = activationZone * 2;
      // Рендерим только те полосы, которые пересекают видимую область контейнера
      if (top <= scrollTop + clientH && top + height >= scrollTop) {
        bands.push({ top, height });
      }
    }
    setMusicDebugBands(bands);
  }, [work, musicBlockIndices, headerVisible, headerHeight]);

  // Обновляем полосы при ресайзе и скролле контейнера
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const updateBands = () => {
      const containerRect = container.getBoundingClientRect();
      const clientH = container.clientHeight;
      const scrollTop = container.scrollTop;
      const bands = [];
      for (const i of musicBlockIndices) {
        const el = musicRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const centerViewportY = (r.top + r.bottom) / 2;
        const centerInContainer = centerViewportY - containerRect.top + scrollTop;
        const radius = typeof work.blocks[i].radius === 'number' ? work.blocks[i].radius : DEFAULT_MUSIC_RADIUS;
        const activationZone = clientH * radius;
        const top = centerInContainer - activationZone;
        const height = activationZone * 2;
        if (top <= scrollTop + clientH && top + height >= scrollTop) {
          bands.push({ top, height });
        }
      }
      setMusicDebugBands(bands);
    };
    const onResize = () => updateBands();
    window.addEventListener('resize', onResize);
    container.addEventListener('scroll', updateBands, { passive: true });
    // первый прогон
    setTimeout(updateBands, 50);
    return () => {
      window.removeEventListener('resize', onResize);
      container.removeEventListener('scroll', updateBands);
    };
  }, [work, musicBlockIndices, headerVisible, headerHeight]);
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

  // Viewport-фиксированные debug-оверлеи удалены. В отладке рисуем только аудио-полосы внутри скролл-контейнера.

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
          let actualHeight = (actualWidth / img.naturalWidth) * img.naturalHeight;
          
          // Ограничиваем максимальную высоту до 75% от высоты экрана
          const maxHeight = window.innerHeight * 0.75;
          if (actualHeight > maxHeight) {
            actualHeight = maxHeight;
          }
          
          // Адаптивный множитель на основе высоты изображения
          let multiplier;
          if (actualHeight > 600) {        // Очень высокие изображения
            multiplier = 1.05;
          } else if (actualHeight > 400) {  // Высокие изображения
            multiplier = 1.1;
          } else if (actualHeight > 200) {  // Средние изображения
            multiplier = 1.3;
          } else {                          // Низкие изображения
            multiplier = 2.5; // Увеличен для ПК
          }
          
          const windowHeight = actualHeight * multiplier;
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
          let actualHeight = (actualWidth / naturalWidth) * imageHeights.current[i];
          
          // Ограничиваем максимальную высоту до 75% от высоты экрана
          const maxHeight = window.innerHeight * 0.75;
          if (actualHeight > maxHeight) {
            actualHeight = maxHeight;
          }
          
          // Адаптивный множитель на основе высоты изображения
          let multiplier;
          if (actualHeight > 600) {        // Очень высокие изображения
            multiplier = 1.05;
          } else if (actualHeight > 400) {  // Высокие изображения
            multiplier = 1.1;
          } else if (actualHeight > 200) {  // Средние изображения
            multiplier = 1.3;
          } else {                          // Низкие изображения
            multiplier = 2.5; // Увеличен для ПК
          }
          
          setWindowHeights(prev => ({ ...prev, [i]: actualHeight * multiplier }));
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
      if (debugMode && now - lastLog.current > 1000) {
        if (scrollRef.current && import.meta.env.DEV) {
          const pos = scrollRef.current.scrollTop;
          console.log('[AUDIO] scroll pos:', pos);
        }
        lastLog.current = now;
      }
      if (!scrollRef.current) return;
      const viewportHeight = window.innerHeight;
      const contentTop = headerVisible ? headerHeight : 0;
      const contentHeight = Math.max(0, viewportHeight - contentTop);
      const contentCenter = contentTop + contentHeight / 2;
      let found = null;
      const dists = [];
      // Группируем кандидатов по имени файла и выбираем ближайшую к центру группу
      const groups = new Map(); // musicFile -> [{ idx, dist, radius }]
      for (const i of musicBlockIndices) {
        const ref = musicRefs.current[i];
        if (!ref) continue;
        const rect = ref.getBoundingClientRect();
        const center = (rect.top + rect.bottom) / 2;
        const dist = Math.abs(center - contentCenter);
        const radius = typeof work.blocks[i].radius === 'number' ? work.blocks[i].radius : DEFAULT_MUSIC_RADIUS;
        const activationZone = contentHeight * radius;
        if (debugMode) dists.push({ file: work.blocks[i].musicFile, dist, activationZone });
        if (center >= contentTop && center <= contentTop + contentHeight && dist < activationZone) {
          const file = work.blocks[i].musicFile;
          if (!groups.has(file)) groups.set(file, []);
          groups.get(file).push({ idx: i, dist, radius });
        }
      }
      if (debugMode && dists.length && import.meta.env.DEV && now - lastDistsLog > 1000) {
        console.log('[AUDIO] dists:', dists);
        lastDistsLog = now;
      }
      if (groups.size) {
        let bestGroup = null;
        let minGroupDist = Infinity;

        for (const [file, candidates] of groups.entries()) {
          // Находим минимальную дистанцию для каждой группы
          const groupMinDist = Math.min(...candidates.map(c => c.dist));
          if (groupMinDist < minGroupDist) {
            minGroupDist = groupMinDist;
            bestGroup = { file, candidates };
          }
        }

        if (bestGroup) {
          // Внутри лучшей группы выбираем ближайшего кандидата для `idx`
          const bestCandidate = bestGroup.candidates.reduce((best, current) => 
            current.dist < best.dist ? current : best
          );
          found = { musicFile: bestGroup.file, idx: bestCandidate.idx, radius: bestCandidate.radius };
        }
      }

      const prev = currentActiveRef.current;

      // Гистерезис: если новый активный трек не найден, но предыдущий все еще в зоне активации — оставляем его
      if (!found && prev && prev.musicFile) {
        const prevGroupCandidates = [];
        for (let i = 0; i < work.blocks.length; i++) {
          if (work.blocks[i].musicFile === prev.musicFile && musicRefs.current[i]) {
            const r = musicRefs.current[i].getBoundingClientRect();
            const center = (r.top + r.bottom) / 2;
            const dist = Math.abs(center - contentCenter);
            const radius = typeof work.blocks[i].radius === 'number' ? work.blocks[i].radius : DEFAULT_MUSIC_RADIUS;
            const activationZone = contentHeight * radius;
            // Проверяем, находится ли хоть одна из под-зон старого трека в расширенной зоне активации
            if (center >= contentTop && center <= contentTop + contentHeight && dist < activationZone * 1.25) {
              prevGroupCandidates.push({ dist });
            }
          }
        }
        if (prevGroupCandidates.length > 0) {
          found = prev; // Удерживаем трек активным
        }
      }

      // Не обновляем state, если трек не изменился
      if ((prev?.musicFile || null) === (found?.musicFile || null)) {
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
  }, [work, musicBlockIndices, headerVisible, headerHeight, debugMode]);

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
        if (import.meta.env.DEV && debugMode) console.log('[AUDIO] saving position on switch:', audioRef.current.currentTime, 'for', previousFile);
      }
    }

    // Если выходим из зоны - сохраняем позицию и останавливаем
    if (!activeMusic || !activeMusic.musicFile || muted) {
      if (import.meta.env.DEV && debugMode) console.log('[AUDIO] exiting zone, previousFile:', previousFile, 'currentFile:', currentFile);
      if (import.meta.env.DEV && debugMode) console.log('[AUDIO] audioRef.src:', audioRef.current?.src);
      if (previousFile && audioRef.current.src) {
        // Извлекаем имя файла из URL
        const urlFileName = audioRef.current.src.split('/').pop();
        const decodedFileName = decodeURIComponent(urlFileName);
        
        if (decodedFileName === previousFile) {
          lastPauseTime.current[previousFile] = Date.now();
          lastPositions.current[previousFile] = audioRef.current.currentTime;
          if (import.meta.env.DEV && debugMode) console.log('[AUDIO] saving position on exit:', audioRef.current.currentTime, 'for', previousFile);
        } else {
          if (import.meta.env.DEV && debugMode) console.log('[AUDIO] filename mismatch, decoded:', decodedFileName, 'vs previousFile:', previousFile);
          // Сохраняем позицию в любом случае
          lastPauseTime.current[previousFile] = Date.now();
          lastPositions.current[previousFile] = audioRef.current.currentTime;
          if (import.meta.env.DEV && debugMode) console.log('[AUDIO] forcing save position:', audioRef.current.currentTime, 'for', previousFile);
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
        // Для того же трека: если был на паузе (fade-out дошел до 0) — стартуем с 0 и поднимаем, иначе поднимаем с текущего уровня
        if (audioRef.current.paused) {
          try { audioRef.current.volume = 0; } catch {}
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
    
    if (import.meta.env.DEV && debugMode) console.log('[AUDIO] checking saved position for', activeMusic.musicFile, 'lastPause:', lastPause, 'lastPos:', lastPos, 'timeDiff:', lastPause ? Date.now() - lastPause : 'N/A');
    
    if (lastPause && Date.now() - lastPause < PAUSE_MEMORY && lastPos) {
      if (import.meta.env.DEV && debugMode) console.log('[AUDIO] restoring position:', lastPos, 'for', activeMusic.musicFile);
      audioRef.current.currentTime = lastPos;
    } else {
      if (import.meta.env.DEV && debugMode) console.log('[AUDIO] starting from beginning for', activeMusic.musicFile);
      audioRef.current.currentTime = 0;
    }
    
    // Любой старт трека — с 0 громкости (даже если это тот же трек после выхода из зоны)
    try { audioRef.current.volume = 0; } catch {}
    
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

  // --- MUSIC: логирование через события аудио ---
  useEffect(() => {
    if (!audioRef.current) return;
    const onPlay = () => {
      if (import.meta.env.DEV && debugMode) {
        const src = audioRef.current.src?.split('/')?.pop();
        console.log('[AUDIO] play:', decodeURIComponent(src || ''));
      }
    };
    const onPause = () => {
      if (import.meta.env.DEV && debugMode) console.log('[AUDIO] pause');
    };
    const el = audioRef.current;
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [debugMode]);

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
        {/* Debug: аудиозоны в скролл-контейнере, во всю ширину контейнера */}
        {debugMode && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              pointerEvents: 'none',
              zIndex: 5
            }}
          >
            {musicDebugBands.map((b, idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  top: b.top,
                  left: 0,
                  right: 0,
                  height: b.height,
                  backgroundColor: 'rgba(0, 122, 255, 0.12)',
                  borderTop: '1px dashed rgba(0, 122, 255, 0.6)',
                  borderBottom: '1px dashed rgba(0, 122, 255, 0.6)'
                }}
              />
            ))}
          </div>
        )}

      {/* Не подсвечиваем картинки и не рисуем viewport-оверлеи в debug-режиме — только аудио-зоны в контейнере */}
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
