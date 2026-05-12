<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">{{ stats.today?.box_office || 0 }}</div>
          <div class="stat-label">今日票房（元）</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">{{ stats.today?.tickets_sold || 0 }}</div>
          <div class="stat-label">今日观影人次</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">{{ stats.month?.box_office || 0 }}</div>
          <div class="stat-label">本月票房（元）</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">{{ stats.totalMembers || 0 }}</div>
          <div class="stat-label">会员总数</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>票房趋势</span>
              <el-radio-group v-model="chartType" size="small">
                <el-radio-button label="day">日</el-radio-button>
                <el-radio-button label="week">周</el-radio-button>
                <el-radio-button label="month">月</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="chartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>热门电影TOP5</span>
          </template>
          <el-table :data="popularMovies" style="width: 100%">
            <el-table-column prop="title" label="电影名称" />
            <el-table-column prop="ticket_count" label="售票数" width="80" />
            <el-table-column prop="box_office" label="票房" width="100">
              <template #default="{ row }">
                {{ row.box_office?.toFixed(2) || 0 }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>影厅使用率</span>
          </template>
          <div ref="hallChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>快捷操作</span>
          </template>
          <div class="quick-actions">
            <el-button type="primary" @click="$router.push('/movies')">电影管理</el-button>
            <el-button type="success" @click="$router.push('/schedules')">排片管理</el-button>
            <el-button type="warning" @click="$router.push('/orders')">订单管理</el-button>
            <el-button type="info" @click="$router.push('/stats')">数据统计</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import api from '@/utils/api'
import dayjs from 'dayjs'

const chartRef = ref()
const hallChartRef = ref()
const chartType = ref('day')
const stats = ref({})
const popularMovies = ref([])

let chart = null
let hallChart = null

const fetchStats = async () => {
  const res = await api.get('/stats/overview')
  stats.value = res
}

const fetchChartData = async () => {
  const endDate = dayjs().format('YYYY-MM-DD')
  const startDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD')
  
  const res = await api.get('/stats/box-office', {
    params: { start_date: startDate, end_date: endDate, type: chartType.value }
  })
  
  const xData = res.map(item => item.date || item.week || item.month)
  const yData = res.map(item => item.box_office)
  
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: xData },
    yAxis: { type: 'value' },
    series: [{ data: yData, type: 'line', smooth: true, areaStyle: { opacity: 0.3 } }]
  })
}

const fetchPopularMovies = async () => {
  const endDate = dayjs().format('YYYY-MM-DD')
  const startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD')
  
  const res = await api.get('/stats/popular-movies', {
    params: { start_date: startDate, end_date: endDate, limit: 5 }
  })
  popularMovies.value = res
}

const fetchHallUsage = async () => {
  const endDate = dayjs().format('YYYY-MM-DD')
  const startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD')
  
  const res = await api.get('/stats/hall-usage', {
    params: { start_date: startDate, end_date: endDate }
  })
  
  const xData = res.map(item => item.name)
  const yData = res.map(item => parseFloat(item.usage_rate))
  
  hallChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: xData },
    yAxis: { type: 'value', max: 100 },
    series: [{ data: yData, type: 'bar' }]
  })
}

watch(chartType, () => {
  fetchChartData()
})

onMounted(() => {
  chart = echarts.init(chartRef.value)
  hallChart = echarts.init(hallChartRef.value)
  
  fetchStats()
  fetchChartData()
  fetchPopularMovies()
  fetchHallUsage()
})
</script>

<style scoped>
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
