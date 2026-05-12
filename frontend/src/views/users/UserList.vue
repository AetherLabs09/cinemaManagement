<template>
  <div class="user-list">
    <div class="search-form">
      <el-button type="primary" @click="handleAdd">新增账号</el-button>
    </div>

    <el-card>
      <el-table :data="users" style="width: 100%">
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="real_name" label="姓名" />
        <el-table-column prop="role" label="角色">
          <template #default="{ row }">
            <el-tag :type="row.role === 'super_admin' ? 'danger' : row.role === 'admin' ? 'warning' : ''">
              {{ roleMap[row.role] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="250">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="warning" @click="handleResetPassword(row)">重置密码</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)" v-if="row.role !== 'super_admin'">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑账号' : '新增账号'" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="姓名" prop="real_name">
          <el-input v-model="form.real_name" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="超级管理员" value="super_admin" v-if="userStore.user?.role === 'super_admin'" />
            <el-option label="系统管理员" value="admin" />
            <el-option label="影院员工" value="staff" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="状态" prop="status" v-if="isEdit">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resetPasswordVisible" title="重置密码" width="400px">
      <el-form :model="resetForm" :rules="resetRules" ref="resetFormRef" label-width="80px">
        <el-form-item label="新密码" prop="new_password">
          <el-input v-model="resetForm.new_password" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPasswordVisible = false">取消</el-button>
        <el-button type="primary" @click="handleResetSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import api from '@/utils/api'

const userStore = useUserStore()
const users = ref([])
const dialogVisible = ref(false)
const resetPasswordVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const resetFormRef = ref()
const currentId = ref(null)

const form = reactive({
  username: '',
  password: '',
  real_name: '',
  role: 'staff',
  phone: '',
  email: '',
  status: 1
})

const resetForm = reactive({
  new_password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }],
  real_name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const resetRules = {
  new_password: [{ required: true, message: '请输入新密码', trigger: 'blur' }, { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }]
}

const roleMap = {
  super_admin: '超级管理员',
  admin: '系统管理员',
  staff: '影院员工'
}

const fetchUsers = async () => {
  const res = await api.get('/auth/users')
  users.value = res
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, { username: '', password: '', real_name: '', role: 'staff', phone: '', email: '', status: 1 })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  currentId.value = row.id
  Object.assign(form, { username: row.username, real_name: row.real_name, role: row.role, phone: row.phone, email: row.email, status: row.status })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value.validate()
  
  if (isEdit.value) {
    await api.put(`/auth/users/${currentId.value}`, form)
    ElMessage.success('更新成功')
  } else {
    await api.post('/auth/users', form)
    ElMessage.success('创建成功')
  }
  
  dialogVisible.value = false
  fetchUsers()
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该账号吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await api.delete(`/auth/users/${row.id}`)
    ElMessage.success('删除成功')
    fetchUsers()
  })
}

const handleResetPassword = (row) => {
  currentId.value = row.id
  resetForm.new_password = ''
  resetPasswordVisible.value = true
}

const handleResetSubmit = async () => {
  await resetFormRef.value.validate()
  await api.put(`/auth/users/${currentId.value}/reset-password`, resetForm)
  ElMessage.success('密码重置成功')
  resetPasswordVisible.value = false
}

onMounted(() => {
  fetchUsers()
})
</script>
