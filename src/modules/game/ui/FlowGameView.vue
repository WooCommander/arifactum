<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCcw, Lightbulb, Share2, Trophy, ThumbsUp } from 'lucide-vue-next'
import { FpHaptics } from '@/shared/lib/haptics'
import confetti from 'canvas-confetti'
import { gameService } from '../services/GameService'

// Level Definitions
interface Level {
    id?: string
    size: number
    dots: { color: string, r: number, c: number }[]
    solutions?: Record<string, { r: number, c: number }[]>
}

const LEVELS: Level[] = [
    {
        size: 4,
        dots: [
            { color: '#ef4444', r: 0, c: 0 }, { color: '#ef4444', r: 3, c: 3 },
            { color: '#3b82f6', r: 1, c: 0 }, { color: '#3b82f6', r: 3, c: 2 },
            { color: '#22c55e', r: 2, c: 0 }, { color: '#22c55e', r: 2, c: 1 },
            { color: '#eab308', r: 3, c: 0 }, { color: '#eab308', r: 3, c: 1 }
        ]
    },
    {
        size: 5,
        dots: [
            { color: '#ef4444', r: 4, c: 4 }, { color: '#ef4444', r: 0, c: 4 },
            { color: '#3b82f6', r: 4, c: 3 }, { color: '#3b82f6', r: 0, c: 0 },
            { color: '#22c55e', r: 4, c: 2 }, { color: '#22c55e', r: 1, c: 0 },
            { color: '#eab308', r: 4, c: 1 }, { color: '#eab308', r: 2, c: 0 },
            { color: '#a855f7', r: 4, c: 0 }, { color: '#a855f7', r: 3, c: 0 }
        ]
    },
    {
        size: 6,
        dots: [
            { color: '#ef4444', r: 5, c: 5 }, { color: '#ef4444', r: 0, c: 5 },
            { color: '#3b82f6', r: 5, c: 4 }, { color: '#3b82f6', r: 0, c: 0 },
            { color: '#22c55e', r: 5, c: 3 }, { color: '#22c55e', r: 1, c: 0 },
            { color: '#eab308', r: 5, c: 2 }, { color: '#eab308', r: 2, c: 0 },
            { color: '#a855f7', r: 5, c: 1 }, { color: '#a855f7', r: 3, c: 0 },
            { color: '#f97316', r: 5, c: 0 }, { color: '#f97316', r: 4, c: 0 }
        ]
    },
    {
        size: 6,
        dots: [
            { color: '#ef4444', r: 0, c: 0 }, { color: '#ef4444', r: 4, c: 2 },
            { color: '#3b82f6', r: 0, c: 1 }, { color: '#3b82f6', r: 4, c: 4 },
            { color: '#22c55e', r: 1, c: 1 }, { color: '#22c55e', r: 2, c: 1 },
            { color: '#eab308', r: 0, c: 4 }, { color: '#eab308', r: 3, c: 4 }
        ],
        solutions: {
            '#ef4444': [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 3, c: 0 }, { r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 }],
            '#3b82f6': [{ r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 1, c: 3 }, { r: 2, c: 3 }, { r: 3, c: 3 }, { r: 4, c: 3 }, { r: 4, c: 4 }],
            '#22c55e': [{ r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 2 }, { r: 3, c: 2 }, { r: 3, c: 1 }, { r: 2, c: 1 }],
            '#eab308': [{ r: 0, c: 4 }, { r: 1, c: 4 }, { r: 2, c: 4 }, { r: 3, c: 4 }]
        }
    },
    {
        size: 6,
        dots: [
            { color: '#ef4444', r: 0, c: 0 }, { color: '#ef4444', r: 5, c: 0 },
            { color: '#3b82f6', r: 0, c: 3 }, { color: '#3b82f6', r: 3, c: 5 },
            { color: '#22c55e', r: 0, c: 4 }, { color: '#22c55e', r: 2, c: 5 },
            { color: '#eab308', r: 2, c: 4 }, { color: '#eab308', r: 4, c: 4 },
            { color: '#a855f7', r: 1, c: 0 }, { color: '#a855f7', r: 1, c: 1 }
        ],
        solutions: {
            '#ef4444': [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 2 }, { r: 2, c: 2 }, { r: 3, c: 2 }, { r: 4, c: 2 }, { r: 5, c: 2 }, { r: 5, c: 1 }, { r: 5, c: 0 }],
            '#3b82f6': [{ r: 0, c: 3 }, { r: 1, c: 3 }, { r: 2, c: 3 }, { r: 3, c: 3 }, { r: 4, c: 3 }, { r: 5, c: 3 }, { r: 5, c: 4 }, { r: 5, c: 5 }, { r: 4, c: 5 }, { r: 3, c: 5 }],
            '#22c55e': [{ r: 0, c: 4 }, { r: 0, c: 5 }, { r: 1, c: 5 }, { r: 2, c: 5 }],
            '#eab308': [{ r: 2, c: 4 }, { r: 3, c: 4 }, { r: 4, c: 4 }],
            '#a855f7': [{ r: 1, c: 0 }, { r: 2, c: 0 }, { r: 3, c: 0 }, { r: 4, c: 0 }, { r: 4, c: 1 }, { r: 3, c: 1 }, { r: 2, c: 1 }, { r: 1, c: 1 }]
        }
    },
    {
        size: 7,
        dots: [
            { color: '#ef4444', r: 0, c: 0 }, { color: '#ef4444', r: 1, c: 6 },
            { color: '#3b82f6', r: 2, c: 6 }, { color: '#3b82f6', r: 6, c: 0 },
            { color: '#22c55e', r: 5, c: 0 }, { color: '#22c55e', r: 1, c: 1 },
            { color: '#eab308', r: 1, c: 2 }, { color: '#eab308', r: 3, c: 3 }
        ],
        solutions: {
            '#ef4444': [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 }, { r: 0, c: 5 }, { r: 0, c: 6 }, { r: 1, c: 6 }],
            '#3b82f6': [{ r: 2, c: 6 }, { r: 3, c: 6 }, { r: 4, c: 6 }, { r: 5, c: 6 }, { r: 6, c: 6 }, { r: 6, c: 5 }, { r: 6, c: 4 }, { r: 6, c: 3 }, { r: 6, c: 2 }, { r: 6, c: 1 }, { r: 6, c: 0 }],
            '#22c55e': [{ r: 5, c: 0 }, { r: 4, c: 0 }, { r: 3, c: 0 }, { r: 2, c: 0 }, { r: 1, c: 0 }, { r: 1, c: 1 }],
            '#eab308': [{ r: 1, c: 2 }, { r: 1, c: 3 }, { r: 1, c: 4 }, { r: 1, c: 5 }, { r: 2, c: 5 }, { r: 3, c: 5 }, { r: 4, c: 5 }, { r: 5, c: 5 }, { r: 5, c: 4 }, { r: 5, c: 3 }, { r: 5, c: 2 }, { r: 5, c: 1 }, { r: 4, c: 1 }, { r: 3, c: 1 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }, { r: 3, c: 4 }, { r: 4, c: 4 }, { r: 4, c: 3 }, { r: 4, c: 2 }, { r: 3, c: 2 }, { r: 3, c: 3 }]
        }
    }
]

