<template>
  <div class="news-list">
    <div class="search-form">
      <el-form inline>
        <el-form-item label="类型">
          <el-select v-model="searchForm.type" clearable placeholder="全部">
            <el-option label="通知公告" value="notice" />
            <el-option label="新片预告" value="preview" />
            <el-option label="优惠活动" value="promotion" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部">
            <el-option label="已发布" :value="1" />
            <el-option label="已下架" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchNews">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
      <el-button type="primary" @click="handleAdd">发布公告</el-button>
    </div>

    <el-card>
      <el-table :data="newsList" style="width: 100%">
        <el-table-column prop="cover_image" label="封面" width="100">
          <template #default="{ row }">
            <el-image :src="row.cover_image" style="width: 60px; height: 40px" fit="cover" v-if="row.cover_image">
              <template #error>
                <div class="image-placeholder">暂无</div>
              </template>
            </el-image>
            <span v-else>暂无</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'notice' ? '' : row.type === 'preview' ? 'success' : 'warning'">
              {{ typeMap[row.type] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publish_date" label="发布日期" width="180" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '已发布' : '已下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" :type="row.status === 1 ? 'warning' : 'success'" @click="handleToggleStatus(row)">
              {{ row.status === 1 ? '下架' : '发布' }}
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :total="pagination.total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @size-change="fetchNews" @current-change="fetchNews" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑公告' : '发布公告'" width="700px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="通知公告" value="notice" />
            <el-option label="新片预告" value="preview" />
            <el-option label="优惠活动" value="promotion" />
          </el-select>
        </el-form-item>
        <el-form-item label="封面">
          <el-upload class="cover-uploader" :action="uploadUrl" :headers="uploadHeaders" :show-file-list="false" :on-success="handleUploadSuccess" accept="image/*">
            <el-image v-if="form.cover_image" :src="form.cover_image" style="width: 200px; height: 120px" fit="cover" />
            <el-icon v-else class="cover-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="10" />
        </el-form-item>
        <el-form-item label="发布日期">
          <el-date-picker v-model="form.publish_date" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
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

const newsList = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const currentId = ref(null)

const searchForm = reactive({
  type: '',
  status: null
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = reactive({
  title: '',
  type: 'notice',
  cover_image: '',
  content: '',
  publish_date: ''
})

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }]
}

const uploadUrl = computed(() => '/api/news')
const uploadHeaders = computed(() => ({ Authorization: `Bearer ${localStorage.getItem('token')}` }))

const typeMap = {
  notice: '通知公告',
  preview: '新片预告',
  promotion: '优惠活动'
}

const fetchNews = async () => {
  const res = await api.get('/news', { params: { ...searchForm, ...pagination } })
  newsList.value = res.list
  pagination.total = res.total
}

const resetSearch = () => {
  searchForm.type = ''
  searchForm.status = null
  pagination.page = 1
  fetchNews()
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, { title: '', type: 'notice', cover_image: '', content: '', publish_date: '' })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  currentId.value = row.id
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleUploadSuccess = (response) => {
  if (response.cover_image) {
    form.cover_image = response.cover_image
  }
}

const handleSubmit = async () => {
  await formRef.value.validate()
  
  if (isEdit.value) {
    await api.put(`/news/${currentId.value}`, form)
    ElMessage.success('更新成功')
  } else {
    await api.post('/news', form)
    ElMessage.success('发布成功')
  }
  
  dialogVisible.value = false
  fetchNews()
}

const handleToggleStatus = (row) => {
  const status = row.status === 1 ? 0 : 1
  const text = status === 1 ? '发布' : '下架'
  
  ElMessageBox.confirm(`确定要${text}该公告吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await api.put(`/news/${row.id}/status`, { status })
    ElMessage.success(`${text}成功`)
    fetchNews()
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该公告吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await api.delete(`/news/${row.id}`)
    ElMessage.success('删除成功')
    fetchNews()
  })
}

onMounted(() => {
  fetchNews()
})
</script>

<style scoped>
.cover-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 200px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-uploader:hover {
  border-color: #409eff;
}

.cover-uploader-icon {
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
