// Глобальный кэш аудио объектов для работы без интернета
class AudioCache {
  constructor() {
    this.cache = new Map(); // { [musicFile]: Audio }
    this.loadingPromises = new Map(); // { [musicFile]: Promise }
  }

  // Получить аудио объект из кэша или создать новый
  getAudio(musicFile, baseUrl = '') {
    if (this.cache.has(musicFile)) {
      return this.cache.get(musicFile);
    }

    // Если уже загружается, возвращаем промис
    if (this.loadingPromises.has(musicFile)) {
      return this.loadingPromises.get(musicFile);
    }

    // Создаем новый аудио объект
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = true;
    
    if (baseUrl) {
      audio.src = `${baseUrl}assets/audio/${musicFile}`;
    }

    this.cache.set(musicFile, audio);
    return audio;
  }

  // Предзагрузить аудио файл
  preloadAudio(musicFile, baseUrl) {
    if (this.cache.has(musicFile)) {
      return Promise.resolve(this.cache.get(musicFile));
    }

    if (this.loadingPromises.has(musicFile)) {
      return this.loadingPromises.get(musicFile);
    }

    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = true;
    audio.src = `${baseUrl}assets/audio/${musicFile}`;

    const promise = new Promise((resolve, reject) => {
      let resolved = false;
      
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('loadstart', onLoadStart);
      };
      
      const onCanPlay = () => {
        cleanup();
        this.cache.set(musicFile, audio);
        this.loadingPromises.delete(musicFile);
        resolve(audio);
      };
      
      const onError = (e) => {
        cleanup();
        this.loadingPromises.delete(musicFile);
        reject(e);
      };
      
      const onLoadStart = () => {
        if (import.meta.env.DEV) console.log('Audio preload started:', musicFile);
      };
      
      audio.addEventListener('canplaythrough', onCanPlay);
      audio.addEventListener('error', onError);
      audio.addEventListener('loadstart', onLoadStart);
    });

    this.loadingPromises.set(musicFile, promise);
    return promise;
  }

  // Проверить, есть ли аудио в кэше
  hasAudio(musicFile) {
    return this.cache.has(musicFile);
  }

  // Очистить кэш
  clear() {
    this.cache.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.cache.clear();
    this.loadingPromises.clear();
  }

  // Получить размер кэша
  size() {
    return this.cache.size;
  }
}

// Создаем глобальный экземпляр
const globalAudioCache = new AudioCache();

// Очищаем кэш при обновлении/закрытии страницы
window.addEventListener('beforeunload', () => {
  globalAudioCache.clear();
});

export default globalAudioCache;