// Генератор математически проходимых уровней (рандомное блуждание)
const generateFlowLevel = (size: number, numColors: number): Level => {
    const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6']
    let grid: number[][] = Array(size).fill(0).map(() => Array(size).fill(-1))
    let paths: { r: number, c: number }[][] = Array(numColors).fill(0).map(() => [])
    let empty: { r: number, c: number }[] = []

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) empty.push({ r, c })
    }

    // Перемешиваем пустые ячейки
    for (let i = empty.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [empty[i], empty[j]] = [empty[j], empty[i]]
    }

    // Стартуем
    for (let i = 0; i < numColors; i++) {
        let spot = empty.pop()!
        grid[spot.r][spot.c] = i
        paths[i].push(spot)
    }

    let progress = true
    while (progress) {
        progress = false
        let order = Array(numColors).fill(0).map((_, i) => i).sort(() => Math.random() - 0.5)

        for (let c of order) {
            let path = paths[c]
            let head = path[path.length - 1]
            let neighbors = [
                { r: head.r - 1, c: head.c }, { r: head.r + 1, c: head.c },
                { r: head.r, c: head.c - 1 }, { r: head.r, c: head.c + 1 }
            ].filter(n => n.r >= 0 && n.r < size && n.c >= 0 && n.c < size && grid[n.r][n.c] === -1)

            if (neighbors.length > 0) {
                let nxt = neighbors[Math.floor(Math.random() * neighbors.length)]
                grid[nxt.r][nxt.c] = c
                path.push(nxt)
                empty = empty.filter(e => e.r !== nxt.r || e.c !== nxt.c)
                progress = true
            }
        }
    }

    // Отсеиваем пути, которые не смогли вырасти
    let validPaths = paths.filter(p => p.length >= 2)
    if (validPaths.length < numColors) return generateFlowLevel(size, numColors) // ретрай

    let dots = []
    let solutions: Record<string, { r: number, c: number }[]> = {}

    for (let i = 0; i < validPaths.length; i++) {
        let color = COLORS[i % COLORS.length]
        let p = validPaths[i]
        dots.push({ color, r: p[0].r, c: p[0].c })
        dots.push({ color, r: p[p.length - 1].r, c: p[p.length - 1].c })
        solutions[color] = p
    }

    return { size, dots, solutions }
}

