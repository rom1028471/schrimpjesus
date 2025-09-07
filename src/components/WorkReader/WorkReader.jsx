import React, { useState, useRef, useEffect, useMemo } from 'react';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import Header from '../Header/Header';
import './WorkReader.css';
import { useSound } from '../../contexts/SoundContext';

const VISIBILITY_OFFSET = 0.2; // 20% запас
const MAX_WIDTH = 900;

const DEFAULT_MUSIC_RADIUS = 0.3;
const FADE_IN_MS = 5000; // плавный вход 5 секунд
const FADE_OUT_MS = 3000; // затухание 3 секунды
const PAUSE_MEMORY_MS = 30000; // 30 секунд
const MIN_SWITCH_INTERVAL_MS = 220; // анти-дребезг переключений
const MIN_STABLE_LEAD_MS = 180; // кандидат должен удерживаться лидером по времени
const NOZONE_GRACE_MS = 250; // удерживаем предыдущий трек короткое время, если центр кратковременно вне зон

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
  const generationRef = useRef(0); // токен для отмены гонок
  const fadeDurationRef = useRef(FADE_IN_MS);
  const lastSwitchTimeRef = useRef(0);
  const stableCandidateRef = useRef({ candidate: null, since: 0 });
  const lastFoundTimeRef = useRef(0);

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

  // --- MUSIC: refs и константы для аудио ---
  const lastValidMusicRef = useRef(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3; // Максимальное количество попыток воспроизведения
  
  useEffect(() => {
    musicRefs.current = new Array(work.blocks.length).fill(null);
  }, [work]);

  // --- MUSIC: обработка скролла и активация (по центру области просмотра контейнера) ---
  useEffect(() => {
    let lastDistsLog = 0;
    let lastProcessed = 0;
    const THROTTLE_MS = 16; // Уменьшаем троттлинг для более отзывчивого скролла (60fps)
    
    const handleMusic = () => {
      const now = Date.now();
      if (now - lastProcessed < THROTTLE_MS) return;
      lastProcessed = now;
      
      if (debugMode && now - lastLog.current > 1000) {
        if (scrollRef.current && import.meta.env.DEV) {
          const pos = scrollRef.current.scrollTop;
          console.log('[AUDIO] scroll pos:', pos);
        }
        lastLog.current = now;
      }
      
      const container = scrollRef.current;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const clientH = container.clientHeight;
      const scrollTop = container.scrollTop;
      const contentCenter = scrollTop + clientH / 2;
      
      let candidates = [];
      const dists = [];
      
      // Собираем все зоны, пересекающиеся с центром экрана
      for (const i of musicBlockIndices) {
        const el = musicRefs.current[i];
        if (!el) continue;
        
        const r = el.getBoundingClientRect();
        const centerViewportY = (r.top + r.bottom) / 2;
        const centerInContainer = centerViewportY - containerRect.top + scrollTop;
        const radius = typeof work.blocks[i].radius === 'number' ? work.blocks[i].radius : DEFAULT_MUSIC_RADIUS;
        const activationZone = clientH * radius;
        const zoneTop = centerInContainer - activationZone;
        const zoneBottom = centerInContainer + activationZone;
        const distToCenter = Math.abs(centerInContainer - contentCenter);
        const normalizedDist = distToCenter / activationZone; // 0..1 - насколько близко к центру зоны
        
        if (debugMode) dists.push({ 
          file: work.blocks[i].musicFile, 
          dist: distToCenter, 
          zoneTop, 
          zoneBottom,
          normalizedDist,
          inZone: contentCenter >= zoneTop && contentCenter <= zoneBottom
        });
        
        // Если центр экрана внутри зоны, добавляем в кандидаты
        if (contentCenter >= zoneTop && contentCenter <= zoneBottom) {
          candidates.push({
            musicFile: work.blocks[i].musicFile,
            idx: i,
            radius,
            centerInContainer,
            dist: distToCenter,
            normalizedDist,
            priority: 1 - normalizedDist // Приоритет: чем ближе к центру зоны, тем выше
          });
        }
      }
      
      // Сортируем кандидатов по приоритету (ближе к центру зоны = выше приоритет)
      candidates.sort((a, b) => b.priority - a.priority);
      let found = candidates[0] || null;
      if (found) lastFoundTimeRef.current = now;
      
      if (debugMode && dists.length && import.meta.env.DEV && now - lastDistsLog > 1000) {
        console.log('[AUDIO] audio zones:', dists);
        console.log('[AUDIO] selected candidate:', found);
        lastDistsLog = now;
      }
      if (debugMode && dists.length && import.meta.env.DEV && now - lastDistsLog > 1000) {
        console.log('[AUDIO] dists:', dists);
        lastDistsLog = now;
      }

      const prev = currentActiveRef.current;

      // Временной гистерезис: кандидат должен удерживаться лидером MIN_STABLE_LEAD_MS
      if (found && (!stableCandidateRef.current.candidate || stableCandidateRef.current.candidate.musicFile !== found.musicFile)) {
        stableCandidateRef.current = { candidate: found, since: now };
      }
      // Применяем стабилизацию ТОЛЬКО если уже был предыдущий активный трек
      if (prev && found && stableCandidateRef.current.candidate && stableCandidateRef.current.candidate.musicFile === found.musicFile) {
        if (now - stableCandidateRef.current.since < MIN_STABLE_LEAD_MS) {
          // недостаточно стабильно — оставляем предыдущий активный
          found = prev;
        }
      }

      // Минимальный интервал между переключениями (не мешает первому запуску, если prev отсутствует)
      if (found && prev && found.musicFile !== prev.musicFile) {
        if (now - lastSwitchTimeRef.current < MIN_SWITCH_INTERVAL_MS) {
          found = prev;
        }
      }

      // Гистерезис: если новый активный трек не найден, но предыдущий все еще в зоне активации — оставляем его
      if (!found && prev && prev.musicFile) {
        for (let i = 0; i < work.blocks.length; i++) {
          if (work.blocks[i].musicFile === prev.musicFile && musicRefs.current[i]) {
            const r = musicRefs.current[i].getBoundingClientRect();
            const centerViewportY = (r.top + r.bottom) / 2;
            const centerInContainer = centerViewportY - containerRect.top + scrollTop;
            const radius = typeof work.blocks[i].radius === 'number' ? work.blocks[i].radius : DEFAULT_MUSIC_RADIUS;
            const activationZone = clientH * radius;
            const zoneTop = centerInContainer - activationZone;
            const zoneBottom = centerInContainer + activationZone;
            if (contentCenter >= zoneTop && contentCenter <= zoneBottom) {
              found = {
                ...prev,
                centerInContainer,
                radius,
                dist: Math.abs(centerInContainer - contentCenter)
              };
              break;
            }
          }
        }
        // Если всё ещё не нашли — кратковременно удерживаем предыдущий активный без изменения границ зон
        if (!found && now - lastFoundTimeRef.current < NOZONE_GRACE_MS) found = prev;
      }

      // Если трек не изменился, но находится на паузе - возобновляем
      if ((prev?.musicFile || null) === (found?.musicFile || null)) {
        if (audioRef.current && found) {
          lastValidMusicRef.current = found; // Обновляем последний валидный трек
          if (audioRef.current.paused) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(e => {
                console.warn('Resume failed, retrying...', e);
                // Пробуем еще раз с экспоненциальной задержкой
                const delay = Math.min(100 * Math.pow(2, retryCountRef.current), 1000);
                retryCountRef.current = Math.min(retryCountRef.current + 1, MAX_RETRIES);
                setTimeout(() => {
                  if (audioRef.current && lastValidMusicRef.current === found) {
                    audioRef.current.play().catch(console.warn);
                  }
                }, delay);
              }).then(() => {
                retryCountRef.current = 0; // Сбрасываем счетчик при успешном воспроизведении
              });
            }
          }
          if (fadeTarget < 0.1) {
            setFadeTarget(1);
          }
        }
        return;
      }
      currentActiveRef.current = found;
      setActiveMusic(found);
      if ((prev?.musicFile || null) !== (found?.musicFile || null)) {
        lastSwitchTimeRef.current = now;
        generationRef.current += 1; // новое поколение для отмены гонок
      }
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
    const isSameFile = previousFile && currentFile && previousFile === currentFile;

    // Сохраняем позицию предыдущего трека при переключении
    if (previousFile && !isSameFile) {
      if (audioRef.current.src && audioRef.current.src.endsWith(previousFile)) {
        const currentTime = audioRef.current.currentTime;
        lastPauseTime.current[previousFile] = Date.now();
        lastPositions.current[previousFile] = currentTime;
        if (import.meta.env.DEV && debugMode) {
          console.log('[AUDIO] saving position on switch:', currentTime, 'for', previousFile);
        }
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
      // быстрый fade-out при выходе
      fadeDurationRef.current = FADE_OUT_MS;
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
        // Для того же трека: если был на паузе (fade-out дошел до 0) — стартуем с 0 и поднимаем
        if (audioRef.current.paused) {
          try { 
            audioRef.current.volume = 0; 
            // Принудительно сбрасываем позицию, если трек только что был на паузе
            const lastPause = lastPauseTime.current[activeMusic.musicFile] || 0;
            if (Date.now() - lastPause < 1000) { // Если пауза была недавно
              audioRef.current.currentTime = 0;
            }
            audioRef.current.play().catch(e => {
              if (import.meta.env.DEV) console.warn('[AUDIO] play failed:', e);
            });
          } catch (e) {
            if (import.meta.env.DEV) console.warn('[AUDIO] volume set failed:', e);
          }
        }
        // мягкий вход
        fadeDurationRef.current = FADE_IN_MS;
        setFadeTarget(1);
        setAudioState(s => ({
          ...s, 
          playing: true, 
          src: activeMusic.musicFile,
          lastActive: Date.now()
        }));
        previousMusicFileRef.current = currentFile;
        return;
      }
    }

    // Новый трек или перезапуск того же трека
    const base = import.meta.env.BASE_URL || '/';
    const src = `${base}assets/audio/${activeMusic.musicFile}`;
    
    // Для нового трека полностью сбрасываем состояние
    const isNewTrack = previousMusicFileRef.current !== activeMusic.musicFile;
    
    // Останавливаем и сбрасываем текущее воспроизведение
    try {
      const currentSrcFile = audioRef.current.src ? decodeURIComponent(audioRef.current.src.split('/').pop()) : null;
      const sameSrc = currentSrcFile === activeMusic.musicFile;
      audioRef.current.pause();
      // если тот же src, не переустанавливаем src, только сбрасываем позицию и громкость
      if (!sameSrc) {
        audioRef.current.src = src;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 0;
      audioRef.current.loop = true;
      
      // Восстанавливаем позицию при наличии сохранения (в пределах окна памяти)
      {
        const fileKey = activeMusic.musicFile;
        const lastPause = lastPauseTime.current[fileKey];
        if (lastPause) {
          if (Date.now() - lastPause < PAUSE_MEMORY_MS) {
            const savedPos = lastPositions.current[fileKey];
            if (savedPos !== undefined) {
              audioRef.current.currentTime = savedPos;
            }
          } else {
            // срок хранения истёк — очищаем
            delete lastPauseTime.current[fileKey];
            delete lastPositions.current[fileKey];
          }
        }
      }
    } catch (e) {
      console.warn('Failed to reset audio state:', e);
    }
    
    // Устанавливаем состояние до начала воспроизведения
    setAudioState({ playing: true, src: activeMusic.musicFile });
    
    // Для нового трека сбрасываем fade target
    if (isNewTrack) {
      if (import.meta.env.DEV) console.log('[AUDIO] new track detected, resetting fade');
      fadeDurationRef.current = FADE_IN_MS;
      setFadeTarget(0);
    } else {
      // Для существующего трека начинаем с текущей громкости
      if (audioRef.current) {
        audioRef.current.volume = 0; // Начинаем с 0 даже для существующего трека
      }
    }
    
    // Обновляем предыдущий трек
    previousMusicFileRef.current = activeMusic.musicFile;
    lastValidMusicRef.current = activeMusic;
    
    // Запускаем воспроизведение с экспоненциальной задержкой при ошибках
    const attemptPlay = (attempt = 0, gen = generationRef.current) => {
      if (!audioRef.current || lastValidMusicRef.current !== activeMusic) return;
      if (gen !== generationRef.current) return; // отмена старых попыток
      
      const isNewTrack = previousMusicFileRef.current !== activeMusic.musicFile;
      
      // Всегда сбрасываем громкость перед воспроизведением
      try {
        if (isNewTrack) {
          audioRef.current.volume = 0;
          if (import.meta.env.DEV) console.log('[AUDIO] reset volume to 0 for new track');
        } else {
          // Для существующего трека начинаем с 0 и плавно поднимаем
          audioRef.current.volume = 0;
        }
      } catch (e) {
        console.warn('Failed to reset volume:', e);
      }
      
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[AUDIO] playback started successfully');
            // Для нового трека всегда запускаем fade-in
            if (isNewTrack) {
              if (import.meta.env.DEV) console.log('[AUDIO] starting fade-in for new track');
              fadeDurationRef.current = FADE_IN_MS;
              if (gen === generationRef.current) setFadeTarget(1);
            } else if (fadeTarget < 0.1) {
              // Для существующего трека только если не в процессе fade-out
              fadeDurationRef.current = FADE_IN_MS;
              if (gen === generationRef.current) setFadeTarget(1);
            }
            retryCountRef.current = 0;
          })
          .catch(e => {
            if (e.name === 'AbortError') {
              console.log('[AUDIO] Playback aborted, likely due to track change');
              return; // Не пытаемся повторить, если воспроизведение было прервано
            }
            
            if (attempt < MAX_RETRIES) {
              const delay = Math.min(100 * Math.pow(2, attempt), 1000);
              console.warn(`[AUDIO] Playback attempt ${attempt + 1} failed, retrying in ${delay}ms...`, e);
              setTimeout(() => attemptPlay(attempt + 1, gen), delay);
            } else {
              console.error('[AUDIO] Max playback retries reached', e);
            }
          });
      }
    };
    
    attemptPlay(0, generationRef.current);
  }, [activeMusic, muted]);

  // --- MUSIC: fade in/out и громкость (time-based, rAF) ---
  useEffect(() => {
    if (!audioRef.current) return;
    if (fadeRafId.current) cancelAnimationFrame(fadeRafId.current);

    // Не сбрасываем громкость здесь, чтобы не мешать анимации затухания
    // Громкость будет установлена в startVolume ниже

    const startVolume = clamp01(Number(audioRef.current.volume) || 0);
    const targetVolume = clamp01(fadeTarget * (muted ? 0 : volume));
    const gen = generationRef.current;
    
    // Минимальное изменение громкости для срабатывания анимации
    if (Math.abs(startVolume - targetVolume) < 0.001) {
      try { 
        audioRef.current.volume = targetVolume; 
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[AUDIO] volume set failed:', e);
      }
      
      // При полном затухании — пауза и сохранение позиции (только если не muted)
      if (targetVolume === 0) {
        const file = audioRef.current?.src?.split('/')?.pop();
        if (file) {
          const currentTime = audioRef.current.currentTime;
          lastPauseTime.current[file] = Date.now();
          lastPositions.current[file] = currentTime;
          if (import.meta.env.DEV) console.log('[AUDIO] saving position on fade-out:', currentTime, 'for', file);
          // Пауза только если это не текущий активный трек
          if (activeMusic?.musicFile !== file) {
            try {
              audioRef.current.pause();
            } catch (e) {
              console.warn('Pause failed:', e);
            }
          }
        }
      }
      return;
    }

    const startTime = performance.now();
    const duration = targetVolume > startVolume ? FADE_IN_MS : FADE_OUT_MS;
    
    // Разные easing функции для fade-in и fade-out
    const easeInQuint = (t) => t * t * t * t * t; // медленное начало для fade-in
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3); // быстрое начало для fade-out
    const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // плавное для переключений
    
    const tick = (now) => {
      if (gen !== generationRef.current) {
        // отменяем устаревшую анимацию
        fadeRafId.current = 0;
        return;
      }
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
        // При достижении нулевой громкости ставим на паузу и сохраняем позицию
        if (targetVolume === 0) {
          const file = audioRef.current.src.split('/').pop();
          if (file) {
            lastPauseTime.current[file] = Date.now();
            lastPositions.current[file] = audioRef.current.currentTime;
            if (activeMusic?.musicFile !== file) {
              try {
                audioRef.current.pause();
              } catch (e) {
                console.warn('Pause after fade failed:', e);
              }
            }
          }
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

  // --- MUSIC: автопродолжение при включении звука кнопкой в хедере ---
  useEffect(() => {
    if (!audioRef.current) return;
    if (!muted) {
      const candidate = currentActiveRef.current || lastValidMusicRef.current;
      if (candidate && candidate.musicFile) {
        // Убедимся, что источник корректный
        const base = import.meta.env.BASE_URL || '/';
        const desiredSrc = `${base}assets/audio/${candidate.musicFile}`;
        const currentSrcFile = audioRef.current.src ? decodeURIComponent(audioRef.current.src.split('/').pop()) : null;
        if (currentSrcFile !== candidate.musicFile) {
          try { audioRef.current.src = desiredSrc; } catch {}
          try { audioRef.current.currentTime = 0; } catch {}
        }
        // Восстанавливаем позицию, если есть актуальная
        const lastPause = lastPauseTime.current[candidate.musicFile];
        if (lastPause && Date.now() - lastPause < PAUSE_MEMORY_MS) {
          const savedPos = lastPositions.current[candidate.musicFile];
          if (savedPos !== undefined) {
            try { audioRef.current.currentTime = savedPos; } catch {}
          }
        }
        // Запускаем с плавным входом
        fadeDurationRef.current = FADE_IN_MS;
        generationRef.current += 1;
        setFadeTarget(1);
        audioRef.current.volume = 0;
        audioRef.current.loop = true;
        const gen = generationRef.current;
        audioRef.current.play().catch(e => {
          if (import.meta.env.DEV) console.warn('[AUDIO] resume on unmute failed:', e);
          // Пытаемся повторно
          setTimeout(() => {
            if (gen === generationRef.current) {
              audioRef.current.play().catch(()=>{});
            }
          }, 150);
        });
        // Обновим ссылки
        previousMusicFileRef.current = candidate.musicFile;
        lastValidMusicRef.current = candidate;
        setActiveMusic(candidate);
      }
    } else {
      // При выключении — мягкое затухание
      fadeDurationRef.current = FADE_OUT_MS;
      setFadeTarget(0);
    }
  }, [muted]);

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
              bottom: 0,
              minHeight: '100%',
              pointerEvents: 'none',
              zIndex: 5
            }}
          >
            {/* Статичная линия центра области просмотра контейнера */}
            <div className="debug-center-line" />
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
