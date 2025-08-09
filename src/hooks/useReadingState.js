import { useState, useEffect } from 'react';

const READING_STATE_KEY = 'schrimpjesus_reading_state';

export const useReadingState = () => {
  const [readingState, setReadingState] = useState(null);

  // Загружаем состояние при инициализации
  useEffect(() => {
    try {
      const saved = localStorage.getItem(READING_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Проверяем, что сохраненное состояние не устарело (например, не старше 7 дней)
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        if (now - parsed.timestamp < oneWeek) {
          setReadingState(parsed);
        } else {
          // Удаляем устаревшее состояние
          localStorage.removeItem(READING_STATE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading reading state:', error);
      localStorage.removeItem(READING_STATE_KEY);
    }
  }, []);

  // Сохраняем состояние
  const saveReadingState = (workId, scrollPosition = 0) => {
    try {
      const state = {
        workId,
        scrollPosition,
        timestamp: Date.now()
      };
      localStorage.setItem(READING_STATE_KEY, JSON.stringify(state));
      setReadingState(state);
    } catch (error) {
      console.error('Error saving reading state:', error);
    }
  };

  // Очищаем состояние
  const clearReadingState = () => {
    try {
      localStorage.removeItem(READING_STATE_KEY);
      setReadingState(null);
    } catch (error) {
      console.error('Error clearing reading state:', error);
    }
  };

  return {
    readingState,
    saveReadingState,
    clearReadingState
  };
}; 