const EXTRA_LEVELS = [
    generateFlowLevel(6, 4),
    generateFlowLevel(7, 5), generateFlowLevel(7, 6),
    generateFlowLevel(8, 6), generateFlowLevel(8, 7), generateFlowLevel(8, 8),
    generateFlowLevel(9, 7), generateFlowLevel(9, 8), generateFlowLevel(9, 9),
    generateFlowLevel(10, 8), generateFlowLevel(10, 9), generateFlowLevel(10, 10),
    generateFlowLevel(11, 9), generateFlowLevel(11, 10), generateFlowLevel(12, 10)
]

LEVELS.push(...EXTRA_LEVELS)

// State
const router = useRouter()
const isPlayingFromHub = ref(false)

// Загрузка комьюнити уровня если перешли из хаба
const communityPlayRaw = localStorage.getItem('fp_community_play')
if (communityPlayRaw) {
    try {
        const communityLevel = JSON.parse(communityPlayRaw)
        LEVELS.unshift(communityLevel) // Кладем в начало
        localStorage.removeItem('fp_community_play')
        isPlayingFromHub.value = true

        // Хакаем, чтобы currentCommunityLevelId подхватился при инициализации
        setTimeout(() => {
            const el = document.getElementById('community-level-injector')
            if (el) el.click()
        }, 50)
    } catch (e) { }
}

const savedLevelIndex = parseInt(localStorage.getItem('fp_flow_current_level') || '0')
// Если играем из хаба, форсируем индекс 0
const currentLevelIndex = ref(isPlayingFromHub.value ? 0 : Math.min(savedLevelIndex, LEVELS.length - 1))
const levelPassed = ref(false)

const timer = ref(0)
const savedScore = parseInt(localStorage.getItem('fp_flow_total_score') || '0')
const totalScore = ref(isPlayingFromHub.value ? 0 : savedScore)
const bestScore = ref(parseInt(localStorage.getItem('fp_flow_best') || '0'))
let intervalId: ReturnType<typeof setInterval> | null = null

const gridSize = computed(() => LEVELS[currentLevelIndex.value].size)
const dots = computed(() => LEVELS[currentLevelIndex.value].dots)

// paths: Record<color, Array<{r, c}>>
const paths = ref<Record<string, { r: number, c: number }[]>>({})
const isDragging = ref(false)
const activeColor = ref<string | null>(null)
const gridRef = ref<HTMLElement | null>(null)
let cellWidth = 0

const formattedTime = computed(() => {
    const m = Math.floor(timer.value / 60)
    const s = timer.value % 60
    return `${m}:${s.toString().padStart(2, '0')}`
})

// Board initialization
const initBoard = () => {
    levelPassed.value = false
    paths.value = {}
    dots.value.forEach(d => {
        paths.value[d.color] = []
    })

    if (intervalId) clearInterval(intervalId)
    timer.value = 0
    intervalId = setInterval(() => {
        if (!levelPassed.value) timer.value++
    }, 1000)

    updateCellSize()
}

// Touch / Mouse Handling
const getCellFromEvent = (e: TouchEvent | MouseEvent) => {
    if (!gridRef.value) return null
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY

    const rect = gridRef.value.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    UpdateCellSizeInner(rect.width)

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null

    const c = Math.floor(x / cellWidth)
    const r = Math.floor(y / cellWidth)

    // Bounds check
    if (r >= 0 && r < gridSize.value && c >= 0 && c < gridSize.value) {
        return { r, c }
    }
    return null
}

