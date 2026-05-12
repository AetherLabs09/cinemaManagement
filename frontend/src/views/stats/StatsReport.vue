<template>
  <div class="stats-report">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>营业数据统计</span>
          <div>
            <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" @change="fetchData" />
            <el-radio-group v-model="chartType" size="small" style="margin-left: 10px" @change="fetchData">
              <el-radio-button label="day">日</el-radio-button>
              <el-radio-button label="week">周</el-radio-button>
              <el-radio-button label="month">月</el-radio-button>
            </el-radio-group>
            <el-button type="success" style="margin-left: 10px" @click="handleExport">导出报表</el-button>
          </div>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :span="12">
          <div ref="boxOfficeChartRef" style="height: 400px"></div>
        </el-col>
        <el-col :span="12">
          <div ref="ticketsChartRef" style="height: 400px"></div>
        </el-col>
      </el-row>
    </el-card>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>热门电影排行</span>
          </template>
          <el-table :data="popularMovies" style="width: 100%">
            <el-table-column type="index" label="排名" width="60" />
            <el-table-column prop="title" label="电影名称" />
            <el-table-column prop="ticket_count" label="售票数" width="100" />
            <el-table-column prop="box_office" label="票房" width="120">
              <template #default="{ row }">
                ¥{{ row.box_office?.toFixed(2) || 0 }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>影厅使用率</span>
          </template>
          <el-table :data="hallUsage" style="width: 100%">
            <el-table-column prop="name" label="影厅名称" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                {{ hallTypeMap[row.type] }}
              </template>
            </el-table-column>
            <el-table-column prop="schedule_count" label="场次数" width="80" />
            <el-table-column prop="ticket_count" label="售票数" width="80" />
            <el-table-column prop="usage_rate" label="使用率" width="100">
              <template #default="{ row }">
                {{ row.usage_rate }}%
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'

const boxOfficeChartRef = ref()
const ticketsChartRef = ref()
const chartType = ref('day')
const dateRange = ref([])
const popularMovies = ref([])
const hallUsage = ref([])

let boxOfficeChart = null
let ticketsChart = null

const hallTypeMap = {
  normal: '普通厅',
  imax: '巨幕厅',
  vip: 'VIP厅'
}

const fetchData = async () => {
  if (!dateRange.value || dateRange.value.length !== 2) {
    const endDate = dayjs().format('YYYY-MM-DD')
    const startDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD')
    dateRange.value = [startDate, endDate]
  }
  
  const [startDate, endDate] = dateRange.value
  
  const boxOfficeRes = await api.get('/stats/box-office', {
    params: { start_date: startDate, end_date: endDate, type: chartType.value }
  })
  
  const xData = boxOfficeRes.map(item => item.date || item.week || item.month)
  const boxOfficeData = boxOfficeRes.map(item => item.box_office)
  const ticketsData = boxOfficeRes.map(item => item.tickets_sold)
  
  boxOfficeChart.setOption({
    title: { text: '票房收入趋势', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: xData },
    yAxis: { type: 'value', name: '金额(元)' },
    series: [{ data: boxOfficeData, type: 'line', smooth: true, areaStyle: { opacity: 0.3 } }]
  })
  
  ticketsChart.setOption({
    title: { text: '观影人次趋势', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: xData },
    yAxis: { type: 'value', name: '人次' },
    series: [{ data: ticketsData, type: 'bar' }]
  })
  
  const popularRes = await api.get('/stats/popular-movies', {
    params: { start_date: startDate, end_date: endDate, limit: 10 }
  })
  popularMovies.value = popularRes
  
  const hallRes = await api.get('/stats/hall-usage', {
    params: { start_date: startDate, end_date: endDate }
  })
  hallUsage.value = hallRes
}

const handleExport = async () => {
  if (!dateRange.value || dateRange.value.length !== 2) {
    ElMessage.error('请选择日期范围')
    return
  }
  
  const [startDate, endDate] = dateRange.value
  window.open(`/api/stats/export?start_date=${startDate}&end_date=${endDate}&type=${chartType.value}&token=${localStorage.getItem('token')}`)
}

onMounted(() => {
  boxOfficeChart = echarts.init(boxOfficeChartRef.value)
  ticketsChart = echarts.init(ticketsChartRef.value)
  fetchData()
})
</script>
