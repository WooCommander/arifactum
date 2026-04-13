<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Point {
  lat: number
  lng: number
  title?: string
  id?: string
}

interface Props {
  points: Point[]
  center?: [number, number]
  zoom?: number
  interactive?: boolean
  userLocation?: [number, number] | null
  followUser?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 13,
  interactive: true,
  userLocation: null,
  followUser: false
})

const emit = defineEmits<{
  (e: 'markerClick', id: string): void
  (e: 'mapClick', lat: number, lng: number): void
}>()

const mapContainer = ref<HTMLElement | null>(null)
const map = shallowRef<L.Map | null>(null)
const markers = ref<L.Marker[]>([])
const userMarker = shallowRef<L.Marker | null>(null)

const refreshMarkersLayer = () => {
    if (!map.value) return

    // Clear existing markers
    markers.value.forEach(m => m.remove())
    markers.value = []

    // Add new markers
    const group = L.featureGroup()
    
    props.points.forEach(p => {
        const marker = L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: 'art-marker',
            html: `<div class="marker-dot"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        })

        if (p.id) {
            marker.on('click', () => emit('markerClick', p.id!))
        }

        marker.addTo(map.value as L.Map)
        markers.value.push(marker)
        group.addLayer(marker)
    })

    // Fit bounds if more than 1 point and no specific center provided and NOT in follow mode
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
      scrollWheelZoom: props.interactive,
      dragging: props.interactive,
      touchZoom: props.interactive
    }).setView(initialCenter as [number, number], props.zoom)

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map.value as L.Map)

    if (props.interactive) {
      L.control.zoom({ position: 'bottomright' }).addTo(map.value as L.Map)
    }

    refreshMarkersLayer()
    updateUserMarker()

    ;(map.value as L.Map).on('click', (e: L.LeafletMouseEvent) => {
      emit('mapClick', e.latlng.lat, e.latlng.lng)
    })
}

watch(() => props.points, () => {
    refreshMarkersLayer()
}, { deep: true })

watch(() => props.userLocation, () => {
    updateUserMarker()
}, { deep: true })

onMounted(() => {
  // Little delay to ensure container size is correct in some layouts
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
    <div ref="mapContainer" class="art-map-container"></div>
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
  }
  
  .user-pulse {
    position: absolute;
    width: 30px;
    height: 30px;
    background: rgba(66, 133, 244, 0.3);
    border-radius: 50%;
    z-index: 1;
    animation: user-pulse 2s infinite;
  }
}

@keyframes user-pulse {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}

.art-marker {
  display: flex;
  align-items: center;
  justify-content: center;

  .marker-dot {
    width: 14px;
    height: 14px;
    background: var(--color-primary);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s ease;
  }

  &:hover .marker-dot {
    transform: scale(1.3);
    background: var(--color-secondary);
  }
}

// Leaflet overrides
.leaflet-container {
    background: var(--color-background) !important;
}

.leaflet-control-zoom {
    border: none !important;
    box-shadow: var(--shadow-2) !important;
    
    a {
        border-radius: var(--radius-sm) !important;
        background: var(--color-surface) !important;
        color: var(--color-text-primary) !important;
        border: 1px solid var(--color-border) !important;
        
        &:hover {
            background: var(--color-surface-hover) !important;
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
  border-radius: inherit;
}

.art-map-container {
  width: 100%;
  height: 100%;
}
</style>
