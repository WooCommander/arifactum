<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Navigation, LocateFixed, Compass } from 'lucide-vue-next'
import { DbService } from '@/modules/offline/services/DbService'

/**
 * Custom TileLayer that checks IndexedDB for cached tiles
 */
const OfflineTileLayer = L.TileLayer.extend({
  createTile(coords: any, done: any) {
    const tile = document.createElement('img')
    tile.className = 'leaflet-tile'
    const tilePath = `${coords.z}/${coords.x}/${coords.y}`

    DbService.get('tiles', tilePath).then(blob => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        tile.src = url
        tile.onload = () => {
          done(null, tile)
          URL.revokeObjectURL(url)
        }
      } else {
        const url = (this as any).getTileUrl(coords)
        tile.src = url
        tile.onload = () => done(null, tile)
      }
    }).catch(() => {
      const url = (this as any).getTileUrl(coords)
      tile.src = url
      tile.onload = () => done(null, tile)
    })

    tile.onerror = () => {
      const url = (this as any).getTileUrl(coords)
      tile.src = url
      tile.onload = () => done(null, tile)
    }

    return tile
  }
})

interface Point {
  lat: number
  lng: number
  title?: string
  id?: string
  isCompleted?: boolean
  isActive?: boolean
  order?: number
}

interface Props {
  points: Point[]
  center?: [number, number]
  zoom?: number
  interactive?: boolean
  userLocation?: [number, number] | null
  followUser?: boolean
  teammates?: TeammateLocation[]
  showNames?: boolean
  isClustered?: boolean
  targetLocation?: [number, number] | null
  bearing?: number
}

interface TeammateLocation {
  user_id: string
  lat: number
  lng: number
  user_name?: string
  avatar_url?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 13,
  interactive: true,
  userLocation: null,
  followUser: false,
  teammates: () => [],
  showNames: false,
  bearing: 0
})

const emit = defineEmits<{
  (e: 'markerClick', id: string): void
  (e: 'mapClick', lat: number, lng: number): void
  (e: 'update:followUser', value: boolean): void
  (e: 'toggleCompass'): void
}>()

const mapContainer = ref<HTMLElement | null>(null)
const map = shallowRef<L.Map | null>(null)
const markers = ref<L.Marker[]>([])
const userMarker = shallowRef<L.Marker | null>(null)
const teammateMarkers = ref<Map<string, L.Marker>>(new Map())
const clusterMarker = shallowRef<L.Marker | null>(null)
const navLine = shallowRef<L.Polyline | null>(null)
const navArrow = shallowRef<L.Marker | null>(null)

const toggleFollow = () => {
  emit('update:followUser', !props.followUser)
}

const recenter = () => {
  if (props.userLocation && map.value) {
    map.value.panTo(props.userLocation, { animate: true, duration: 0.5 })
    emit('update:followUser', true)
  }
}

const refreshMarkersLayer = () => {
  if (!map.value) return

  markers.value.forEach(m => m.remove())
  markers.value = []

  if (clusterMarker.value) {
    clusterMarker.value.remove()
    clusterMarker.value = null
  }

  if (props.points.length === 0) return

  if (props.isClustered) {
    const avgLat = props.points.reduce((acc, p) => acc + p.lat, 0) / props.points.length
    const avgLng = props.points.reduce((acc, p) => acc + p.lng, 0) / props.points.length

    clusterMarker.value = L.marker([avgLat, avgLng], {
      icon: L.divIcon({
        className: 'route-cluster-marker',
        html: `
                    <div class="cluster-inner">
                        <span class="count">${props.points.length}</span>
                        <span class="label">точек</span>
                    </div>
                    <div class="cluster-pulse"></div>
                `,
        iconSize: [64, 64],
        iconAnchor: [32, 32]
      })
    }).addTo(map.value as L.Map)

    if (!props.center) {
      map.value.setView([avgLat, avgLng], 14)
    }
    return
  }

  const group = L.featureGroup()

  props.points.forEach(p => {
    const marker = L.marker([p.lat, p.lng], {
      icon: L.divIcon({
        className: 'art-marker',
        html: `
                    <div class="marker-pin ${p.isCompleted ? 'completed' : ''} ${p.isActive ? 'active' : ''}">
                        <span class="marker-number">${p.order || '?'}</span>
                    </div>
                `,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      })
    })

    if (p.id) {
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        if ((window as any).artSelectCheckpoint) {
          (window as any).artSelectCheckpoint(String(p.id))
        }
        emit('markerClick', String(p.id))
      })
    }

    marker.addTo(map.value as L.Map)
    markers.value.push(marker)
    group.addLayer(marker)
  })

  if (props.points.length > 1 && !props.center && !props.followUser) {
    (map.value as L.Map).fitBounds(group.getBounds(), { padding: [40, 40] })
  }
}