const UpdateCellSizeInner = (gridW: number) => {
    cellWidth = gridW / gridSize.value
}

const updateCellSize = () => {
    if (gridRef.value) {
        cellWidth = gridRef.value.getBoundingClientRect().width / gridSize.value
    }
}

const showHintUsed = ref(false)

const useHint = () => {
    // Стоимость подсказки
    const HINT_COST = 200

    const colors = Array.from(new Set(dots.value.map(d => d.color)))

    // Ищем незавершенные или неправильные пути
    let targetColor: string | null = null
    for (const color of colors) {
        const path = paths.value[color]
        const colorDots = dots.value.filter(d => d.color === color)
        if (!path || path.length < 2) {
            targetColor = color
            break
        }

        const first = path[0]
        const last = path[path.length - 1]

        const connectsA = (first.r === colorDots[0].r && first.c === colorDots[0].c && last.r === colorDots[1].r && last.c === colorDots[1].c)
        const connectsB = (first.r === colorDots[1].r && first.c === colorDots[1].c && last.r === colorDots[0].r && last.c === colorDots[0].c)

        if (!connectsA && !connectsB) {
            targetColor = color
            break
        }
    }

    if (targetColor) {
        // Уменьшаем счет
        totalScore.value -= HINT_COST

        // Автоматически строим путь подсказки из solution (с анимацией)
        const solutionPath = (LEVELS[currentLevelIndex.value] as any).solutions[targetColor]
        paths.value[targetColor] = solutionPath

        FpHaptics.success()

        // Показываем минус UI
        showHintUsed.value = true
        setTimeout(() => showHintUsed.value = false, 1500)

        // Проверяем победу сразу после подсказки
        checkWin()
    }
}

const startDrag = (e: TouchEvent | MouseEvent) => {
    if (levelPassed.value) return
    isDragging.value = true
    const cell = getCellFromEvent(e)
    if (!cell) return

    // Did we tap on a dot?
    const dot = dots.value.find(d => d.r === cell.r && d.c === cell.c)
    if (dot) {
        activeColor.value = dot.color
        paths.value[dot.color] = [cell] // Start new path
        FpHaptics.light()
        return
    }

    // Did we tap on an existing path? Resume tracking
    for (const [color, path] of Object.entries(paths.value)) {
        const idx = path.findIndex(p => p.r === cell.r && p.c === cell.c)
        if (idx !== -1) {
            activeColor.value = color
            paths.value[color] = path.slice(0, idx + 1) // Cut tail
            FpHaptics.light()
            return
        }
    }
}

const moveDrag = (e: TouchEvent | MouseEvent) => {
    if (!isDragging.value || !activeColor.value || levelPassed.value) return
    const cell = getCellFromEvent(e)
    if (!cell) return

    const currentPath = paths.value[activeColor.value]
    if (currentPath.length === 0) return

    const last = currentPath[currentPath.length - 1]

    // Have we moved to a new cell?
    if (last.r !== cell.r || last.c !== cell.c) {
        // Must be adjacent
        const isAdjacent = Math.abs(last.r - cell.r) + Math.abs(last.c - cell.c) === 1
        if (!isAdjacent) return

        // Prevent moving onto a starting dot of a different color
        const diffDot = dots.value.find(d => d.r === cell.r && d.c === cell.c && d.color !== activeColor.value)
        if (diffDot) return

        // Check crossing own path (loop back) - backtrack
        const ownIndex = currentPath.findIndex(p => p.r === cell.r && p.c === cell.c)
        if (ownIndex !== -1) {
            paths.value[activeColor.value] = currentPath.slice(0, ownIndex + 1)
            return
        }

        // Cut other paths crossed
        for (const [col, path] of Object.entries(paths.value)) {
            if (col !== activeColor.value) {
                const crossIdx = path.findIndex(p => p.r === cell.r && p.c === cell.c)
                if (crossIdx !== -1) {
                    paths.value[col] = path.slice(0, crossIdx) // Cut
                }
            }
        }

        currentPath.push(cell)
        FpHaptics.selection()

        // Have we reached the target dot?
        const targetDot = dots.value.find(d => d.r === cell.r && d.c === cell.c && d.color === activeColor.value)

        // Target dot found and it is not the starting dot
        if (targetDot && currentPath.length > 1) {
            activeColor.value = null // Stop drawing automagically
            isDragging.value = false
            FpHaptics.success()
            checkWin()
        }
    }
}

