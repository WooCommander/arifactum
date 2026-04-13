-- Обновляем пути к изображениям для базовых артефактов
UPDATE public.artifacts SET image_url = '/images/artifacts/dodecahedron.png' WHERE name = 'Древний Додекаэдр';
UPDATE public.artifacts SET image_url = '/images/artifacts/crystal.png' WHERE name = 'Кристалл Пустоты';
UPDATE public.artifacts SET image_url = '/images/artifacts/eye.png' WHERE name = 'Око Артефактора';

-- Для всех остальных ставим пока общую заглушку
UPDATE public.artifacts SET image_url = '/images/artifacts/dodecahedron.png' WHERE image_url IS NULL OR image_url = '';
