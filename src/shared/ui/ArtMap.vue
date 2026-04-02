<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
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
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 13,
  interactive: true
})

const emit = defineEmits<{
  (e: 'markerClick', id: string): void
  (e: 'mapClick', lat: number, lng: number): void
}>()

const mapContainer = ref<HTMLElement | null>(null)
const map = ref<L.Map | null>(null)
const markers = ref<L.Marker[]>([])

const initMap = () => {
  if (!mapContainer.value) return

  const initialCenter = props.center || [
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
  }).addTo(map.value!)

  if (props.interactive) {
    L.control.zoom({ position: 'bottomright' }).addTo(map.value!)
  }

  updateMarkers()

  map.value!.on('click', (e: L.LeafletMouseEvent) => {
    emit('mapClick', e.latlng.lat, e.latlng.lng)
  })
}

const updateMarkers = () => {
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

    marker.addTo(map.value!)
    markers.value.push(marker)
    group.addLayer(marker)
  })

  // Fit bounds if more than 1 point and no specific center provided
  if (props.points.length > 1 && !props.center) {
    map.value.fitBounds(group.getBounds(), { padding: [40, 40] })
  }
}

watch(() => props.points, () => {
    updateMarkers()
}, { deep: true })

onMounted(() => {
  // Little delay to ensure container size is correct in some layouts
  setTimeout(initMap, 100)
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