const endDrag = () => {
    isDragging.value = false
    activeColor.value = null
    checkWin()
}

const pipesConnected = computed(() => {
    let count = 0
    const colorGroups = Array.from(new Set(dots.value.map(d => d.color)))
    for (const color of colorGroups) {
        const path = paths.value[color]
        if (!path || path.length < 2) continue

        const first = path[0]
        const last = path[path.length - 1]
        const colorDots = dots.value.filter(d => d.color === color)

        const connectsA = (first.r === colorDots[0].r && first.c === colorDots[0].c && last.r === colorDots[1].r && last.c === colorDots[1].c)
        const connectsB = (first.r === colorDots[1].r && first.c === colorDots[1].c && last.r === colorDots[0].r && last.c === colorDots[0].c)

        if (connectsA || connectsB) count++
    }
    return count
})

const showLeaderboard = ref(false)
const leaderboardData = ref<any[]>([])

// Community sharing
const isPublishing = ref(false)
const hasPublished = ref(false)
const currentCommunityLevelId = ref<string | null>(null) // Заполняется если играем в комьюнити уровень

const shareLevel = async () => {
    if (isPublishing.value || hasPublished.value) return

    // Публикуем только сгенерированные уровни (индекс >= 5)
    if (currentLevelIndex.value < 5 && !currentCommunityLevelId.value) return

    isPublishing.value = true
    try {
        const levelData = LEVELS[currentLevelIndex.value]
        const res = await gameService.shareLevel({
            size: levelData.size,
            dots: levelData.dots,
            solutions: levelData.solutions
        })
        if (res) {
            hasPublished.value = true
            currentCommunityLevelId.value = res.id
            await gameService.saveScore(res.id, totalScore.value)
        }
    } finally {
        isPublishing.value = false
    }
}

const hasLikedLocally = ref(false)
const likeCurrentLevel = async () => {
    if (!currentCommunityLevelId.value || hasLikedLocally.value) return
    const newLikes = await gameService.likeLevel(currentCommunityLevelId.value)
    if (newLikes !== null) {
        hasLikedLocally.value = true
        FpHaptics.success()
    }
}

const fetchLeaderboard = async () => {
    if (!currentCommunityLevelId.value && !hasPublished.value) return
    let lid = currentCommunityLevelId.value
    if (!lid) {
        // Find if we just published it and didn't save ID, wait, it is saved in res.id
        return
    }
    showLeaderboard.value = true
    leaderboardData.value = await gameService.getLeaderboard(lid)
}

const totalColors = computed(() => new Set(dots.value.map(d => d.color)).size)

const checkWin = () => {
    if (levelPassed.value) return

    // Победа засчитывается, если просто соединены все цвета (без проверки заполнения 100% поля)
    if (pipesConnected.value === totalColors.value) {
        levelPassed.value = true
        if (intervalId) clearInterval(intervalId)

        // Calculate points
        const basePoints = gridSize.value * 50
        const expectedTime = gridSize.value * 5 // e.g. 5x5 = 25s, 8x8 = 40s
        const speedBonus = Math.max(0, expectedTime - timer.value) * 10
        totalScore.value += basePoints + speedBonus

        // Сохраняем накопительный счет если это основная кампания
        if (!isPlayingFromHub.value) {
            localStorage.setItem('fp_flow_total_score', totalScore.value.toString())
        }

        if (totalScore.value > bestScore.value) {
            bestScore.value = totalScore.value
            localStorage.setItem('fp_flow_best', bestScore.value.toString())
        }

        // Если это комьюнити уровень, сохраняем рекорд
        if (currentCommunityLevelId.value) {
            gameService.saveScore(currentCommunityLevelId.value, totalScore.value)
        }

        FpHaptics.success()
        setTimeout(() => {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } })
        }, 100)
    }
}

const nextLevel = () => {
    if (currentLevelIndex.value < LEVELS.length - 1) {
        currentLevelIndex.value++
        // Если это не загруженный из комьюнити уровень, сохраняем прогресс локальной кампании
        if (!currentCommunityLevelId.value) {
            localStorage.setItem('fp_flow_current_level', currentLevelIndex.value.toString())
        }
        initBoard()
    }
}

