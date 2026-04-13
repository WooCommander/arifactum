import { supabase } from '@/api/supabase'

/**
 * Загрузка изображения в Supabase Storage
 * @param file Файл для загрузки
 * @param bucket Название бакета (по умолчанию 'routes')
 * @returns Публичный URL загруженного файла
 */
export async function uploadImage(file: File, bucket: string = 'routes'): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
  const filePath = `${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file)

  if (uploadError) {
    throw new Error(`Ошибка загрузки: ${uploadError.message}`)
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return data.publicUrl
}

/**
 * Удаление изображения из Supabase Storage (по желанию)
 * @param url Полный публичный URL изображения
 * @param bucket Название бакета
 */
export async function deleteImage(url: string, bucket: string = 'routes'): Promise<void> {
  try {
    const urlParts = url.split('/')
    const fileName = urlParts[urlParts.length - 1]
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName])
      
    if (error) throw error
  } catch (e) {
    console.error('Failed to delete image:', e)
  }
}