const updateUserMarker = () => {
  if (!map.value || !props.userLocation) {
    if (userMarker.value) {
      userMarker.value.remove()
      userMarker.value = null
    }
    return
  }

  const [lat, lng] = props.userLocation

  if (!userMarker.value) {
    userMarker.value = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'user-location-marker',
        html: `
          <div class="user-pulse"></div>
          <div class="user-dot"></div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      }),
      zIndexOffset: 1000
    }).addTo(map.value)
  } else {
    userMarker.value.setLatLng([lat, lng])
  }

  if (props.followUser) {
    map.value.panTo([lat, lng], { animate: true, duration: 0.5 })
  }
  updateNavigationLine()
}

const updateNavigationLine = () => {
  if (!map.value || !props.userLocation || !props.targetLocation) {
    if (navLine.value) navLine.value.remove()
    if (navArrow.value) navArrow.value.remove()
    navLine.value = null
    navArrow.value = null
    return
  }

  const latlngs: L.LatLngExpression[] = [
    props.userLocation as [number, number],
    props.targetLocation as [number, number]
  ]

  if (navLine.value) navLine.value.remove()

  navLine.value = L.polyline(latlngs, {
    color: '#FF0000',
    weight: 10,
    dashArray: '8, 12',
    opacity: 1,
    className: 'nav-guide-line'
  }).addTo(map.value)

  const angle = Math.atan2(
    props.targetLocation[0] - props.userLocation[0],
    props.targetLocation[1] - props.userLocation[1]
  ) * (180 / Math.PI)

  if (navArrow.value) {
    navArrow.value.setLatLng(props.targetLocation)
    navArrow.value.setIcon(createArrowIcon(angle))
  } else {
    navArrow.value = L.marker(props.targetLocation, {
      icon: createArrowIcon(angle),
      zIndexOffset: 1000
    }).addTo(map.value)
  }
}

const createArrowIcon = (angle: number) => {
  return L.divIcon({
    className: 'nav-arrow-marker',
    html: `
      <div class="arrow-wrap" style="transform: rotate(${90 - angle}deg)">
        <div class="arrow-head"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })
}

const updateTeammateMarkers = () => {
  if (!map.value) return
  const currentIds = new Set(props.teammates.map(t => t.user_id))
  for (const [id, marker] of teammateMarkers.value.entries()) {
    if (!currentIds.has(id)) {
      marker.remove()
      teammateMarkers.value.delete(id)
    }
  }
  props.teammates.forEach(t => {
    const existing = teammateMarkers.value.get(t.user_id)
    if (existing) {
      existing.setLatLng([t.lat, t.lng])
      if (props.showNames !== (existing as any)._wasShowingNames) {
        existing.setIcon(createTeammateIcon(t))
        ;(existing as any)._wasShowingNames = props.showNames
      }
    } else {
      const marker = L.marker([t.lat, t.lng], {
        icon: createTeammateIcon(t),
        zIndexOffset: 500
      }).addTo(map.value as L.Map)
      ;(marker as any)._wasShowingNames = props.showNames
      teammateMarkers.value.set(t.user_id, marker)
    }
  })
}