const getSvgPoints = (path: { r: number, c: number }[]) => {
    if (!path || path.length === 0) return ''
    return path.map(p => {
        // center of cell
        const cx = p.c * cellWidth + cellWidth / 2
        const cy = p.r * cellWidth + cellWidth / 2
        return `${cx},${cy}`
    }).join(' ')
}

onMounted(() => {
    const saved = localStorage.getItem('fp_flow_best')
    if (saved) bestScore.value = parseInt(saved, 10)
    initBoard()
    window.addEventListener('resize', updateCellSize)
})

onUnmounted(() => {
    if (intervalId) clearInterval(intervalId)
    window.removeEventListener('resize', updateCellSize)
})

</script>

<template>
    <div class="flow-view">
        <div id="community-level-injector" style="display:none" @click="currentCommunityLevelId = LEVELS[0].id || null">
        </div>
        <!-- Leaderboard Modal -->
        <transition name="pop">
            <div v-if="showLeaderboard" class="modal-overlay" @click="showLeaderboard = false">
                <div class="modal-content" @click.stop>
                    <h3>Топ Игроков 🏆</h3>
                    <div class="leaderboard-list">
                        <div class="leaderboard-header" v-if="leaderboardData.length > 0">
                            <span class="rank">Место</span>
                            <span class="name">Игрок</span>
                            <span class="score" style="text-align: right;">Очки</span>
                        </div>
                        <div v-for="(record, index) in leaderboardData" :key="record.id" class="leaderboard-item">
                            <span class="rank">#{{ index + 1 }}</span>
                            <span class="name">{{ record.profiles?.display_name || 'Инкогнито' }}</span>
                            <span class="score">{{ record.score }} pts</span>
                        </div>
                        <div v-if="leaderboardData.length === 0" class="empty-state"
                            style="text-align: center; color: var(--color-text-secondary); margin: 24px 0;">
                            Пока нет рекордов. Будьте первым!
                        </div>
                    </div>
                    <button class="game-btn primary" style="width: 100%; justify-content: center; margin-top: 16px;"
                        @click="showLeaderboard = false">
                        Закрыть
                    </button>
                </div>
            </div>
        </transition>

        <header class="game-header">
            <div style="display: flex; gap: 8px;">
                <button class="icon-btn" @click="router.back()">
                    <ArrowLeft :size="24" />
                </button>
                <button class="icon-btn" style="color: var(--color-primary); border-color: var(--color-primary);"
                    @click="router.push('/games/community-flow')">
                    <Trophy :size="24" />
                </button>
            </div>

            <div class="level-indicator">
                <span v-if="currentCommunityLevelId">Уровень Сообщества</span>
                <span v-else>Ур. {{ currentLevelIndex + (currentCommunityLevelId ? 0 : 1) }} / {{ LEVELS.length
                    }}</span>
            </div>
            <div class="timer-badge">
                {{ formattedTime }}
            </div>

            <div style="display: flex; gap: 8px;">
                <button class="icon-btn" style="color: #eab308; border-color: #eab308;" @click="useHint">
                    <Lightbulb :size="24" />
                </button>
                <button class="icon-btn restart-btn" @click="initBoard()">
                    <RefreshCcw :size="24" />
                </button>
            </div>
        </header>

        <div class="stats-panel" style="position: relative;">
            <div class="stat-badge score-badge">
                Счет: {{ totalScore }}
            </div>
            <div class="stat-badge" :class="{ 'completed': pipesConnected === totalColors }">
                Соединения: {{ pipesConnected }} / {{ totalColors }}
            </div>

            <Transition name="fade-up">
                <div v-if="showHintUsed" class="hint-minus">
                    -200
                </div>
            </Transition>
        </div>

        <div class="board-container">
            <div class="grid-board" ref="gridRef"
                :style="{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gridTemplateRows: `repeat(${gridSize}, 1fr)` }"
                @mousedown="startDrag" @mousemove="moveDrag" @mouseup="endDrag" @mouseleave="endDrag"
                @touchstart.prevent="startDrag" @touchmove.prevent="moveDrag" @touchend.prevent="endDrag"
                @touchcancel="endDrag">
                <!-- Cells underneath -->
                <div v-for="r in gridSize" :key="'row-' + r" class="row-group" style="display: contents;">
                    <div v-for="c in gridSize" :key="`cell-${r - 1}-${c - 1}`" class="grid-cell">
                        <!-- Dot check -->
                        <div v-for="dot in dots" :key="'dot' + dot.r + dot.c" v-show="dot.r === r - 1 && dot.c === c - 1"
                            class="dot"
                            :style="{ backgroundColor: dot.color, filter: `drop-shadow(0 4px 12px ${dot.color}80)` }">
                        </div>

                        <!-- Path head check (to make a nice bulb at the end of pipes if needed) -->
                    </div>
                </div>

                <!-- SVG overlay for paths -->
                <svg class="path-svg">
                    <polyline v-for="(path, color) in paths" :key="color" :points="getSvgPoints(path)" :stroke="color"
                        stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"
                        class="pipe-line" />
                </svg>
            </div>
        </div>

        <!-- Level Passed Modal -->
        <transition name="fade">
            <div v-if="levelPassed" class="game-over-overlay">
                <div class="game-over-card">
                    <h2 class="title text-success">Уровень Пройден!</h2>
                    <p class="result-text">Отличная работа! Все цвета соединены.</p>

                    <div class="actions"
                        style="display: flex; flex-direction: column; gap: 12px; margin-top: 24px; width: 100%;">
                        <button v-if="currentLevelIndex < LEVELS.length - 1 && !isPlayingFromHub"
                            class="game-btn success" style="width: 100%; justify-content: center;" @click="nextLevel">
                            Следующий уровень
                        </button>
                        <button v-else-if="!isPlayingFromHub" class="game-btn primary"
                            style="width: 100%; justify-content: center;" @click="$router.push('/games')">
                            Вы прошли всё! Вернуться
                        </button>
                        <button v-else class="game-btn primary" style="width: 100%; justify-content: center;"
                            @click="$router.back()">
                            Вернуться в Хаб
                        </button>

                        <button v-if="currentLevelIndex >= 5 && !currentCommunityLevelId && !hasPublished"
                            class="game-btn primary" style="width: 100%; justify-content: center;" @click="shareLevel"
                            :disabled="isPublishing">
                            <Share2 :size="20" style="margin-right: 8px;" />
                            {{ isPublishing ? 'Публикация...' : 'Опубликовать' }}
                        </button>

                        <button v-if="currentLevelIndex >= 5 && !currentCommunityLevelId && hasPublished"
                            class="game-btn"
                            style="width: 100%; justify-content: center; background: var(--color-surface); color: var(--color-text-secondary); border: 1px solid var(--color-border);"
                            disabled>
                            <ThumbsUp :size="20" style="margin-right: 8px;" />
                            Уровень опубликован
                        </button>

                        <button v-if="currentCommunityLevelId" class="game-btn"
                            style="width: 100%; justify-content: center; background: var(--color-surface); border: 2px solid var(--color-primary); color: var(--color-primary);"
                            @click="likeCurrentLevel" :disabled="hasLikedLocally">
                            <ThumbsUp :size="20" style="margin-right: 8px;" />
                            {{ hasLikedLocally ? 'Вам понравилось!' : 'Крутой уровень!' }}
                        </button>

                        <button v-if="currentCommunityLevelId || hasPublished" class="game-btn"
                            style="width: 100%; justify-content: center; background: var(--color-surface); border: 2px solid var(--color-primary); color: var(--color-primary);"
                            @click="fetchLeaderboard">
                            <Trophy :size="20" style="margin-right: 8px;" />
                            Рекорды
                        </button>
                    </div>
                </div>
            </div>
        </transition>

    </div>
