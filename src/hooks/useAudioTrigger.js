import { useEffect, useRef, useState } from 'react';

const useAudioTrigger = ({ 
  audioSrc, 
  triggerElement, 
  autoPlay = true, 
  loop = true, 
  volume = 0.3,
  fadeInDuration = 1000,
  fadeOutDuration = 500 
}) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  const fadeIntervalRef = useRef(null);

  // Инициализация аудио
  useEffect(() => {
    if (!audioSrc) return;

    const audio = new Audio(audioSrc);
    audioRef.current = audio;

    const handleCanPlay = () => setIsLoaded(true);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      if (loop) {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      }
    };

    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    // Настройка аудио
    audio.loop = loop;
    audio.volume = 0; // Начинаем с нулевой громкости
    audio.preload = 'auto';

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
    };
  }, [audioSrc, loop]);

  // Функции для плавного изменения громкости
  const fadeIn = () => {
    if (!audioRef.current) return;
    
    clearInterval(fadeIntervalRef.current);
    const audio = audioRef.current;
    const targetVolume = volume;
    const steps = fadeInDuration / 50; // 50ms интервалы
    const volumeStep = targetVolume / steps;
    
    let currentStep = 0;
    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const newVolume = Math.min(volumeStep * currentStep, targetVolume);
      audio.volume = newVolume;
      setCurrentVolume(newVolume);
      
      if (currentStep >= steps) {
        clearInterval(fadeIntervalRef.current);
      }
    }, 50);
  };

  const fadeOut = () => {
    if (!audioRef.current) return;
    
    clearInterval(fadeIntervalRef.current);
    const audio = audioRef.current;
    const startVolume = audio.volume;
    const steps = fadeOutDuration / 50;
    const volumeStep = startVolume / steps;
    
    let currentStep = 0;
    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const newVolume = Math.max(startVolume - (volumeStep * currentStep), 0);
      audio.volume = newVolume;
      setCurrentVolume(newVolume);
      
      if (currentStep >= steps) {
        clearInterval(fadeIntervalRef.current);
        audio.pause();
      }
    }, 50);
  };

  // Intersection Observer для автовоспроизведения
  useEffect(() => {
    if (!autoPlay || !triggerElement || !isLoaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const audio = audioRef.current;
        if (!audio) return;

        if (entry.isIntersecting) {
          audio.play().then(() => {
            fadeIn();
          }).catch(console.error);
        } else {
          fadeOut();
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
  }, [autoPlay, triggerElement, isLoaded, volume, fadeInDuration, fadeOutDuration]);

  // Очистка интервалов при размонтировании
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, []);

  // Публичные методы
  const play = () => {
    const audio = audioRef.current;
    if (!audio || !isLoaded) return false;

    audio.play().then(() => {
      fadeIn();
    }).catch(console.error);
    return true;
  };

  const pause = () => {
    fadeOut();
  };

  const stop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    fadeOut();
    setTimeout(() => {
      audio.currentTime = 0;
    }, fadeOutDuration);
  };

  const setVolumeLevel = (newVolume) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    audio.volume = clampedVolume;
    setCurrentVolume(clampedVolume);
  };

  return {
    isPlaying,
    isLoaded,
    currentVolume,
    play,
    pause,
    stop,
    setVolume: setVolumeLevel,
    audioRef
  };
};

export default useAudioTrigger;
