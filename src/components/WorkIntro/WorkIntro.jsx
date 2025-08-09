import { useState, useEffect, useMemo } from 'react';
import './WorkIntro.css';

const WorkIntro = ({ work, onStartReading, onBack, onPrimeAudio }) => {
  const [currentLine, setCurrentLine] = useState(-1);
  const [showButton, setShowButton] = useState(false);
  const [showDownloadHint, setShowDownloadHint] = useState(false);
  const [showDownloadBtn, setShowDownloadBtn] = useState(false);

  const [preloadProgress, setPreloadProgress] = useState(0); // 0..1
  const [preloadDone, setPreloadDone] = useState(false);

  // Правильный base URL для dev и production
  const base = import.meta.env.BASE_URL || '/';

  // Собираем список медиа для предзагрузки
  const mediaUrls = useMemo(() => {
    const urls = new Set();
    if (work?.blocks?.length) {
      for (const b of work.blocks) {
        if (b.type === 'image' && b.imageFile) urls.add(`${base}assets/images/${b.imageFile}`);
        if (b.type === 'music' && b.musicFile) urls.add(`${base}assets/audio/${b.musicFile}`);
      }
    }
    if (work?.coverImage) urls.add(`${base}assets/images/${work.coverImage}`);
    // Можно добавить и PDF, если критично: urls.add(`${base}works/${work.pdfFile}`)
    return Array.from(urls);
  }, [work, base]);

  // Предзагрузка медиа во время интро
  useEffect(() => {
    let aborted = false;
    const controller = new AbortController();
    setPreloadProgress(0);
    setPreloadDone(false);

    const preload = async () => {
      if (!mediaUrls.length) {
        setPreloadProgress(1);
        setPreloadDone(true);
        return;
      }
      let loaded = 0;
      for (const url of mediaUrls) {
        try {
          const res = await fetch(url, { signal: controller.signal, cache: 'force-cache' });
          // Полностью читаем тело, чтобы гарантировать загрузку в кэш
          // Даже если контент уже в кэше, blob() вернёт сразу
          await res.blob();
        } catch (e) {
          if (import.meta.env.DEV) console.warn('Preload failed:', url, e);
          // Не блокируем чтение из-за единичного сбоя
        } finally {
          if (aborted) return;
          loaded += 1;
          setPreloadProgress(loaded / mediaUrls.length);
        }
      }
      if (!aborted) setPreloadDone(true);
    };

    preload();
    return () => {
      aborted = true;
      controller.abort();
    };
  }, [mediaUrls]);

  // Интро текст с анимированными строками
  const introLines = [
    `Добро пожаловать в "${work.title}"`,
    `Произведение от ${work.author}`,
    work.genre && `Жанр: ${work.genre}`,
    '',
    work.description,
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

  // Плавное появление текста и кнопки скачивания PDF после кнопки 'читать'
  useEffect(() => {
    if (showButton && !showDownloadHint) {
      const t1 = setTimeout(() => setShowDownloadHint(true), 1200);
      return () => clearTimeout(t1);
    }
  }, [showButton, showDownloadHint]);

  useEffect(() => {
    if (showDownloadHint && !showDownloadBtn) {
      const t2 = setTimeout(() => setShowDownloadBtn(true), 1200);
      return () => clearTimeout(t2);
    }
  }, [showDownloadHint, showDownloadBtn]);

  const pdfHref = work.pdfFile ? `${base}works/${work.pdfFile}` : `${base}works/1first.pdf`;

  const handleStart = () => {
    if (!preloadDone) return;
    if (onPrimeAudio) onPrimeAudio();
    onStartReading();
  };

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
            className={`start-reading-button ${preloadDone ? '' : 'disabled'}`}
            onClick={handleStart}
            disabled={!preloadDone}
            aria-disabled={!preloadDone}
            title={preloadDone ? 'Готово к чтению' : 'Загружается медиа...'}
          >
            <span className="button-text">Приступить к чтению</span>
            <span className="button-arrow">→</span>
          </button>

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
