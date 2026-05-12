<template>
  <div class="schedule-list">
    <div class="search-form">
      <el-form inline>
        <el-form-item label="电影">
          <el-select v-model="searchForm.movie_id" clearable filterable placeholder="全部">
            <el-option v-for="movie in movies" :key="movie.id" :label="movie.title" :value="movie.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="影厅">
          <el-select v-model="searchForm.hall_id" clearable placeholder="全部">
            <el-option v-for="hall in halls" :key="hall.id" :label="hall.name" :value="hall.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="searchForm.date" type="date" value-format="YYYY-MM-DD" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchSchedules">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
      <div>
        <el-button type="primary" @click="handleAdd">新增场次</el-button>
        <el-button type="success" @click="handleBatchAdd">批量排片</el-button>
      </div>
    </div>

    <el-card>
      <el-table :data="schedules" style="width: 100%">
        <el-table-column prop="movie_title" label="电影名称" />
        <el-table-column prop="hall_name" label="影厅">
          <template #default="{ row }">
            {{ row.hall_name }} ({{ hallTypeMap[row.hall_type] }})
          </template>
        </el-table-column>
        <el-table-column prop="start_time" label="开始时间" width="180" />
        <el-table-column prop="end_time" label="结束时间" width="180" />
        <el-table-column prop="price" label="票价" width="100">
          <template #default="{ row }">
            ¥{{ row.price }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '上架' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" :type="row.status === 1 ? 'warning' : 'success'" @click="handleToggleStatus(row)">
              {{ row.status === 1 ? '下架' : '上架' }}
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :total="pagination.total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @size-change="fetchSchedules" @current-change="fetchSchedules" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑场次' : '新增场次'" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="电影" prop="movie_id">
          <el-select v-model="form.movie_id" filterable style="width: 100%">
            <el-option v-for="movie in movies" :key="movie.id" :label="movie.title" :value="movie.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="影厅" prop="hall_id">
          <el-select v-model="form.hall_id" style="width: 100%">
            <el-option v-for="hall in halls" :key="hall.id" :label="`${hall.name} (${hallTypeMap[hall.type]})`" :value="hall.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始时间" prop="start_time">
          <el-date-picker v-model="form.start_time" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束时间" prop="end_time">
          <el-date-picker v-model="form.end_time" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="票价" prop="price">
          <el-input-number v-model="form.price" :min="0" :precision="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchDialogVisible" title="批量排片" width="700px">
      <el-form :model="batchForm" label-width="100px">
        <el-form-item label="电影">
          <el-select v-model="batchForm.movie_id" filterable style="width: 100%">
            <el-option v-for="movie in movies" :key="movie.id" :label="movie.title" :value="movie.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="影厅">
          <el-select v-model="batchForm.hall_id" style="width: 100%">
            <el-option v-for="hall in halls" :key="hall.id" :label="`${hall.name} (${hallTypeMap[hall.type]})`" :value="hall.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker v-model="batchForm.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
        </el-form-item>
        <el-form-item label="时间段">
          <el-time-picker v-model="batchForm.startTime" format="HH:mm" placeholder="开始时间" /> -
          <el-time-picker v-model="batchForm.endTime" format="HH:mm" placeholder="结束时间" />
        </el-form-item>
        <el-form-item label="票价">
          <el-input-number v-model="batchForm.price" :min="0" :precision="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBatchSubmit">生成排片</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/utils/api'

const schedules = ref([])
const movies = ref([])
const halls = ref([])
const dialogVisible = ref(false)
const batchDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const currentId = ref(null)

const searchForm = reactive({
  movie_id: null,
  hall_id: null,
  date: null
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = reactive({
  movie_id: null,
  hall_id: null,
  start_time: '',
  end_time: '',
  price: 50
})

const batchForm = reactive({
  movie_id: null,
  hall_id: null,
  dateRange: [],
  startTime: '',
  endTime: '',
  price: 50
})

const rules = {
  movie_id: [{ required: true, message: '请选择电影', trigger: 'change' }],
  hall_id: [{ required: true, message: '请选择影厅', trigger: 'change' }],
  start_time: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  end_time: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  price: [{ required: true, message: '请输入票价', trigger: 'blur' }]
}

const hallTypeMap = {
  normal: '普通厅',
  imax: '巨幕厅',
  vip: 'VIP厅'
}

const fetchSchedules = async () => {
  const res = await api.get('/schedules', { params: { ...searchForm, ...pagination } })
  schedules.value = res.list
  pagination.total = res.total
}

const fetchMovies = async () => {
  const res = await api.get('/movies', { params: { status: 1, pageSize: 100 } })
  movies.value = res.list
}

const fetchHalls = async () => {
  const res = await api.get('/halls', { params: { status: 1 } })
  halls.value = res
}

const resetSearch = () => {
  searchForm.movie_id = null
  searchForm.hall_id = null
  searchForm.date = null
  pagination.page = 1
  fetchSchedules()
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, { movie_id: null, hall_id: null, start_time: '', end_time: '', price: 50 })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  currentId.value = row.id
  Object.assign(form, {
    movie_id: row.movie_id,
    hall_id: row.hall_id,
    start_time: row.start_time,
    end_time: row.end_time,
    price: row.price
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value.validate()
  
  if (isEdit.value) {
    await api.put(`/schedules/${currentId.value}`, form)
    ElMessage.success('更新成功')
  } else {
    await api.post('/schedules', form)
    ElMessage.success('创建成功')
  }
  
  dialogVisible.value = false
  fetchSchedules()
}

const handleBatchAdd = () => {
  Object.assign(batchForm, { movie_id: null, hall_id: null, dateRange: [], startTime: '', endTime: '', price: 50 })
  batchDialogVisible.value = true
}

const handleBatchSubmit = async () => {
  if (!batchForm.movie_id || !batchForm.hall_id || !batchForm.dateRange || batchForm.dateRange.length !== 2) {
    ElMessage.error('请填写完整的排片信息')
    return
  }
  
  const schedules = []
  const [startDate, endDate] = batchForm.dateRange
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  while (start <= end) {
    const dateStr = start.toISOString().split('T')[0]
    const startTimeStr = `${dateStr} ${batchForm.startTime}:00`
    const endTimeStr = `${dateStr} ${batchForm.endTime}:00`
    
    schedules.push({
      movie_id: batchForm.movie_id,
      hall_id: batchForm.hall_id,
      start_time: startTimeStr,
      end_time: endTimeStr,
      price: batchForm.price
    })
    
    start.setDate(start.getDate() + 1)
  }
  
  const res = await api.post('/schedules/batch', { schedules })
  ElMessage.success(res.message)
  batchDialogVisible.value = false
  fetchSchedules()
}

const handleToggleStatus = (row) => {
  const status = row.status === 1 ? 0 : 1
  const text = status === 1 ? '上架' : '下架'
  
  ElMessageBox.confirm(`确定要${text}该场次吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await api.put(`/schedules/${row.id}/status`, { status })
    ElMessage.success(`${text}成功`)
    fetchSchedules()
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该场次吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await api.delete(`/schedules/${row.id}`)
    ElMessage.success('删除成功')
    fetchSchedules()
  })
}

onMounted(() => {
  fetchSchedules()
  fetchMovies()
  fetchHalls()
})
</script>
