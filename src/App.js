import { useState } from 'react';
import WorksList from './components/WorksList/WorksList';
import WorkReader from './components/WorkReader/WorkReader';
import BadUIGate from './components/BadUIGate/BadUIGate';
import './App.css';

import worksData from './data/works.json';

function App() {
  const [started, setStarted] = useState(false);
  const [selectedWork, setSelectedWork] = useState(null);

  const handleCompleteGate = () => {
    setStarted(true);
  };

  const handleSelectWork = (work) => {
    setSelectedWork(work);
  };

  const handleBackToList = () => {
    setSelectedWork(null);
  };

  return (
    <div className="App">
      {!started ? (
        <BadUIGate onComplete={handleCompleteGate} />
      ) : selectedWork ? (
        <WorkReader work={selectedWork} onBack={handleBackToList} />
      ) : (
        <WorksList works={worksData} onSelectWork={handleSelectWork} />
      )}
    </div>
  );
}

export default App;

