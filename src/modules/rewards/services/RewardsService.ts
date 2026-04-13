import { supabase } from '@/api/supabase'
import { AudioService } from '@/shared/lib/AudioService'

export interface RouteStats {
  durationSeconds: number
  distanceMeters: number
  avgSpeedKmh: number
  xpGained: number
  levelGained: boolean
}

export const RewardsService = {
  calculateXP(distanceMeters: number, isCompleted: boolean): number {
    const baseXP = isCompleted ? 500 : 50
    const distanceBonus = Math.floor(distanceMeters / 100) * 10
    return baseXP + distanceBonus
  },

  async finishRoute(userId: string, routeId: string, durationSeconds: number, checkpoints: any[]): Promise<RouteStats> {
    // 1. Calculate distance (sum of gaps between checkpoints)
    let totalDistance = 0
    for (let i = 0; i < checkpoints.length - 1; i++) {
        totalDistance += this.getDistance(
            checkpoints[i].latitude, checkpoints[i].longitude,
            checkpoints[i+1].latitude, checkpoints[i+1].longitude
        )
    }

    const avgSpeedKmh = totalDistance > 0 
        ? (totalDistance / 1000) / (durationSeconds / 3600) 
        : 0

    const xpGained = this.calculateXP(totalDistance, true)

    // 2. Update Profile & Check Level Up
    const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level, total_distance_meters, total_seconds_spent, routes_completed_count')
        .eq('id', userId)
        .single()

    const newXp = (profile?.xp || 0) + xpGained
    const newDistance = (profile?.total_distance_meters || 0) + totalDistance
    const newSeconds = (profile?.total_seconds_spent || 0) + durationSeconds
    const newCount = (profile?.routes_completed_count || 0) + 1

    // Simple leveling: Level up every 1000 XP for now
    const newLevel = Math.floor(newXp / 1000) + 1
    const levelGained = newLevel > (profile?.level || 1)

    await supabase
        .from('profiles')
        .update({
            xp: newXp,
            level: newLevel,
            total_distance_meters: newDistance,
            total_seconds_spent: newSeconds,
            routes_completed_count: newCount
        })
        .eq('id', userId)

    // 3. Save detailed completion log
    await supabase.from('route_completions').insert({
        user_id: userId,
        route_id: routeId,
        duration_seconds: durationSeconds,
        distance_meters: totalDistance,
        avg_speed_kmh: avgSpeedKmh
    })

    // 4. Trigger Audio
    if (levelGained) {
        await AudioService.playLevelUp()
    } else {
        await AudioService.playVictory()
    }

    return {
        durationSeconds,
        distanceMeters: Math.round(totalDistance),
        avgSpeedKmh: parseFloat(avgSpeedKmh.toFixed(1)),
        xpGained,
        levelGained
    }
  },

  getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3 // Earth radius in meters
    const f1 = lat1 * Math.PI / 180
    const f2 = lat2 * Math.PI / 180
    const df = (lat2 - lat1) * Math.PI / 180
    const dl = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(df / 2) * Math.sin(df / 2) +
              Math.cos(f1) * Math.cos(f2) *
              Math.sin(dl / 2) * Math.sin(dl / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }
}
