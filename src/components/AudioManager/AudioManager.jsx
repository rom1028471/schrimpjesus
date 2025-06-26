import { useEffect, useRef, useState } from 'react';

const AudioManager = ({ audioSrc, triggerElement, autoPlay = true, loop = true, volume = 0.3 }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleCanPlay = () => setIsLoaded(true);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Настройка аудио
    audio.volume = volume;
    audio.loop = loop;

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [volume, loop]);

  useEffect(() => {
    if (!autoPlay || !triggerElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const audio = audioRef.current;
        if (!audio || !isLoaded) return;

        if (entry.isIntersecting) {
          audio.play().catch(console.error);
        } else {
          audio.pause();
        }
      },
      { 
        threshold: 0.3,
        rootMargin: '-10% 0px -10% 0px'
      }
    );

    const element = document.querySelector(triggerElement);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [autoPlay, triggerElement, isLoaded]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !isLoaded) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  };

  const handleVolumeChange = (e) => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = parseFloat(e.target.value);
    }
  };

  return (
    <div className="audio-manager">
      <audio 
        ref={audioRef} 
        src={audioSrc}
        preload="auto"
      />
      
      {/* Опциональные контролы */}
      {!autoPlay && (
        <div className="audio-controls">
          <button 
            onClick={togglePlay}
            disabled={!isLoaded}
            className="play-button"
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            defaultValue={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
        </div>
      )}
    </div>
  );
};

export default AudioManager;
