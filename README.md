# SchrimpJesus - Интерактивный Сайт для Чтения Произведений

Современный SPA-сайт для чтения произведений с уникальными эффектами прокрутки, музыкальным сопровождением и креативным BadUI входом.

## ✨ Особенности

- **BadUI Вход**: Интересные интерактивные задачи перед входом на сайт
- **Scroll-Reveal Эффекты**: Изображения плавно появляются при прокрутке
- **Аудио Сопровождение**: Музыка синхронизируется с определенными частями текста  
- **Адаптивный Дизайн**: Оптимизация для всех устройств
- **Плавные Анимации**: Красивые переходы и эффекты

## 🚀 Быстрый старт



Что делать при добавлении новых медиа или произведений?
Добавьте файлы в нужные папки (public, src/works и т.д.).
Выполните сборку:
   npm run build
Закоммитьте и запушьте изменения (включая папку dist):
   git add -f dist public src/works
   git commit -m "feat: add new media and works"
   git push origin masturb
Проверьте, что в GitHub Pages всё работает (обычно обновляется за 1-2 минуты).



### Разработка
```bash
npm install
npm run dev
```

### Сборка для продакшена
```bash
npm run build
```

### Деплой на GitHub Pages
```bash
npm run deploy
```

## 📁 Структура Проекта

```
src/
├── components/
│   ├── BadUIGate/          # Креативный входной экран
│   ├── WorksList/          # Список произведений
│   ├── WorkReader/         # Чтение произведения
│   ├── ScrollImage/        # Scroll-reveal эффекты
│   └── AudioManager/       # Управление аудио
├── data/
│   └── works.json          # Данные произведений
└── assets/
    ├── images/             # Изображения
    └── audio/              # Аудио файлы
```

## 🛠 Технологии

- **React 19** - UI фреймворк
- **Vite** - Быстрая сборка (вместо тяжелого CRA)
- **Intersection Observer API** - Отслеживание прокрутки
- **CSS3** - Анимации и эффекты
- **GitHub Pages** - Хостинг

---

**© 2025 SchrimpJesus**

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
