-- Скрипт для создания тестового маршрута "Тайны старого города"
-- Перед запуском убедитесь, что в таблице auth.users есть хотя бы один пользователь.

DO $$
DECLARE
    v_user_id UUID;
    v_route_id UUID;
BEGIN
    -- Получаем ID первого попавшегося пользователя (автора)
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Пользователи не найдены. Сначала зарегистрируйтесь в приложении.';
        RETURN;
    END IF;

    -- Создаем маршрут
    INSERT INTO public.routes (
        title, 
        description, 
        difficulty, 
        author_id, 
        image_url, 
        checkpoints_count,
        is_public
    ) 
    VALUES (
        'Тайны старого города', 
        'Захватывающий квест по историческим местам. Разгадайте загадки прошлого и найдите скрытые артефакты!', 
        'medium', 
        v_user_id, 
        'https://images.unsplash.com/photo-1550340499-a6c60fc8282d?q=80&w=1600', 
        5,
        true
    )
    RETURNING id INTO v_route_id;

    -- Добавляем чекпоинты
    INSERT INTO public.checkpoints (route_id, title, description, lat, lng, order_index, photo_url)
    VALUES 
    (
        v_route_id, 
        'Нулевой километр', 
        'Найдите точку отсчета всех дорог. Здесь начинается ваше путешествие. Сделайте фото у памятного знака.', 
        59.9343, 30.3351, 0,
        'https://images.unsplash.com/photo-1548546738-8509cb246ed3?q=80&w=800'
    ),
    (
        v_route_id, 
        'Шепот грифонов', 
        'Перейдите через мост, который охраняют мифические существа. Говорят, они исполняют желания тех, кто знает секретное слово.', 
        59.9275, 30.3233, 1,
        'https://images.unsplash.com/photo-1572953108235-a1369363fb7a?q=80&w=800'
    ),
    (
        v_route_id, 
        'Двор духов', 
        'Найдите самый узкий дворик-колодец. Посмотрите вверх: кусочек неба здесь кажется дверью в иной мир.', 
        59.9401, 30.2798, 2,
        'https://images.unsplash.com/photo-1580907116213-97992982976b?q=80&w=800'
    ),
    (
        v_route_id, 
        'Аптека алхимиков', 
        'Здесь когда-то смешивали эликсиры. Найдите старую вывеску и сосчитайте львов на фасаде.', 
        59.9385, 30.2831, 3,
        'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?q=80&w=800'
    ),
    (
        v_route_id, 
        'Финал: Забытый маяк', 
        'Ваше путешествие заканчивается у воды. Найдите старый фонарь, напоминающий маяк, и заберите свою награду.', 
        59.9328, 30.3015, 4,
        'https://images.unsplash.com/photo-1505242844814-14b46a946bb2?q=80&w=800'
    );

    RAISE NOTICE 'Тестовый маршрут успешно создан!';
END $$;