const createTeammateIcon = (t: TeammateLocation) => {
  return L.divIcon({
    className: 'teammate-marker',
    html: `
      <div class="teammate-wrap">
        ${props.showNames ? `<div class="teammate-label">${t.user_name || 'Игрок'}</div>` : ''}
        <div class="teammate-dot" style="${t.avatar_url ? `background-image: url(${t.avatar_url})` : ''}">
          ${!t.avatar_url ? (t.user_name?.[0] || 'U') : ''}
        </div>
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 24]
  })
}

const initializeLeafletMap = () => {
  if (!mapContainer.value) return
  const initialCenter = props.center || props.userLocation || [
    props.points[0]?.lat || 55.751244,
    props.points[0]?.lng || 37.618423
  ]
  map.value = L.map(mapContainer.value, {
    zoomControl: false,
    attributionControl: false,
    dragging: props.interactive,
    touchZoom: props.interactive,
    scrollWheelZoom: props.interactive,
    doubleClickZoom: props.interactive,
    boxZoom: false
  }).setView(initialCenter as [number, number], props.zoom)

  // @ts-ignore
  new OfflineTileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    crossOrigin: true
  }).addTo(map.value as L.Map)

  if (props.interactive) {
    L.control.zoom({ position: 'bottomright' }).addTo(map.value as L.Map)
  }

  refreshMarkersLayer()
  updateUserMarker()
  updateTeammateMarkers()

  ;(map.value as L.Map).on('click', (e: L.LeafletMouseEvent) => {
    emit('mapClick', e.latlng.lat, e.latlng.lng)
  })

  map.value.on('dragstart', () => {
    emit('update:followUser', false)
  })
}

watch(() => props.points, () => {
  refreshMarkersLayer()
}, { deep: true })

watch(() => props.isClustered, () => {
  refreshMarkersLayer()
})

watch(() => props.targetLocation, () => {
  updateNavigationLine()
})

watch(() => props.followUser, async () => {
  if (map.value) {
    setTimeout(() => {
      map.value?.invalidateSize()
      updateUserMarker()
    }, 100)
  }
})

onMounted(() => {
  setTimeout(initializeLeafletMap, 100)
})

onUnmounted(() => {
  if (map.value) {
    map.value.remove()
  }
})
</script>

<template>
  <div class="art-map-wrapper">
    <div ref="mapContainer" class="art-map-container" :style="{ '--map-rotation': `${props.bearing || 0}deg` }"></div>

    <div v-if="interactive && userLocation" class="map-custom-controls">
      <button :class="{ active: followUser }" title="Следование за мной" @click="toggleFollow">
        <Navigation :size="20" />
      </button>
      <button :class="{ active: bearing !== 0 }" title="Режим компаса" @click="emit('toggleCompass')">
         <Compass :size="20" />
      </button>
      <button title="Отцентрировать на мне" @click="recenter">
        <LocateFixed :size="20" />
      </button>
    </div>
  </div>
</template>

<style lang="scss">
.user-location-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  .user-dot {
    width: 14px;
    height: 14px;
    background: #4285F4;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    z-index: 2;
    transition: transform 0.3s ease;
  }
}

.art-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  .marker-pin {
    width: 32px;
    height: 32px;
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
    
    .marker-number {
      transform: rotate(45deg);
      color: var(--color-text-primary);
      font-size: 14px;
      font-weight: 900;
    }

    &.completed {
      background: var(--color-success) !important;
      opacity: 0.6;
    }

    &.active {
      background: var(--color-primary) !important;
      border-color: var(--color-white) !important;
      box-shadow: 0 0 20px var(--color-primary);
      transform: rotate(-45deg) scale(1.2);
    }
  }
}

.leaflet-control-zoom {
  border: none !important;
  box-shadow: var(--shadow-2) !important;
  margin-bottom: 110px !important;
  margin-right: 12px !important;
  a {
    width: 44px !important;
    height: 44px !important;
    line-height: 44px !important;
    border-radius: 12px !important;
    background: var(--color-surface) !important;
    color: var(--color-text-primary) !important;
    border: 1px solid var(--color-border) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
}

.map-custom-controls {
  position: absolute;
  bottom: 215px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;
  button {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--color-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-2);
    &.active {
      background: var(--color-primary);
      color: #000;
    }
  }
}
</style>

<style scoped lang="scss">
.art-map-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.art-map-container {
  width: 100%;
  height: 100%;
  z-index: 1;
  background: #111;
  // Временно отключаем вращение контейнера для дебага кликов
  // transform: rotate(calc(-1 * var(--map-rotation, 0deg)));
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

// Компенсация вращения для маркеров - ВНИМАНИЕ: вращаем только внутренние элементы!
:deep(.marker-pin),
:deep(.user-dot),
:deep(.teammate-wrap) {
  transform: rotate(var(--map-rotation, 0deg)) !important;
}

// Специальный случай для активного маркера (у него уже есть rotate(-45deg))
:deep(.marker-pin.active) {
  transform: rotate(calc(-45deg + var(--map-rotation, 0deg))) scale(1.2) !important;
}

// Для обычного маркера (у него тоже rotate(-45deg))
:deep(.marker-pin:not(.active)) {
  transform: rotate(calc(-45deg + var(--map-rotation, 0deg))) !important;
}

:deep(.leaflet-control-container) {
  transform: rotate(var(--map-rotation, 0deg)) !important;
}
</style>
