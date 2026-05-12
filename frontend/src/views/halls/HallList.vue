<template>
  <div class="hall-list">
    <div class="search-form">
      <el-form inline>
        <el-form-item label="影厅类型">
          <el-select v-model="searchForm.type" clearable placeholder="全部">
            <el-option label="普通厅" value="normal" />
            <el-option label="巨幕厅" value="imax" />
            <el-option label="VIP厅" value="vip" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchHalls">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
      <el-button type="primary" @click="handleAdd">新增影厅</el-button>
    </div>

    <el-card>
      <el-table :data="halls" style="width: 100%">
        <el-table-column prop="name" label="影厅名称" />
        <el-table-column prop="type" label="影厅类型">
          <template #default="{ row }">
            <el-tag :type="row.type === 'vip' ? 'warning' : row.type === 'imax' ? 'danger' : ''">
              {{ typeMap[row.type] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rows" label="行数" width="80" />
        <el-table-column prop="cols" label="列数" width="80" />
        <el-table-column label="座位数" width="100">
          <template #default="{ row }">
            {{ row.rows * row.cols }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="250">
          <template #default="{ row }">
            <el-button size="small" @click="handleViewSeats(row)">座位布局</el-button>
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑影厅' : '新增影厅'" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="影厅名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="影厅类型" prop="type">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="普通厅" value="normal" />
            <el-option label="巨幕厅" value="imax" />
            <el-option label="VIP厅" value="vip" />
          </el-select>
        </el-form-item>
        <el-form-item label="行数" prop="rows">
          <el-input-number v-model="form.rows" :min="1" :max="30" />
        </el-form-item>
        <el-form-item label="列数" prop="cols">
          <el-input-number v-model="form.cols" :min="1" :max="30" />
        </el-form-item>
        <el-form-item label="状态" prop="status" v-if="isEdit">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="seatDialogVisible" title="座位布局" width="600px">
      <div class="screen">银幕</div>
      <div class="seat-map">
        <div class="seat-row" v-for="row in seatLayout.rows" :key="row">
          <div class="seat available" v-for="col in seatLayout.cols" :key="col">
            {{ String.fromCharCode(64 + row) }}{{ col }}
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/utils/api'

const halls = ref([])
const dialogVisible = ref(false)
const seatDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const currentId = ref(null)
const seatLayout = ref({ rows: 0, cols: 0 })

const searchForm = reactive({
  type: '',
  status: null
})

const form = reactive({
  name: '',
  type: 'normal',
  rows: 10,
  cols: 12,
  status: 1
})

const rules = {
  name: [{ required: true, message: '请输入影厅名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择影厅类型', trigger: 'change' }],
  rows: [{ required: true, message: '请输入行数', trigger: 'blur' }],
  cols: [{ required: true, message: '请输入列数', trigger: 'blur' }]
}

const typeMap = {
  normal: '普通厅',
  imax: '巨幕厅',
  vip: 'VIP厅'
}

const fetchHalls = async () => {
  const res = await api.get('/halls', { params: searchForm })
  halls.value = res
}

const resetSearch = () => {
  searchForm.type = ''
  searchForm.status = null
  fetchHalls()
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, { name: '', type: 'normal', rows: 10, cols: 12, status: 1 })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  currentId.value = row.id
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleViewSeats = (row) => {
  seatLayout.value = { rows: row.rows, cols: row.cols }
  seatDialogVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value.validate()
  
  if (isEdit.value) {
    await api.put(`/halls/${currentId.value}`, form)
    ElMessage.success('更新成功')
  } else {
    await api.post('/halls', form)
    ElMessage.success('创建成功')
  }
  
  dialogVisible.value = false
  fetchHalls()
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该影厅吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await api.delete(`/halls/${row.id}`)
    ElMessage.success('删除成功')
    fetchHalls()
  })
}

onMounted(() => {
  fetchHalls()
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
}

.seat.available {
  background-color: #67c23a;
  color: #fff;
}
</style>
