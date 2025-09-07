import { useState, useEffect, useMemo, useRef } from 'react';
import './WorkIntro.css';

const WorkIntro = ({ work, onStartReading, onBack, onPrimeAudio }) => {
  const [currentLine, setCurrentLine] = useState(-1);
  const [showButton, setShowButton] = useState(false);
  const [showReadingStats, setShowReadingStats] = useState(false);
  const [showDownloadHint, setShowDownloadHint] = useState(false);
  const [showDownloadBtn, setShowDownloadBtn] = useState(false);

  const [preloadProgress, setPreloadProgress] = useState(0); // 0..1
  const [preloadDone, setPreloadDone] = useState(false);
  const [showSecondButton, setShowSecondButton] = useState(false);
  const [showThirdButton, setShowThirdButton] = useState(false);
  const [firstButtonClicked, setFirstButtonClicked] = useState(false);
  const [secondButtonClicked, setSecondButtonClicked] = useState(false);
  const [showWaitTip, setShowWaitTip] = useState(false);
  const tipTimerRef = useRef(null);

  // Правильный base URL для dev и production
  const base = import.meta.env.BASE_URL || '/';

  // Собираем список медиа для предзагрузки
  const mediaToPreload = useMemo(() => {
    const urls = [];
    if (work?.blocks?.length) {
      for (const b of work.blocks) {
        if (b.type === 'image' && b.imageFile) {
          urls.push(`${base}assets/images/${b.imageFile}`);
        }
        if (b.type === 'music' && b.musicFile) {
          urls.push(`${base}assets/audio/${b.musicFile}`);
        }
      }
    }
    if (work?.coverImage) {
      urls.push(`${base}assets/images/${work.coverImage}`);
    }
    return urls;
  }, [work, base]);

  // Предзагрузка медиа во время интро
  useEffect(() => {
    if (!mediaToPreload || mediaToPreload.length === 0) {
      setPreloadDone(true);
      return;
    }
    // Используем уже подготовленные абсолютные пути без повторного добавления BASE_URL
    const mediaUrls = mediaToPreload;

    let isMounted = true;
    
    const preload = async () => {
      try {
        const fetchWithRetry = async (url, attempts = 3) => {
          for (let i = 0; i < attempts; i++) {
            try {
              // Для аудио файлов проверяем готовность к воспроизведению
              if (url.includes('/audio/')) {
                const audio = new Audio();
                audio.preload = 'auto';
                
                return new Promise((resolve) => {
                  let resolved = false;
                  
                  const cleanup = () => {
                    if (resolved) return;
                    resolved = true;
                    audio.removeEventListener('canplaythrough', onCanPlay);
                    audio.removeEventListener('error', onError);
                    audio.removeEventListener('loadstart', onLoadStart);
                  };
                  
                  const onCanPlay = () => {
                    cleanup();
                    resolve(true);
                  };
                  
                  const onError = (e) => {
                    cleanup();
                    if (import.meta.env.DEV) console.warn('Audio preload error:', url, e);
                    resolve(false);
                  };
                  
                  const onLoadStart = () => {
                    // Убираем таймаут - ждем до полной загрузки
                    if (import.meta.env.DEV) console.log('Audio preload started:', url);
                  };
                  
                  audio.addEventListener('canplaythrough', onCanPlay);
                  audio.addEventListener('error', onError);
                  audio.addEventListener('loadstart', onLoadStart);
                  
                  audio.src = url;
                });
              } else {
                // Для изображений используем более надежный fetch
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 секунд
                
                try {
                  const res = await fetch(url, { 
                    cache: 'force-cache',
                    signal: controller.signal,
                    headers: {
                      'Cache-Control': 'max-age=31536000'
                    }
                  });
                  clearTimeout(timeoutId);
                  
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  await res.blob();
                  return true;
                } catch (e) {
                  clearTimeout(timeoutId);
                  throw e;
                }
              }
            } catch (e) {
              if (import.meta.env.DEV) console.warn('Preload attempt failed:', url, e);
              if (i === attempts - 1) return false;
              await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Увеличиваем задержку
            }
          }
          return false;
        };

        // Создаём массив промисов для параллельной загрузки
        const promises = mediaUrls.map((url) => fetchWithRetry(url));

        // Обрабатываем результаты по мере завершения
        let successes = 0;
        const total = mediaUrls.length;
        
        for (const promise of promises) {
          if (!isMounted) return;
          const ok = await promise;
          if (ok) successes += 1;
          if (isMounted) setPreloadProgress(successes / total);
        }
        
        if (isMounted) setPreloadDone(successes === total);
      } catch (e) {
        console.error('Error during preload:', e);
        if (isMounted) setPreloadDone(false);
      }
    };

    preload();
    
    return () => {
      isMounted = false;
    };
  }, [mediaToPreload]);

  // Интро текст с анимированными строками
  const introLines = [
    `Добро пожаловать в "${work.title}"`,
    `Произведение от ${work.author}`,
    work.genre && `Жанр: ${work.genre}`,
    '',
    work.description,
    '',
    'С самого начала троим друзьям предстоит столкнуться с непреодолимыми трудностями и смогут ли они их преодолеть?',
    '',
    work.introText || 'Погрузитесь в удивительный мир, где каждое слово стоит смаковать долго...',
    '',
    'ВЫ УВЕРЕНЫ ЧТО СМОЖЕТЕ ПРОЧИТАТЬ ЭТО?'
  ].filter(Boolean);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentLine < introLines.length - 1) {
        setCurrentLine(prev => prev + 1);
      } else if (!showButton) {
        setTimeout(() => setShowButton(true), 800);
      }
    }, 1200); // Задержка между строками

    return () => clearTimeout(timer);
  }, [currentLine, introLines.length, showButton]);

  // Плавное появление элементов после кнопки 'читать'
  useEffect(() => {
    if (showButton && !showReadingStats) {
      const t1 = setTimeout(() => setShowReadingStats(true), 800);
      return () => clearTimeout(t1);
    }
  }, [showButton, showReadingStats]);

  useEffect(() => {
    if (showReadingStats && !showDownloadHint) {
      const t2 = setTimeout(() => setShowDownloadHint(true), 1000);
      return () => clearTimeout(t2);
    }
  }, [showReadingStats, showDownloadHint]);

  useEffect(() => {
    if (showDownloadHint && !showDownloadBtn) {
      const t3 = setTimeout(() => setShowDownloadBtn(true), 1200);
      return () => clearTimeout(t3);
    }
  }, [showDownloadHint, showDownloadBtn]);

  // Показываем вторую кнопку после нажатия первой и загрузки медиа
  useEffect(() => {
    if (firstButtonClicked && preloadDone && !showSecondButton) {
      const timer = setTimeout(() => setShowSecondButton(true), 500);
      return () => clearTimeout(timer);
    }
  }, [firstButtonClicked, preloadDone, showSecondButton]);

  // Показываем третью кнопку после нажатия второй
  useEffect(() => {
    if (secondButtonClicked && !showThirdButton) {
      const timer = setTimeout(() => setShowThirdButton(true), 500);
      return () => clearTimeout(timer);
    }
  }, [secondButtonClicked, showThirdButton]);

  const pdfHref = work.pdfFile ? `${base}works/${work.pdfFile}` : `${base}works/1first.pdf`;

  const handleStart = () => {
    if (!preloadDone) {
      // Показываем подсказку при каждом клике, пока медиа не загружены
      if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
      // Сбрасываем, чтобы перезапустить анимацию
      setShowWaitTip(false);
      // Следующим кадром включаем снова, чтобы сработал transition
      requestAnimationFrame(() => {
        setShowWaitTip(true);
        tipTimerRef.current = setTimeout(() => setShowWaitTip(false), 1500);
      });
      return;
    }
    setFirstButtonClicked(true);
    if (onPrimeAudio) onPrimeAudio();
  };

  const handleSecondButton = () => {
    setSecondButtonClicked(true);
  };

  const handleThirdButton = () => {
    onStartReading();
  };

  // Очистка только таймеров при выходе со страницы
  useEffect(() => {
    return () => {
      if (tipTimerRef.current) {
        clearTimeout(tipTimerRef.current);
      }
      // НЕ очищаем медиа кэш при переходе к чтению - медиа должно остаться в кэше
    };
  }, []);

  const percent = Math.round(preloadProgress * 100);

  return (
    <div className="work-intro">
      {/* Фоновые эффекты */}
      <div className="intro-background">
        <div className="floating-orb orb-1"></div>
        <div className="floating-orb orb-2"></div>
        <div className="floating-orb orb-3"></div>
      </div>

      {/* Кнопка назад */}
      <button className="intro-back-button" onClick={onBack}>
        ← Назад к списку
      </button>

      {/* Основной контент */}
      <div className="intro-content">
        <div className="intro-text">
          {introLines.map((line, index) => (
            <div
              key={index}
              className={`intro-line ${index <= currentLine ? 'visible' : ''} ${
                index === 0 ? 'title-line' : 
                index === 1 ? 'author-line' :
                index === 2 ? 'genre-line' : ''
              }`}
              style={{
                animationDelay: `${index * 0.3}s`
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* Кнопка начать чтение */}
        <div className={`intro-action ${showButton ? 'visible' : ''}`}>
          <button 
            className={`start-reading-button ${!preloadDone ? '' : ''} ${firstButtonClicked ? 'clicked' : ''}`}
            onClick={handleStart}
            disabled={firstButtonClicked || !showButton}
            aria-disabled={firstButtonClicked || !showButton}
            title={preloadDone ? 'Готово к чтению' : 'Дождитесь загрузки медиа'}
          >
            <span className="button-text">Приступить к чтению</span>
            <span className="button-arrow">→</span>
          </button>
          {!preloadDone && showWaitTip && (
            <div className="wait-tooltip" role="status" aria-live="polite">Дождитесь загрузки медиа</div>
          )}
          
          {/* Индикатор загрузки медиа */}
          <div className="media-preload-wrapper">
            <div className="media-progress-bar" aria-label={`Загрузка медиа: ${percent}%`}>
              <div className="media-progress-fill" style={{ width: `${percent}%` }} />
            </div>
            <div className="media-progress-info">
              <span className={`spinner ${percent >= 100 ? 'paused' : ''}`} aria-hidden="true"></span>
              <span className="percent-text">{percent}%</span>
            </div>
          </div>
        </div>

        {/* Вторая кнопка */}
        <div className={`intro-action ${showSecondButton ? 'visible' : ''}`}>
          <button 
            className={`intro-button ${secondButtonClicked ? 'clicked' : ''}`}
            onClick={handleSecondButton}
            disabled={!showSecondButton}
            aria-disabled={!showSecondButton}
          >
            <span className="button-text">Да заебал, где твоя паста ебаная?</span>
          </button>
        </div>

        {/* Третья кнопка */}
        <div className={`intro-action ${showThirdButton ? 'visible' : ''}`}>
          <button 
            className="start-reading-button promise-button"
            onClick={handleThirdButton}
            disabled={!showThirdButton}
            aria-disabled={!showThirdButton}
          >
            <span className="button-text">Обещаю быть внимательным читателем!</span>
            <span className="button-arrow">→</span>
          </button>
        </div>

        {/* Статистика чтения - появляется отдельно */}
        <div className={`reading-stats-wrapper ${showReadingStats ? 'visible' : ''}`}>
          <div className="reading-stats">
            <span className="stat">
              ⏱️ {work.readingTime || '15 мин'}
            </span>
            {work.hasAudio && (
              <span className="stat">
                🎵 Музыкальное сопровождение
              </span>
            )}
            {work.hasImages && (
              <span className="stat">
                🖼️ Визуальные эффекты
              </span>
            )}
          </div>
        </div>
        {/* Анимированное появление подсказки и кнопки скачивания PDF */}
        <div className={`download-hint ${showDownloadHint ? 'visible' : ''}`} style={{transitionDelay: showDownloadHint ? '0.2s' : '0s'}}>
          <div className="download-hint-line">Если, вдруг, вам неприятно читать на моем гениальном сайте,</div>
          <div className="download-hint-line">Или если, неожиданно, Вам очень понравилась данная писанина...</div>
        </div>
        <div className={`download-btn-wrapper ${showDownloadBtn ? 'visible' : ''}`} style={{transitionDelay: showDownloadBtn ? '0.2s' : '0s'}}>
          <a
            className="download-pdf-btn"
            href={pdfHref}
            download
            target="_blank"
            rel="noopener noreferrer"
            style={{ pointerEvents: showDownloadBtn ? 'auto' : 'none' }}
          >
            <span className="button-text">Скачать pdf-файл</span>
            <span className="button-arrow">↓</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default WorkIntro;
