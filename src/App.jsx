import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import WorksList from './components/WorksList/WorksList';
import WorkReader from './components/WorkReader/WorkReader';
import WorkIntro from './components/WorkIntro/WorkIntro';
import BadUIGate from './components/BadUIGate/BadUIGate';
import worksMetadata from './works/metadata.json';
import { parseWorkMd } from './utils/parseWorkMd';

function App() {
  const [started, setStarted] = useState(true);
  const [selectedWork, setSelectedWork] = useState(null);
  const [showIntro, setShowIntro] = useState(false);

  const handleCompleteGate = () => {
    setStarted(true);
  };

  const handleSelectWork = async (workMeta) => {
    console.log('📁 Загружаю файл:', `works/${workMeta.file}`, 'для произведения:', workMeta.title);
    
    // Корректный путь с учётом base
    const base = import.meta.env.DEV ? '/schrimpjesus/' : (import.meta.env.BASE_URL || '/');
    const filePath = import.meta.env.DEV ? `works/${workMeta.file}` : `${base}works/${workMeta.file}`;
    const res = await fetch(filePath);
    const md = await res.text();
    const parsed = parseWorkMd(md, workMeta);
    console.log('📖 Парсинг завершен для', workMeta.title);
    console.log('📖 Количество блоков:', parsed.blocks.length);
    console.log('📖 Блоки с картинками:', parsed.blocks.filter(b => b.type === 'image').map(b => b.imageFile));
    setSelectedWork(parsed);
    setShowIntro(true);
  };

  const handleStartReading = () => {
    setShowIntro(false);
  };

  const handleBackToList = () => {
    setSelectedWork(null);
    setShowIntro(false);
  };

  return (
    <ThemeProvider>
      <div className="App">
        {(() => {
          console.log('🔧 App render - started:', started, 'selectedWork:', selectedWork?.title, 'showIntro:', showIntro);
          if (!started) {
            console.log('🔧 Рендерим BadUIGate');
            return <BadUIGate onComplete={handleCompleteGate} />;
          } else if (selectedWork && showIntro) {
            console.log('🔧 Рендерим WorkIntro для:', selectedWork.title);
            return (
              <WorkIntro 
                work={selectedWork} 
                onStartReading={handleStartReading}
                onBack={handleBackToList}
              />
            );
          } else if (selectedWork) {
            console.log('🔧 Рендерим WorkReader для:', selectedWork.title);
            return <WorkReader work={selectedWork} onBack={handleBackToList} />;
          } else {
            console.log('🔧 Рендерим WorksList');
            return <WorksList works={worksMetadata.works} onSelectWork={handleSelectWork} />;
          }
        })()}
      </div>
    </ThemeProvider>
  );
}

export default App;
