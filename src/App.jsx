import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import WorksList from './components/WorksList/WorksList';
import WorkReader from './components/WorkReader/WorkReader';
import WorkIntro from './components/WorkIntro/WorkIntro';

function App() {
  const [selectedWork, setSelectedWork] = useState(null);
  const [showIntro, setShowIntro] = useState(false);

  const handleWorkSelect = (work) => {
    setSelectedWork(work);
  };

  const handleBack = () => {
    setSelectedWork(null);
  };

  const handleIntroClose = () => {
    setShowIntro(false);
  };

  return (
    <ThemeProvider>
      <div className="App">
        {selectedWork ? (
          <WorkReader work={selectedWork} onBack={handleBack} />
        ) : showIntro ? (
          <WorkIntro onClose={handleIntroClose} />
        ) : (
          <WorksList onWorkSelect={handleWorkSelect} />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
