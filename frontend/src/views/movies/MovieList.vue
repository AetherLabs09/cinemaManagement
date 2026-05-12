<template>
  <div class="movie-list">
    <div class="search-form">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="电影名称/演员/导演" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部">
            <el-option label="上架" :value="1" />
            <el-option label="下架" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchMovies">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
      <el-button type="primary" @click="handleAdd">新增电影</el-button>
    </div>

    <el-card>
      <el-table :data="movies" style="width: 100%">
        <el-table-column prop="poster" label="海报" width="100">
          <template #default="{ row }">
            <el-image :src="row.poster" style="width: 60px; height: 80px" fit="cover" v-if="row.poster">
              <template #error>
                <div class="image-placeholder">暂无图片</div>
              </template>
            </el-image>
            <span v-else>暂无</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="电影名称" />
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column prop="duration" label="时长(分钟)" width="100" />
        <el-table-column prop="rating" label="评分" width="80">
          <template #default="{ row }">
            <el-rate v-model="row.rating" disabled show-score text-color="#ff9900" score-template="{value}" />
          </template>
        </el-table-column>
        <el-table-column prop="release_date" label="上映日期" width="120" />
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
      <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :total="pagination.total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @size-change="fetchMovies" @current-change="fetchMovies" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑电影' : '新增电影'" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="电影名称" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="海报">
          <el-upload class="poster-uploader" :action="uploadUrl" :headers="uploadHeaders" :show-file-list="false" :on-success="handleUploadSuccess" accept="image/*">
            <el-image v-if="form.poster" :src="form.poster" style="width: 150px; height: 200px" fit="cover" />
            <el-icon v-else class="poster-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-input v-model="form.type" placeholder="如：动作/科幻/喜剧" />
        </el-form-item>
        <el-form-item label="时长" prop="duration">
          <el-input-number v-model="form.duration" :min="1" /> 分钟
        </el-form-item>
        <el-form-item label="导演">
          <el-input v-model="form.director" />
        </el-form-item>
        <el-form-item label="演员">
          <el-input v-model="form.actors" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="上映日期">
          <el-date-picker v-model="form.release_date" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="评分">
          <el-rate v-model="form.rating" show-score allow-half />
        </el-form-item>
        <el-form-item label="剧情简介">
          <el-input v-model="form.synopsis" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="预告片链接">
          <el-input v-model="form.trailer_url" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import api from '@/utils/api'

const movies = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const currentId = ref(null)

const searchForm = reactive({
  keyword: '',
  status: null
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = reactive({
  title: '',
  poster: '',
  type: '',
  duration: 120,
  synopsis: '',
  actors: '',
  director: '',
  release_date: '',
  rating: 0,
  trailer_url: ''
})

const rules = {
  title: [{ required: true, message: '请输入电影名称', trigger: 'blur' }]
}

const uploadUrl = computed(() => '/api/movies')
const uploadHeaders = computed(() => ({ Authorization: `Bearer ${localStorage.getItem('token')}` }))

const fetchMovies = async () => {
  const res = await api.get('/movies', { params: { ...searchForm, ...pagination } })
  movies.value = res.list
  pagination.total = res.total
}

const resetSearch = () => {
  searchForm.keyword = ''
  searchForm.status = null
  pagination.page = 1
  fetchMovies()
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, { title: '', poster: '', type: '', duration: 120, synopsis: '', actors: '', director: '', release_date: '', rating: 0, trailer_url: '' })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  currentId.value = row.id
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleUploadSuccess = (response) => {
  if (response.poster) {
    form.poster = response.poster
  }
}

const handleSubmit = async () => {
  await formRef.value.validate()
  
  const formData = new FormData()
  Object.keys(form).forEach(key => {
    if (form[key] !== null && form[key] !== undefined) {
      formData.append(key, form[key])
    }
  })
  
  if (isEdit.value) {
    await api.put(`/movies/${currentId.value}`, form)
    ElMessage.success('更新成功')
  } else {
    await api.post('/movies', form)
    ElMessage.success('创建成功')
  }
  
  dialogVisible.value = false
  fetchMovies()
}

const handleToggleStatus = (row) => {
  const status = row.status === 1 ? 0 : 1
  const text = status === 1 ? '上架' : '下架'
  
  ElMessageBox.confirm(`确定要${text}该电影吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await api.put(`/movies/${row.id}/status`, { status })
    ElMessage.success(`${text}成功`)
    fetchMovies()
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该电影吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await api.delete(`/movies/${row.id}`)
    ElMessage.success('删除成功')
    fetchMovies()
  })
}

onMounted(() => {
  fetchMovies()
})
</script>

<style scoped>
.poster-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 150px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.poster-uploader:hover {
  border-color: #409eff;
}

.poster-uploader-icon {
  font-size: 28px;
  color: #8c939d;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 12px;
}
</style>
