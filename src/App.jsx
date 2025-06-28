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
    const base = import.meta.env.DEV ? '/schrimpjesus/' : (import.meta.env.BASE_URL || '/');
    const filePath = import.meta.env.DEV ? `works/${workMeta.file}` : `${base}works/${workMeta.file}`;
    const res = await fetch(filePath);
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
        {(() => {
          if (!started) {
            return <BadUIGate onComplete={handleCompleteGate} />;
          } else if (selectedWork && showIntro) {
            return (
              <WorkIntro 
                work={selectedWork} 
                onStartReading={handleStartReading}
                onBack={handleBackToList}
              />
            );
          } else if (selectedWork) {
            return <WorkReader work={selectedWork} onBack={handleBackToList} />;
          } else {
            return <WorksList works={worksMetadata.works} onSelectWork={handleSelectWork} />;
          }
        })()}
      </div>
    </ThemeProvider>
  );
}

export default App;
