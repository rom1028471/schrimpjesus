import { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import WorksList from './components/WorksList/WorksList';
import WorkReader from './components/WorkReader/WorkReader';
import WorkIntro from './components/WorkIntro/WorkIntro';
import BadUIGate from './components/BadUIGate/BadUIGate';
import worksMetadata from './works/metadata.json';
import { parseWorkMd } from './utils/parseWorkMd';
import { useReadingState } from './hooks/useReadingState';

function App() {
  const [started, setStarted] = useState(true);
  const [selectedWork, setSelectedWork] = useState(null);
  const [showIntro, setShowIntro] = useState(false);
  const { readingState, saveReadingState, clearReadingState } = useReadingState();

  // Восстанавливаем состояние чтения при загрузке приложения
  useEffect(() => {
    if (readingState && readingState.workId) {
      // Находим произведение по ID
      const workMeta = worksMetadata.works.find(work => work.id === readingState.workId);
      if (workMeta) {
        handleSelectWork(workMeta, true); // true означает восстановление состояния
      }
    }
  }, [readingState]);

  const handleCompleteGate = () => {
    setStarted(true);
  };

  const handleSelectWork = async (workMeta, isRestore = false) => {
    // Корректный путь с учётом base и окружения
    const base = import.meta.env.BASE_URL || '/';
    const isDev = import.meta.env.DEV;
    
    // В режиме разработки загружаем из public/works, в продакшене из works
    const worksPath = isDev ? 'works' : 'works';
    const res = await fetch(`${base}${worksPath}/${workMeta.file}`);
    const md = await res.text();
    const parsed = parseWorkMd(md, workMeta);
    setSelectedWork(parsed);
    
    if (isRestore) {
      // Если это восстановление состояния, сразу переходим к чтению
      setShowIntro(false);
      // Сохраняем состояние для этого произведения
      saveReadingState(workMeta.id, readingState?.scrollPosition || 0);
    } else {
      // Если это новый выбор произведения, показываем интро
      setShowIntro(true);
      // Очищаем предыдущее состояние
      clearReadingState();
    }
  };

  const handleStartReading = () => {
    setShowIntro(false);
    // Сохраняем состояние при начале чтения
    if (selectedWork) {
      saveReadingState(selectedWork.id, 0);
    }
  };

  const handleBackToList = () => {
    setSelectedWork(null);
    setShowIntro(false);
    // Очищаем состояние при возврате к списку
    clearReadingState();
  };

  return (
    <ThemeProvider>
      <div className="App">
        {!started ? (
          <BadUIGate onComplete={handleCompleteGate} />
        ) : selectedWork && showIntro ? (
          <WorkIntro 
            work={selectedWork} 
            onStartReading={handleStartReading}
            onBack={handleBackToList}
          />
        ) : selectedWork ? (
          <WorkReader 
            work={selectedWork} 
            onBack={handleBackToList}
            initialScrollPosition={readingState?.scrollPosition || 0}
            onScrollChange={(position) => {
              if (selectedWork) {
                saveReadingState(selectedWork.id, position);
              }
            }}
          />
        ) : (
          <WorksList works={worksMetadata.works} onSelectWork={handleSelectWork} />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