</template>

<style scoped lang="scss">
.flow-view {
    display: flex;
    flex-direction: column;
    height: calc(100dvh - 150px);
    max-height: calc(100dvh - 150px);
    position: relative;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-background);
    touch-action: none;
    overflow: hidden;
}

.game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xl);
    z-index: 10;
}

.level-indicator {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--color-text-primary);
}

.timer-badge {
    background: var(--color-background);
    padding: 6px 14px;
    border-radius: 99px;
    font-family: monospace;
    font-weight: 900;
    font-size: 1.2rem;
    color: var(--color-primary);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--color-border);
}

.icon-btn {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    padding: 8px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
    transition: all 0.2s;

    &:hover {
        background: var(--color-surface-hover);
    }
}

.stats-panel {
    display: flex;
    justify-content: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    z-index: 10;
}

.stat-badge {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: 8px 16px;
    border-radius: 99px;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text-secondary);
    transition: all 0.3s ease;

    &.score-badge {
        color: #f59e0b;
        border-color: #f59e0b;
        background: color-mix(in srgb, #f59e0b 10%, transparent);
    }

    &.completed {
        background: color-mix(in srgb, var(--color-success) 15%, transparent);
        border-color: var(--color-success);
        color: var(--color-success);
    }
}

.board-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
}

