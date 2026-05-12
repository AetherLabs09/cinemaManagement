<template>
  <div class="seat-manage">
    <div class="search-form">
      <el-form inline>
        <el-form-item label="选择场次">
          <el-select v-model="selectedSchedule" filterable placeholder="请选择场次" @change="fetchSeats" style="width: 400px">
            <el-option v-for="schedule in schedules" :key="schedule.id" :label="`${schedule.movie_title} - ${schedule.hall_name} - ${schedule.start_time}`" :value="schedule.id" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <el-card v-if="selectedSchedule">
      <template #header>
        <div class="card-header">
          <span>座位状态</span>
          <div>
            <el-button type="warning" @click="handleLock" :disabled="selectedSeats.length === 0">锁定座位</el-button>
            <el-button type="success" @click="handleUnlock" :disabled="selectedSeats.length === 0">解锁座位</el-button>
          </div>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :span="18">
          <div class="screen">银幕</div>
          <div class="seat-map">
            <div class="seat-row" v-for="(row, rowIndex) in seatMap" :key="rowIndex">
              <div class="seat" v-for="seat in row" :key="seat.seat_label" :class="seat.status" @click="toggleSeat(seat)">
                {{ seat.seat_label }}
              </div>
            </div>
          </div>
          <div class="seat-legend">
            <span class="legend-item"><span class="legend-color available"></span> 可选</span>
            <span class="legend-item"><span class="legend-color sold"></span> 已售</span>
            <span class="legend-item"><span class="legend-color locked"></span> 锁定</span>
            <span class="legend-item"><span class="legend-color selected"></span> 已选</span>
          </div>
        </el-col>
        <el-col :span="6">
          <el-card>
            <template #header>
              <span>场次信息</span>
            </template>
            <el-descriptions :column="1" size="small">
              <el-descriptions-item label="电影">{{ scheduleInfo?.movie_title }}</el-descriptions-item>
              <el-descriptions-item label="影厅">{{ scheduleInfo?.hall_name }}</el-descriptions-item>
              <el-descriptions-item label="放映时间">{{ scheduleInfo?.start_time }}</el-descriptions-item>
              <el-descriptions-item label="票价">¥{{ scheduleInfo?.price }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
          <el-card style="margin-top: 20px">
            <template #header>
              <span>座位统计</span>
            </template>
            <el-descriptions :column="1" size="small">
              <el-descriptions-item label="总座位数">{{ seatStats.total_seats }}</el-descriptions-item>
              <el-descriptions-item label="可选座位">{{ seatStats.available_seats }}</el-descriptions-item>
              <el-descriptions-item label="已售座位">{{ seatStats.sold_seats }}</el-descriptions-item>
              <el-descriptions-item label="锁定座位">{{ seatStats.locked_seats }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/utils/api'

const schedules = ref([])
const selectedSchedule = ref(null)
const seatMap = ref([])
const scheduleInfo = ref(null)
const seatStats = ref({
  total_seats: 0,
  available_seats: 0,
  sold_seats: 0,
  locked_seats: 0
})

const selectedSeats = computed(() => {
  const seats = []
  seatMap.value.forEach(row => {
    row.forEach(seat => {
      if (seat.selected) {
        seats.push(seat.seat_label)
      }
    })
  })
  return seats
})

const fetchSchedules = async () => {
  const res = await api.get('/schedules', { params: { pageSize: 100 } })
  schedules.value = res.list
}

const fetchSeats = async () => {
  if (!selectedSchedule.value) return
  
  const res = await api.get(`/seats/schedule/${selectedSchedule.value}`)
  scheduleInfo.value = res.schedule
  seatMap.value = res.seatMap.map(row => row.map(seat => ({ ...seat, selected: false })))
  
  const statsRes = await api.get(`/seats/stats/${selectedSchedule.value}`)
  seatStats.value = statsRes
}

const toggleSeat = (seat) => {
  if (seat.status === 'sold') return
  seat.selected = !seat.selected
}

const handleLock = async () => {
  await api.put('/seats/lock', {
    schedule_id: selectedSchedule.value,
    seats: selectedSeats.value
  })
  ElMessage.success('锁定成功')
  fetchSeats()
}

const handleUnlock = async () => {
  await api.put('/seats/unlock', {
    schedule_id: selectedSchedule.value,
    seats: selectedSeats.value
  })
  ElMessage.success('解锁成功')
  fetchSeats()
}

onMounted(() => {
  fetchSchedules()
})
</script>

<style scoped>
.screen {
  text-align: center;
  padding: 10px;
  background: #dcdfe6;
  margin-bottom: 20px;
  border-radius: 4px;
}

.seat-map {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.seat-row {
  display: flex;
  gap: 5px;
}

.seat {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.seat.available {
  background-color: #67c23a;
  color: #fff;
}

.seat.sold {
  background-color: #909399;
  color: #fff;
  cursor: not-allowed;
}

.seat.locked {
  background-color: #e6a23c;
  color: #fff;
}

.seat.selected {
  background-color: #409eff;
  color: #fff;
  transform: scale(1.1);
}

.seat-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.legend-color.available {
  background-color: #67c23a;
}

.legend-color.sold {
  background-color: #909399;
}

.legend-color.locked {
  background-color: #e6a23c;
}

.legend-color.selected {
  background-color: #409eff;
}
</style>
