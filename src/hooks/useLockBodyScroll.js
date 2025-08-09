import { useLayoutEffect } from 'react';

function useLockBodyScroll() {
  useLayoutEffect(() => {
    // Получаем исходное значение overflow
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Блокируем скролл
    document.body.style.overflow = 'hidden';

    // Убираем блокировку при размонтировании компонента
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []); // Пустой массив зависимостей, чтобы эффект выполнился один раз
}

export default useLockBodyScroll;
