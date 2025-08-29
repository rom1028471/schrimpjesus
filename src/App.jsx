import { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import WorksList from './components/WorksList/WorksList';
import WorkReader from './components/WorkReader/WorkReader';
import WorkIntro from './components/WorkIntro/WorkIntro';
import SecondIntro from './components/SecondIntro/SecondIntro';
import { parseWorkMd } from './utils/parseWorkMd';
import { SoundProvider } from './contexts/SoundContext';
import { FontSizeProvider } from './contexts/FontSizeContext';

function App() {
  const [selectedWork, setSelectedWork] = useState(null);
  const [showIntro, setShowIntro] = useState(false);
  const [showSecondIntro, setShowSecondIntro] = useState(false);
  const [works, setWorks] = useState([]);
  const primerAudioRef = useRef(null);

  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/';
    fetch(`${base}works/metadata.json`)
      .then(res => res.json())
      .then(data => setWorks(data.works || []))
      .catch(() => setWorks([]));
  }, []);

  const handleSelectWork = async (workMeta) => {
    if (import.meta.env.DEV) {
    console.log('📁 Загружаю файл:', `works/${workMeta.file}`, 'для произведения:', workMeta.title);
    }
    const base = import.meta.env.BASE_URL || '/';
    const filePath = `${base}works/${workMeta.file}`;
    const res = await fetch(filePath);
    const md = await res.text();
    const parsed = parseWorkMd(md, workMeta);
    if (import.meta.env.DEV) {
    console.log('📖 Парсинг завершен для', workMeta.title);
    console.log('📖 Количество блоков:', parsed.blocks.length);
    console.log('📖 Блоки с картинками:', parsed.blocks.filter(b => b.type === 'image').map(b => b.imageFile));
    }
    setSelectedWork(parsed);
    setShowIntro(true);
  };

  const handleStartReading = () => {
    setShowIntro(false);
    setShowSecondIntro(true);
  };

  const handleStartFinalReading = () => {
    setShowSecondIntro(false);
  };

  const handleBackToList = () => {
    // Очищаем медиа при возврате к списку
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('media-cache')) {
            caches.delete(cacheName);
          }
        });
      });
    }
    
    // Принудительно очищаем память браузера
    if (window.gc) {
      window.gc();
    }
    
    setSelectedWork(null);
    setShowIntro(false);
    setShowSecondIntro(false);
  };

  const handlePrimeAudio = async () => {
    try {
      if (!primerAudioRef.current) {
        primerAudioRef.current = new Audio();
        primerAudioRef.current.volume = 0;
      }
      await primerAudioRef.current.play();
      primerAudioRef.current.pause();
    } catch (e) {
      if (import.meta.env.DEV) console.warn('Audio prime failed (likely no user gesture)', e);
    }
  };

  return (
    <SoundProvider>
    <ThemeProvider>
    <FontSizeProvider>
      <div className="App">
        {(() => {
          if (import.meta.env.DEV) {
            console.log('🔧 App render - selectedWork:', selectedWork?.title, 'showIntro:', showIntro, 'showSecondIntro:', showSecondIntro);
          }
          if (selectedWork && showIntro) {
            if (import.meta.env.DEV) console.log('🔧 Рендерим WorkIntro для:', selectedWork.title);
            return (
              <WorkIntro 
                work={selectedWork} 
                onStartReading={handleStartReading}
                onBack={handleBackToList}
                onPrimeAudio={handlePrimeAudio}
              />
            );
          } else if (selectedWork && showSecondIntro) {
            if (import.meta.env.DEV) console.log('🔧 Рендерим SecondIntro для:', selectedWork.title);
            return (
              <SecondIntro 
                work={selectedWork} 
                onStartReading={handleStartFinalReading}
                onBack={handleBackToList}
              />
            );
          } else if (selectedWork) {
            if (import.meta.env.DEV) console.log('🔧 Рендерим WorkReader для:', selectedWork.title);
            return <WorkReader work={selectedWork} onBack={handleBackToList} />;
          } else {
            if (import.meta.env.DEV) console.log('🔧 Рендерим WorksList');
            return <WorksList works={works} onSelectWork={handleSelectWork} />;
          }
        })()}
      </div>
    </FontSizeProvider>
    </ThemeProvider>
    </SoundProvider>
  );
}

export default App;
