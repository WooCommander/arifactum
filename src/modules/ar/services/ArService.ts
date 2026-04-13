import { CameraPreview } from '@capacitor-community/camera-preview'
import { ref } from 'vue'

export class ArService {
  private static isActive = ref(false)

  static async start(parent: string = 'content') {
    try {
      await CameraPreview.start({
        parent,
        position: 'rear',
        toBack: true,
        className: 'ar-camera-preview'
      })
      
      this.isActive.value = true
      // Make webview transparent
      document.body.classList.add('ar-mode-active')
      document.body.style.backgroundColor = 'transparent'
      document.documentElement.style.backgroundColor = 'transparent'
      return true
    } catch (e) {
      console.error('Failed to start AR camera:', e)
      return false
    }
  }

  static async stop() {
    try {
      await CameraPreview.stop()
      this.isActive.value = false
      // Restore background
      document.body.classList.remove('ar-mode-active')
      document.body.style.backgroundColor = ''
      document.documentElement.style.backgroundColor = ''
    } catch (e) {
      console.error('Failed to stop AR camera:', e)
    }
  }

  static get isStarted() {
    return this.isActive
  }
}
