import { DbService } from './DbService'

export class TileCache {
  private static TILE_URL = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
  private static SUBDOMAINS = ['a', 'b', 'c']

  /**
   * Caches tiles around a list of points
   * @param points Array of [lat, lng]
   * @param radius Radius in meters (e.g. 500)
   * @param zooms Zoom levels to cache (e.g. [14, 15, 16, 17])
   */
  static async cacheArea(points: [number, number][], radius: number = 500, zooms: number[] = [14, 15, 16, 17]): Promise<void> {
    const tilesToDownload = new Set<string>()

    for (const zoom of zooms) {
      for (const [lat, lng] of points) {
        const bounds = this.getBounds(lat, lng, radius)
        const nw = this.latLngToTile(bounds.nw[0], bounds.nw[1], zoom)
        const se = this.latLngToTile(bounds.se[0], bounds.se[1], zoom)

        for (let x = nw.x; x <= se.x; x++) {
          for (let y = nw.y; y <= se.y; y++) {
            tilesToDownload.add(`${zoom}/${x}/${y}`)
          }
        }
      }
    }

    console.log(`Starting download of ${tilesToDownload.size} tiles...`)
    
    // Download in chunks to avoid overwhelming the network
    const chunks = Array.from(tilesToDownload)
    const chunkSize = 5
    for (let i = 0; i < chunks.length; i += chunkSize) {
      const chunk = chunks.slice(i, i + chunkSize)
      await Promise.all(chunk.map(tilePath => this.downloadTile(tilePath)))
    }
  }

  private static async downloadTile(tilePath: string): Promise<void> {
    const [z, x, y] = tilePath.split('/')
    
    // Check if already in DB
    const existing = await DbService.get('tiles', tilePath)
    if (existing) return

    const s = this.SUBDOMAINS[Math.floor(Math.random() * this.SUBDOMAINS.length)]
    const url = this.TILE_URL
      .replace('{s}', s)
      .replace('{z}', z)
      .replace('{x}', x)
      .replace('{y}', y)

    try {
      const response = await fetch(url)
      const blob = await response.blob()
      await DbService.set('tiles', tilePath, blob)
    } catch (e) {
      console.error(`Failed to download tile ${tilePath}:`, e)
    }
  }

  private static latLngToTile(lat: number, lng: number, zoom: number) {
    const n = Math.pow(2, zoom)
    const x = Math.floor(((lng + 180) / 360) * n)
    const y = Math.floor(
      ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
    )
    return { x, y }
  }

  private static getBounds(lat: number, lng: number, radiusMeters: number) {
    const latDiff = (radiusMeters / 111320)
    const lngDiff = (radiusMeters / (111320 * Math.cos(lat * Math.PI / 180)))
    
    return {
      nw: [lat + latDiff, lng - lngDiff],
      se: [lat - latDiff, lng + lngDiff]
    }
  }
}
