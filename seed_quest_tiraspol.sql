-- Скрипт для создания тестового маршрута "Сердце Тирасполя"
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

    -- Удаляем старый тестовый маршрут с таким же названием, если он есть
    DELETE FROM public.routes WHERE title = 'Сердце Тирасполя';

    -- Создаем маршрут
    INSERT INTO public.routes (
        title, 
        description, 
        difficulty, 
        author_id, 
        image_url, 
        checkpoints_count,
        is_public,
        status,
        is_moderated
    ) 
    VALUES (
        'Сердце Тирасполя', 
        'Увлекательная прогулка по главным достопримечательностям столицы. От площади Суворова до набережной Днестра.', 
        'easy', 
        v_user_id, 
        'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?q=80&w=1600', -- Заглушка, позже можно заменить на реальное фото Тирасполя
        5,
        true,
        'published',
        true
    )
    RETURNING id INTO v_route_id;

    -- Добавляем чекпоинты
    INSERT INTO public.checkpoints (route_id, title, description, lat, lng, order_index, photo_url)
    VALUES 
    (
        v_route_id, 
        'Площадь Суворова', 
        'Главная площадь города. Найдите памятник великому полководцу и сосчитайте колонны у театра.', 
        46.8362, 29.6105, 0,
        'https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=800'
    ),
    (
        v_route_id, 
        'Екатерининский парк', 
        'Прогуляйтесь по новому парку. Ваша цель — ротонда у озера. Идеальное место для первого артефакта.', 
        46.8355, 29.6130, 1,
        'https://images.unsplash.com/photo-1467803738586-46b7eb7b16a1?q=80&w=800'
    ),
    (
        v_route_id, 
        'Мемориал Славы', 
        'Танк Т-34 — символ мужества. Обойдите его и найдите памятную плиту с исторической датой.', 
        46.8370, 29.6080, 2,
        'https://images.unsplash.com/photo-1584030373081-f37b7bb4cb8e?q=80&w=800'
    ),
    (
        v_route_id, 
        'Сквер де Волана', 
        'Место отдыха у самой реки. Найдите бюст основателю города и посмотрите в сторону моста.', 
        46.8340, 29.6120, 3,
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800'
    ),
    (
        v_route_id, 
        'Дом Советов', 
        'Монументальное здание с богатой историей. Сосчитайте ступени главного входа для завершения квеста.', 
        46.8400, 29.6300, 4,
        'https://images.unsplash.com/photo-1555443350-624971d4b6ec?q=80&w=800'
    );

    RAISE NOTICE 'Тестовый маршрут по Тирасполю успешно создан!';
END $$;
