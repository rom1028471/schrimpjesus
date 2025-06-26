import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import WorksList from './components/WorksList/WorksList';
import WorkReader from './components/WorkReader/WorkReader';
import WorkIntro from './components/WorkIntro/WorkIntro';
import BadUIGate from './components/BadUIGate/BadUIGate';
import './App.css';
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
    // Корректный путь с учётом base
    const base = import.meta.env.BASE_URL || '/';
    const res = await fetch(`${base}src/works/${workMeta.file}`);
    const md = await res.text();
    const parsed = parseWorkMd(md, workMeta);
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
        {!started ? (
          <BadUIGate onComplete={handleCompleteGate} />
        ) : selectedWork && showIntro ? (
          <WorkIntro 
            work={selectedWork} 
            onStartReading={handleStartReading}
            onBack={handleBackToList}
          />
        ) : selectedWork ? (
          <WorkReader work={selectedWork} onBack={handleBackToList} />
        ) : (
          <WorksList works={worksMetadata.works} onSelectWork={handleSelectWork} />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
