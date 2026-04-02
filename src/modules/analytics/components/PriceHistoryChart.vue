<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js'
import type { PricePoint } from '../services/AnalyticsService'

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
)

interface Props {
    data: PricePoint[]
}

const props = defineProps<Props>()

const sortedData = computed(() =>
    [...props.data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
)

const chartData = computed(() => {
    const docStyle = getComputedStyle(document.documentElement)
    const secondaryColor = docStyle.getPropertyValue('--color-chart-secondary').trim() || '#6200ee'
    
    return {
        labels: sortedData.value.map(d => d.date),
        datasets: [
            {
                label: 'Price (UZS)',
                backgroundColor: secondaryColor,
                borderColor: secondaryColor,
                data: sortedData.value.map(d => d.price),
                tension: 0.3,
                fill: false
            }
        ]
    }
})

const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
    },
    interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
    }
}
</script>

<template>
    <div class="chart-container">
        <Line :data="chartData" :options="chartOptions" />
    </div>
</template>

<style scoped>
.chart-container {
    height: 250px;
    width: 100%;
}
</style>
