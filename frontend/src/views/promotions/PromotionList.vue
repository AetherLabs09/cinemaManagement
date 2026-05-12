<template>
  <div class="promotion-list">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="优惠活动" name="promotions">
        <div class="search-form">
          <el-button type="primary" @click="handleAddPromotion">新增活动</el-button>
        </div>
        <el-card>
          <el-table :data="promotions" style="width: 100%">
            <el-table-column prop="name" label="活动名称" />
            <el-table-column prop="type" label="活动类型" width="120">
              <template #default="{ row }">
                {{ promotionTypeMap[row.type] }}
              </template>
            </el-table-column>
            <el-table-column prop="discount" label="优惠" width="100">
              <template #default="{ row }">
                {{ row.type === 'discount' ? `${row.discount}折` : `满${row.condition_amount}减${row.discount}` }}
              </template>
            </el-table-column>
            <el-table-column label="有效期" width="200">
              <template #default="{ row }">
                {{ row.start_date }} 至 {{ row.end_date }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'">
                  {{ row.status === 1 ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button size="small" @click="handleEditPromotion(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="handleDeletePromotion(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
      
      <el-tab-pane label="优惠券" name="coupons">
        <div class="search-form">
          <el-button type="primary" @click="handleAddCoupon">生成优惠券</el-button>
        </div>
        <el-card>
          <el-table :data="coupons" style="width: 100%">
            <el-table-column prop="code" label="优惠券码" width="150" />
            <el-table-column prop="promotion_name" label="关联活动" />
            <el-table-column prop="discount" label="优惠金额" width="100">
              <template #default="{ row }">
                ¥{{ row.discount }}
              </template>
            </el-table-column>
            <el-table-column prop="min_amount" label="最低消费" width="100">
              <template #default="{ row }">
                ¥{{ row.min_amount }}
              </template>
            </el-table-column>
            <el-table-column prop="expire_date" label="过期日期" width="120" />
            <el-table-column prop="used" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.used ? 'info' : 'success'">
                  {{ row.used ? '已使用' : '未使用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="180" />
          </el-table>
          <el-pagination v-model:current-page="couponPagination.page" v-model:page-size="couponPagination.pageSize" :total="couponPagination.total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @size-change="fetchCoupons" @current-change="fetchCoupons" />
        </el-card>
      </el-tab-pane>
      
      <el-tab-pane label="票种设置" name="ticketTypes">
        <div class="search-form">
          <el-button type="primary" @click="handleAddTicketType">新增票种</el-button>
        </div>
        <el-card>
          <el-table :data="ticketTypes" style="width: 100%">
            <el-table-column prop="name" label="票种名称" />
            <el-table-column prop="discount" label="折扣" width="100">
              <template #default="{ row }">
                {{ (row.discount * 10).toFixed(1) }}折
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'">
                  {{ row.status === 1 ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button size="small" @click="handleEditTicketType(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="handleDeleteTicketType(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="promotionDialogVisible" :title="isEditPromotion ? '编辑活动' : '新增活动'" width="500px">
      <el-form :model="promotionForm" :rules="promotionRules" ref="promotionFormRef" label-width="100px">
        <el-form-item label="活动名称" prop="name">
          <el-input v-model="promotionForm.name" />
        </el-form-item>
        <el-form-item label="活动类型" prop="type">
          <el-select v-model="promotionForm.type" style="width: 100%">
            <el-option label="折扣" value="discount" />
            <el-option label="满减" value="full_reduction" />
          </el-select>
        </el-form-item>
        <el-form-item label="优惠" prop="discount">
          <el-input-number v-model="promotionForm.discount" :min="0" :precision="1" v-if="promotionForm.type === 'discount'" />
          <el-input-number v-model="promotionForm.discount" :min="0" :precision="2" v-else />
          <span v-if="promotionForm.type === 'discount'">折</span>
          <span v-else>元</span>
        </el-form-item>
        <el-form-item label="满减条件" v-if="promotionForm.type === 'full_reduction'">
          <el-input-number v-model="promotionForm.condition_amount" :min="0" :precision="2" />
          元
        </el-form-item>
        <el-form-item label="开始日期" prop="start_date">
          <el-date-picker v-model="promotionForm.start_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束日期" prop="end_date">
          <el-date-picker v-model="promotionForm.end_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="promotionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePromotionSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="couponDialogVisible" title="生成优惠券" width="500px">
      <el-form :model="couponForm" :rules="couponRules" ref="couponFormRef" label-width="100px">
        <el-form-item label="关联活动">
          <el-select v-model="couponForm.promotion_id" clearable style="width: 100%">
            <el-option v-for="p in promotions" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="优惠金额" prop="discount">
          <el-input-number v-model="couponForm.discount" :min="0" :precision="2" />
          元
        </el-form-item>
        <el-form-item label="最低消费">
          <el-input-number v-model="couponForm.min_amount" :min="0" :precision="2" />
          元
        </el-form-item>
        <el-form-item label="过期日期" prop="expire_date">
          <el-date-picker v-model="couponForm.expire_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="生成数量" prop="count">
          <el-input-number v-model="couponForm.count" :min="1" :max="1000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="couponDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCouponSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="ticketTypeDialogVisible" :title="isEditTicketType ? '编辑票种' : '新增票种'" width="500px">
      <el-form :model="ticketTypeForm" :rules="ticketTypeRules" ref="ticketTypeFormRef" label-width="100px">
        <el-form-item label="票种名称" prop="name">
          <el-input v-model="ticketTypeForm.name" />
        </el-form-item>
        <el-form-item label="折扣" prop="discount">
          <el-slider v-model="ticketTypeForm.discount" :min="0" :max="1" :step="0.05" :format-tooltip="(val) => `${(val * 10).toFixed(1)}折`" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="ticketTypeForm.description" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ticketTypeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleTicketTypeSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/utils/api'

const activeTab = ref('promotions')
const promotions = ref([])
const coupons = ref([])
const ticketTypes = ref([])
const promotionDialogVisible = ref(false)
const couponDialogVisible = ref(false)
const ticketTypeDialogVisible = ref(false)
const isEditPromotion = ref(false)
const isEditTicketType = ref(false)
const promotionFormRef = ref()
const couponFormRef = ref()
const ticketTypeFormRef = ref()
const currentPromotionId = ref(null)
const currentTicketTypeId = ref(null)

const couponPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const promotionForm = reactive({
  name: '',
  type: 'discount',
  discount: 9,
  condition_amount: 0,
  start_date: '',
  end_date: ''
})

const couponForm = reactive({
  promotion_id: null,
  discount: 10,
  min_amount: 0,
  expire_date: '',
  count: 10
})

const ticketTypeForm = reactive({
  name: '',
  discount: 0.8,
  description: ''
})

const promotionRules = {
  name: [{ required: true, message: '请输入活动名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择活动类型', trigger: 'change' }],
  discount: [{ required: true, message: '请输入优惠', trigger: 'blur' }],
  start_date: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  end_date: [{ required: true, message: '请选择结束日期', trigger: 'change' }]
}

const couponRules = {
  discount: [{ required: true, message: '请输入优惠金额', trigger: 'blur' }],
  expire_date: [{ required: true, message: '请选择过期日期', trigger: 'change' }],
  count: [{ required: true, message: '请输入生成数量', trigger: 'blur' }]
}

const ticketTypeRules = {
  name: [{ required: true, message: '请输入票种名称', trigger: 'blur' }],
  discount: [{ required: true, message: '请设置折扣', trigger: 'blur' }]
}

const promotionTypeMap = {
  discount: '折扣',
  full_reduction: '满减'
}

const fetchPromotions = async () => {
  const res = await api.get('/promotions/promotions')
  promotions.value = res
}

const fetchCoupons = async () => {
  const res = await api.get('/promotions/coupons', { params: couponPagination })
  coupons.value = res.list
  couponPagination.total = res.total
}

const fetchTicketTypes = async () => {
  const res = await api.get('/promotions/ticket-types')
  ticketTypes.value = res
}

const handleAddPromotion = () => {
  isEditPromotion.value = false
  Object.assign(promotionForm, { name: '', type: 'discount', discount: 9, condition_amount: 0, start_date: '', end_date: '' })
  promotionDialogVisible.value = true
}

const handleEditPromotion = (row) => {
  isEditPromotion.value = true
  currentPromotionId.value = row.id
  Object.assign(promotionForm, row)
  promotionDialogVisible.value = true
}

const handlePromotionSubmit = async () => {
  await promotionFormRef.value.validate()
  
  if (isEditPromotion.value) {
    await api.put(`/promotions/promotions/${currentPromotionId.value}`, promotionForm)
    ElMessage.success('更新成功')
  } else {
    await api.post('/promotions/promotions', promotionForm)
    ElMessage.success('创建成功')
  }
  
  promotionDialogVisible.value = false
  fetchPromotions()
}

const handleDeletePromotion = (row) => {
  ElMessageBox.confirm('确定要删除该活动吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await api.delete(`/promotions/promotions/${row.id}`)
    ElMessage.success('删除成功')
    fetchPromotions()
  })
}

const handleAddCoupon = () => {
  Object.assign(couponForm, { promotion_id: null, discount: 10, min_amount: 0, expire_date: '', count: 10 })
  couponDialogVisible.value = true
}

const handleCouponSubmit = async () => {
  await couponFormRef.value.validate()
  const res = await api.post('/promotions/coupons', couponForm)
  ElMessage.success(res.message)
  couponDialogVisible.value = false
  fetchCoupons()
}

const handleAddTicketType = () => {
  isEditTicketType.value = false
  Object.assign(ticketTypeForm, { name: '', discount: 0.8, description: '' })
  ticketTypeDialogVisible.value = true
}

const handleEditTicketType = (row) => {
  isEditTicketType.value = true
  currentTicketTypeId.value = row.id
  Object.assign(ticketTypeForm, row)
  ticketTypeDialogVisible.value = true
}

const handleTicketTypeSubmit = async () => {
  await ticketTypeFormRef.value.validate()
  
  if (isEditTicketType.value) {
    await api.put(`/promotions/ticket-types/${currentTicketTypeId.value}`, ticketTypeForm)
    ElMessage.success('更新成功')
  } else {
    await api.post('/promotions/ticket-types', ticketTypeForm)
    ElMessage.success('创建成功')
  }
  
  ticketTypeDialogVisible.value = false
  fetchTicketTypes()
}

const handleDeleteTicketType = (row) => {
  ElMessageBox.confirm('确定要删除该票种吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await api.delete(`/promotions/ticket-types/${row.id}`)
    ElMessage.success('删除成功')
    fetchTicketTypes()
  })
}

onMounted(() => {
  fetchPromotions()
  fetchCoupons()
  fetchTicketTypes()
})
</script>