.grid-board {
    display: grid;
    width: 100%;
    aspect-ratio: 1 / 1;
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    position: relative;
    box-shadow: inset 0 0 0 2px var(--color-border), 0 20px 40px rgba(0, 0, 0, 0.1);
    user-select: none;
    overflow: hidden; // Keep lines inside
}

.grid-cell {
    border: 1px dashed color-mix(in srgb, var(--color-border) 50%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.dot {
    width: 60%;
    height: 60%;
    border-radius: 50%;
    position: absolute;
    z-index: 2; // Above pipes
    box-shadow: inset 0 -4px 8px rgba(0, 0, 0, 0.2);
    border: 3px solid rgba(255, 255, 255, 0.1);
}

.path-svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none; // let grid cells capture pointer
    z-index: 1;
}

.pipe-line {
    opacity: 0.9;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.game-over-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(var(--color-background-rgb), 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 20;
    gap: var(--spacing-lg);

    h2 {
        font-size: 2rem;
        color: var(--color-success);
        margin: 0;
        text-shadow: 0 4px 12px rgba(var(--color-success-rgb), 0.3);
    }
}

.hint-minus {
    position: absolute;
    top: -30px;
    right: 20px;
    color: var(--color-danger);
    font-weight: 900;
    font-size: 1.5rem;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    pointer-events: none;
}

.fade-up-enter-active,
.fade-up-leave-active {
    transition: all 0.5s ease;
}

.fade-up-enter-from {
    opacity: 0;
    transform: translateY(10px);
}

.fade-up-leave-to {
    opacity: 0;
    transform: translateY(-20px);
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-lg);
}

.modal-content {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
    width: 100%;
    max-width: 400px;
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    align-items: center;

    h3 {
        margin-top: 0;
        margin-bottom: var(--spacing-lg);
        color: var(--color-text-primary);
    }
}

.leaderboard-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    max-height: 40vh;
    overflow-y: auto;
}

.leaderboard-header {
    display: flex;
    align-items: center;
    padding: 0 var(--spacing-md);
    margin-bottom: -16px;

    span {
        font-size: 0.8rem;
        color: var(--color-text-secondary);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .rank {
        min-width: 50px;
    }

    .name {
        flex: 1;
    }

    .score {
        font-weight: 500;
        color: var(--color-text-secondary);
    }
}

.leaderboard-item {
    display: flex;
    align-items: center;
    background: var(--color-background);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);

    .rank {
        font-weight: bold;
        color: var(--color-primary);
        min-width: 30px;
    }

    .name {
        flex: 1;
        font-weight: 600;
        color: var(--color-text-primary);
    }

    .score {
        font-weight: bold;
        color: #f59e0b;
    }
}

.empty-state {
    text-align: center;
    color: var(--color-text-secondary);
    padding: var(--spacing-lg) 0;
}

.pop-enter-active,
.pop-leave-active {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pop-enter-from,
.pop-leave-to {
    opacity: 0;
    transform: scale(0.9);
}

.game-over-card {
    background: var(--color-surface);
    padding: var(--spacing-xl);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-xl);
    text-align: center;
    max-width: 400px;
    width: 100%;

    .title {
        font-size: 2rem;
        font-weight: 900;
        margin-bottom: var(--spacing-md);
    }

    .result-text {
        font-size: 1.1rem;
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-xl);
    }
}

.game-btn {
    width: 100%;
    padding: 16px;
    border-radius: var(--radius-md);
    font-weight: 700;
    font-size: 1.1rem;
    border: none;
    cursor: pointer;
    transition: all 0.2s;

    &.primary {
        background: var(--color-primary);
        color: var(--color-on-primary);
    }

    &.success {
        background: var(--color-success);
        color: white;
    }

    &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }

    &:active {
        transform: translateY(0);
    }
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
