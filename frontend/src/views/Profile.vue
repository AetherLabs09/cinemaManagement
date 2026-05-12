<template>
  <div class="profile">
    <el-card>
      <template #header>
        <span>个人信息</span>
      </template>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" style="max-width: 500px">
        <el-form-item label="用户名">
          <el-input :model-value="userStore.user?.username" disabled />
        </el-form-item>
        <el-form-item label="角色">
          <el-tag>{{ roleMap[userStore.user?.role] || '' }}</el-tag>
        </el-form-item>
        <el-form-item label="姓名" prop="real_name">
          <el-input v-model="form.real_name" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import api from '@/utils/api'

const userStore = useUserStore()
const formRef = ref()

const form = reactive({
  real_name: '',
  phone: '',
  email: ''
})

const rules = {
  real_name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }]
}

const roleMap = {
  super_admin: '超级管理员',
  admin: '系统管理员',
  staff: '影院员工'
}

const handleSubmit = async () => {
  await formRef.value.validate()
  await api.put('/auth/profile', form)
  ElMessage.success('保存成功')
  userStore.fetchUser()
}

onMounted(() => {
  if (userStore.user) {
    form.real_name = userStore.user.real_name || ''
    form.phone = userStore.user.phone || ''
    form.email = userStore.user.email || ''
  }
})
</script>
