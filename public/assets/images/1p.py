import os

# Настройки
folder_path = '.'  # Путь к папке с изображениями (текущая папка)
output_file = 'images.txt'  # Имя выходного текстового файла

# Поддерживаемые форматы изображений
image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg'}

# Получаем список файлов в папке
try:
    files = os.listdir(folder_path)
except FileNotFoundError:
    print(f"Папка '{folder_path}' не найдена.")
    exit()

# Фильтруем только изображения по расширению
image_files = [f for f in files if os.path.isfile(os.path.join(folder_path, f))
               and os.path.splitext(f.lower())[1] in image_extensions]

# Записываем в txt файл
with open(output_file, 'w', encoding='utf-8') as f:
    for filename in image_files:
        f.write(f"[image: {filename}]\n")

print(f"Найдено {len(image_files)} изображений. Результат записан в '{output_file}'.")