<template>
  <div class="member-list">
    <div class="search-form">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="姓名/手机号" clearable />
        </el-form-item>
        <el-form-item label="会员等级">
          <el-select v-model="searchForm.level" clearable placeholder="全部">
            <el-option label="普通会员" :value="1" />
            <el-option label="银卡会员" :value="2" />
            <el-option label="金卡会员" :value="3" />
            <el-option label="钻石会员" :value="4" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchMembers">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
      <el-button type="primary" @click="handleAdd">新增会员</el-button>
    </div>

    <el-card>
      <el-table :data="members" style="width: 100%">
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="level" label="等级" width="100">
          <template #default="{ row }">
            <el-tag :type="levelMap[row.level].type">{{ levelMap[row.level].text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="points" label="积分" width="100" />
        <el-table-column prop="balance" label="余额" width="100">
          <template #default="{ row }">
            ¥{{ row.balance }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" width="180" />
        <el-table-column label="操作" width="280">
          <template #default="{ row }">
            <el-button size="small" @click="handleDetail(row)">详情</el-button>
            <el-button size="small" type="primary" @click="handleRecharge(row)">充值</el-button>
            <el-button size="small" type="warning" @click="handleAdjustPoints(row)">调整积分</el-button>
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :total="pagination.total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @size-change="fetchMembers" @current-change="fetchMembers" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑会员' : '新增会员'" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="等级" prop="level">
          <el-select v-model="form.level" style="width: 100%">
            <el-option label="普通会员" :value="1" />
            <el-option label="银卡会员" :value="2" />
            <el-option label="金卡会员" :value="3" />
            <el-option label="钻石会员" :value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status" v-if="isEdit">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">正常</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rechargeDialogVisible" title="会员充值" width="400px">
      <el-form :model="rechargeForm" :rules="rechargeRules" ref="rechargeFormRef" label-width="80px">
        <el-form-item label="充值金额" prop="amount">
          <el-input-number v-model="rechargeForm.amount" :min="1" :precision="2" />
        </el-form-item>
        <el-form-item label="支付方式">
          <el-select v-model="rechargeForm.payment_method" style="width: 100%">
            <el-option label="现金" value="cash" />
            <el-option label="微信" value="wechat" />
            <el-option label="支付宝" value="alipay" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleRechargeSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="pointsDialogVisible" title="调整积分" width="400px">
      <el-form :model="pointsForm" :rules="pointsRules" ref="pointsFormRef" label-width="80px">
        <el-form-item label="调整类型" prop="type">
          <el-radio-group v-model="pointsForm.type">
            <el-radio label="add">增加</el-radio>
            <el-radio label="deduct">扣除</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="积分数量" prop="points">
          <el-input-number v-model="pointsForm.points" :min="1" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="pointsForm.description" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pointsDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePointsSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailDialogVisible" title="会员详情" width="700px">
      <el-tabs>
        <el-tab-pane label="基本信息">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="手机号">{{ currentMember?.phone }}</el-descriptions-item>
            <el-descriptions-item label="姓名">{{ currentMember?.name }}</el-descriptions-item>
            <el-descriptions-item label="等级">{{ levelMap[currentMember?.level]?.text }}</el-descriptions-item>
            <el-descriptions-item label="积分">{{ currentMember?.points }}</el-descriptions-item>
            <el-descriptions-item label="余额">¥{{ currentMember?.balance }}</el-descriptions-item>
            <el-descriptions-item label="注册时间">{{ currentMember?.created_at }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="积分记录">
          <el-table :data="currentMember?.pointsLog" style="width: 100%">
            <el-table-column prop="points" label="积分" width="100" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                {{ row.type === 'add' ? '增加' : row.type === 'deduct' ? '扣除' : row.type }}
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" />
            <el-table-column prop="created_at" label="时间" width="180" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="充值记录">
          <el-table :data="currentMember?.rechargeLog" style="width: 100%">
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="{ row }">
                ¥{{ row.amount }}
              </template>
            </el-table-column>
            <el-table-column prop="payment_method" label="支付方式" width="100" />
            <el-table-column prop="created_at" label="时间" width="180" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="观影记录">
          <el-table :data="currentMember?.watchHistory" style="width: 100%">
            <el-table-column prop="title" label="电影" />
            <el-table-column prop="start_time" label="放映时间" width="180" />
            <el-table-column prop="total_price" label="金额" width="100">
              <template #default="{ row }">
                ¥{{ row.total_price }}
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="下单时间" width="180" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/utils/api'

const members = ref([])
const dialogVisible = ref(false)
const rechargeDialogVisible = ref(false)
const pointsDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const rechargeFormRef = ref()
const pointsFormRef = ref()
const currentId = ref(null)
const currentMember = ref(null)

const searchForm = reactive({
  keyword: '',
  level: null
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = reactive({
  phone: '',
  name: '',
  level: 1,
  status: 1
})

const rechargeForm = reactive({
  amount: 100,
  payment_method: 'cash'
})

const pointsForm = reactive({
  type: 'add',
  points: 10,
  description: ''
})

const rules = {
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }, { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }]
}

const rechargeRules = {
  amount: [{ required: true, message: '请输入充值金额', trigger: 'blur' }]
}

const pointsRules = {
  type: [{ required: true, message: '请选择调整类型', trigger: 'change' }],
  points: [{ required: true, message: '请输入积分数量', trigger: 'blur' }]
}

const levelMap = {
  1: { text: '普通会员', type: '' },
  2: { text: '银卡会员', type: 'info' },
  3: { text: '金卡会员', type: 'warning' },
  4: { text: '钻石会员', type: 'danger' }
}

const fetchMembers = async () => {
  const res = await api.get('/members', { params: { ...searchForm, ...pagination } })
  members.value = res.list
  pagination.total = res.total
}

const resetSearch = () => {
  searchForm.keyword = ''
  searchForm.level = null
  pagination.page = 1
  fetchMembers()
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(form, { phone: '', name: '', level: 1, status: 1 })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  currentId.value = row.id
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value.validate()
  
  if (isEdit.value) {
    await api.put(`/members/${currentId.value}`, form)
    ElMessage.success('更新成功')
  } else {
    await api.post('/members', form)
    ElMessage.success('创建成功')
  }
  
  dialogVisible.value = false
  fetchMembers()
}

const handleDetail = async (row) => {
  const res = await api.get(`/members/${row.id}`)
  currentMember.value = res
  detailDialogVisible.value = true
}

const handleRecharge = (row) => {
  currentId.value = row.id
  rechargeForm.amount = 100
  rechargeForm.payment_method = 'cash'
  rechargeDialogVisible.value = true
}

const handleRechargeSubmit = async () => {
  await rechargeFormRef.value.validate()
  await api.post(`/members/${currentId.value}/recharge`, rechargeForm)
  ElMessage.success('充值成功')
  rechargeDialogVisible.value = false
  fetchMembers()
}

const handleAdjustPoints = (row) => {
  currentId.value = row.id
  pointsForm.type = 'add'
  pointsForm.points = 10
  pointsForm.description = ''
  pointsDialogVisible.value = true
}

const handlePointsSubmit = async () => {
  await pointsFormRef.value.validate()
  await api.put(`/members/${currentId.value}/points`, pointsForm)
  ElMessage.success('积分调整成功')
  pointsDialogVisible.value = false
  fetchMembers()
}

onMounted(() => {
  fetchMembers()
})
</script>
