# Сущности и Типы Данных

## Enum Types

```typescript
export enum Role {
  GUEST = 'guest',
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin'
}

export enum PlaceType {
  BAZAAR = 'bazaar',
  SHOP = 'shop',
  SUPERMARKET = 'supermarket',
  PRIVATE = 'private', // Частник
  OTHER = 'other'
}

export enum Unit {
  KG = 'kg',
  LITRE = 'l',
  PIECE = 'pc',
  PACK = 'pack' // упаковка
}

export enum Currency {
  UZS = 'UZS', // Сум
  USD = 'USD'
}
```

## Interfaces

### User (Пользователь)
На основе Supabase Auth, но с доп. данными в таблице `profiles`.
```typescript
interface UserProfile {
  id: string; // uuid from auth.users
  displayName: string | null;
  role: Role;
  avatarUrl?: string; // опционально
  createdAt: string; // ISO date
}
```

### Category (Категория)
Древовидная структура категорий.
```typescript
interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null; // null для корневых категорий
  icon?: string; // emoji или url иконки
}
```

### Product (Товар)
Товар, который мы отслеживаем.
```typescript
interface Product {
  id: string;
  name: string;
  categoryId: string;
  brand?: string; // Бренд/Производитель (опционально)
  defaultUnit: Unit; // Единица измерения по умолчанию
  tags?: string[]; // Теги для поиска
  createdAt: string;
}
```

### Place (Место/Точка)
Где была замечена цена. В MVP без точных координат, просто район/ориентир.
```typescript
interface Place {
  id: string;
  city: string; // Город (Ташкент)
  district: string; // Район (Чиланзар, Юнусабад...)
  type: PlaceType;
  name: string; // Название (Рынок Чорсу, Корзинка на Алайском)
  address?: string; // Уточнение адреса/ориентира
  createdByUserId: string;
  isVerified: boolean; // Проверено модератором
}
```

### PriceReport (Отчет о цене)
Основная запись, которую создает пользователь.
```typescript
interface PriceReport {
  id: string;
  productId: string;
  placeId: string;
  
  price: number; // Цена
  currency: Currency; // Валюта (обычно UZS)
  
  quantity: number; // Количество (обычно 1)
  unit: Unit; // Единица измерения (кг, шт)
  
  dateObserved: string; // Дата, когда видели цену (ISO)
  
  createdByUserId: string;
  createdAt: string;
  
  comment?: string; // "Свежее", "По акции"
  isSuspicious: boolean; // Флаг подозрительной цены (авто или вручную)
}
```

### SuspiciousActivity (Подозрительная активность) - Опционально для MVP
Для модерации.
```typescript
interface SuspiciousActivity {
  id: string;
  reportId: string;
  reason: 'price_too_high' | 'price_too_low' | 'spam' | 'other';
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}
```
