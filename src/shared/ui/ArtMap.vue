<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Point {
  lat: number
  lng: number
  title?: string
  id?: string
  isCompleted?: boolean
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
  showNames: false
})

const emit = defineEmits<{
  (e: 'markerClick', id: string): void
  (e: 'mapClick', lat: number, lng: number): void
}>()

const mapContainer = ref<HTMLElement | null>(null)
const map = shallowRef<L.Map | null>(null)
const markers = ref<L.Marker[]>([])
const userMarker = shallowRef<L.Marker | null>(null)
const teammateMarkers = ref<Map<string, L.Marker>>(new Map())
const clusterMarker = shallowRef<L.Marker | null>(null)
const navLine = shallowRef<L.Polyline | null>(null)
const navArrow = shallowRef<L.Marker | null>(null)

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
        // Show as single cluster
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
        
        // Center view on cluster if needed
        if (!props.center) {
            map.value.setView([avgLat, avgLng], 14)
        }
        return
    }

    // Add new individual markers
    const group = L.featureGroup()
    
    props.points.forEach(p => {
        const marker = L.marker([p.lat, p.lng], {
            icon: L.divIcon({
                className: 'art-marker',
                html: `
                    <div class="marker-pin ${p.isCompleted ? 'completed' : ''}">
                        <span class="marker-number">${p.order || '?'}</span>
                    </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 32]
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
    props.userLocation,
    props.targetLocation
  ]

  if (navLine.value) {
    navLine.value.setLatLngs(latlngs)
  } else {
    navLine.value = L.polyline(latlngs, {
      color: 'var(--color-primary)',
      weight: 3,
      dashArray: '8, 12',
      opacity: 0.6,
      className: 'nav-guide-line'
    }).addTo(map.value)
  }

  // Update Arrow Head
  const angle = Math.atan2(
    props.targetLocation[0] - props.userLocation[0],
    props.targetLocation[1] - props.userLocation[1]
  ) * (180 / Math.PI)

  if (navArrow.value) {
    navArrow.value.setLatLng(props.targetLocation)
    // We update the rotation via CSS class or re-creating icon
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

  // Remove markers for users no longer in the list
  const currentIds = new Set(props.teammates.map(t => t.user_id))
  for (const [id, marker] of teammateMarkers.value.entries()) {
    if (!currentIds.has(id)) {
      marker.remove()
      teammateMarkers.value.delete(id)
    }
  }

  // Add or update markers
  props.teammates.forEach(t => {
    // We'll filter self in the parent or assume it's already filtered
    const existing = teammateMarkers.value.get(t.user_id)
    if (existing) {
      existing.setLatLng([t.lat, t.lng])
      // Update name visibility if needed (re-render icon)
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
    updateTeammateMarkers()

    ;(map.value as L.Map).on('click', (e: L.LeafletMouseEvent) => {
      emit('mapClick', e.latlng.lat, e.latlng.lng)
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

watch(() => props.userLocation, () => {
    updateUserMarker()
}, { deep: true })

watch(() => props.teammates, () => {
    updateTeammateMarkers()
}, { deep: true })

watch(() => props.showNames, () => {
    updateTeammateMarkers()
})

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

/* Teammate Markers */
.teammate-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  
  .teammate-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  }
  
  .teammate-dot {
    width: 32px;
    height: 32px;
    background: var(--color-primary);
    color: white;
    border: 3px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
    background-size: cover;
    background-position: center;
  }
  
  .teammate-label {
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 10px;
    white-space: nowrap;
    backdrop-filter: blur(4px);
  }
}

/* Route Cluster Marker */
.route-cluster-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  
  .cluster-inner {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, var(--color-primary) 0%, #175ec9 100%);
    border: 4px solid white;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
    z-index: 2;
    
    .count {
      font-size: 20px;
      font-weight: 900;
      line-height: 1;
    }
    
    .label {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 800;
      opacity: 0.8;
    }
  }
  
  .cluster-pulse {
    position: absolute;
    width: 60px;
    height: 60px;
    background: var(--color-primary);
    border-radius: 50%;
    z-index: 1;
    animation: cluster-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
    opacity: 0.4;
  }
}

@keyframes cluster-ping {
  0% { transform: scale(1); opacity: 0.4; }
  100% { transform: scale(2); opacity: 0; }
}

/* Navigation Line & Arrow */
.nav-guide-line {
  stroke-dashoffset: 0;
  animation: line-flow 2s linear infinite;
}

@keyframes line-flow {
  from { stroke-dashoffset: 20; }
  to { stroke-dashoffset: 0; }
}

.nav-arrow-marker {
  .arrow-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s ease;
  }
  
  .arrow-head {
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 12px solid var(--color-primary);
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    animation: arrow-pulse 1s ease-in-out infinite;
  }
}

@keyframes arrow-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.art-marker {
  display: flex;
  align-items: center;
  justify-content: center;

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
