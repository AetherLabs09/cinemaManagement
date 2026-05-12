<template>
  <div class="order-list">
    <div class="search-form">
      <el-form inline>
        <el-form-item label="订单号">
          <el-input v-model="searchForm.order_no" clearable />
        </el-form-item>
        <el-form-item label="订单状态">
          <el-select v-model="searchForm.status" clearable placeholder="全部">
            <el-option label="待支付" value="pending" />
            <el-option label="已支付" value="paid" />
            <el-option label="已退款" value="refunded" />
            <el-option label="已作废" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchOrders">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
          <el-button type="success" @click="handleExport">导出</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-card>
      <el-table :data="orders" style="width: 100%">
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column prop="movie_title" label="电影" />
        <el-table-column prop="hall_name" label="影厅" width="100" />
        <el-table-column prop="schedule_start_time" label="放映时间" width="180" />
        <el-table-column prop="seats" label="座位" width="120">
          <template #default="{ row }">
            {{ JSON.parse(row.seats).join(', ') }}
          </template>
        </el-table-column>
        <el-table-column prop="total_price" label="金额" width="100">
          <template #default="{ row }">
            ¥{{ row.total_price }}
          </template>
        </el-table-column>
        <el-table-column prop="member_name" label="会员" width="100">
          <template #default="{ row }">
            {{ row.member_name || '散客' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status].type">{{ statusMap[row.status].text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="下单时间" width="180" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" @click="handleDetail(row)">详情</el-button>
            <el-button size="small" type="warning" @click="handleRefund(row)" v-if="row.status === 'paid'">退款</el-button>
            <el-button size="small" type="danger" @click="handleCancel(row)" v-if="row.status === 'pending'">作废</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :total="pagination.total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @size-change="fetchOrders" @current-change="fetchOrders" />
    </el-card>

    <el-dialog v-model="detailDialogVisible" title="订单详情" width="500px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="订单号">{{ currentOrder?.order_no }}</el-descriptions-item>
        <el-descriptions-item label="电影">{{ currentOrder?.movie_title }}</el-descriptions-item>
        <el-descriptions-item label="影厅">{{ currentOrder?.hall_name }}</el-descriptions-item>
        <el-descriptions-item label="放映时间">{{ currentOrder?.schedule_start_time }}</el-descriptions-item>
        <el-descriptions-item label="座位">{{ currentOrder?.seats ? JSON.parse(currentOrder.seats).join(', ') : '' }}</el-descriptions-item>
        <el-descriptions-item label="票价">¥{{ currentOrder?.ticket_price }}</el-descriptions-item>
        <el-descriptions-item label="总金额">¥{{ currentOrder?.total_price }}</el-descriptions-item>
        <el-descriptions-item label="会员">{{ currentOrder?.member_name || '散客' }}</el-descriptions-item>
        <el-descriptions-item label="会员手机">{{ currentOrder?.member_phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="支付方式">{{ currentOrder?.payment_method || '-' }}</el-descriptions-item>
        <el-descriptions-item label="订单状态">
          <el-tag :type="statusMap[currentOrder?.status]?.type">{{ statusMap[currentOrder?.status]?.text }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ currentOrder?.created_at }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/utils/api'

const orders = ref([])
const detailDialogVisible = ref(false)
const currentOrder = ref(null)

const searchForm = reactive({
  order_no: '',
  status: '',
  dateRange: []
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const statusMap = {
  pending: { text: '待支付', type: 'warning' },
  paid: { text: '已支付', type: 'success' },
  refunded: { text: '已退款', type: 'info' },
  cancelled: { text: '已作废', type: 'danger' }
}

const fetchOrders = async () => {
  const params = { ...pagination }
  if (searchForm.order_no) params.order_no = searchForm.order_no
  if (searchForm.status) params.status = searchForm.status
  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    params.start_date = searchForm.dateRange[0]
    params.end_date = searchForm.dateRange[1]
  }
  
  const res = await api.get('/orders', { params })
  orders.value = res.list
  pagination.total = res.total
}

const resetSearch = () => {
  searchForm.order_no = ''
  searchForm.status = ''
  searchForm.dateRange = []
  pagination.page = 1
  fetchOrders()
}

const handleDetail = async (row) => {
  const res = await api.get(`/orders/${row.id}`)
  currentOrder.value = res
  detailDialogVisible.value = true
}

const handleRefund = (row) => {
  ElMessageBox.confirm('确定要退款该订单吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await api.put(`/orders/${row.id}/refund`, { reason: '管理员退款' })
    ElMessage.success('退款成功')
    fetchOrders()
  })
}

const handleCancel = (row) => {
  ElMessageBox.confirm('确定要作废该订单吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await api.put(`/orders/${row.id}/cancel`)
    ElMessage.success('订单已作废')
    fetchOrders()
  })
}

const handleExport = async () => {
  if (!searchForm.dateRange || searchForm.dateRange.length !== 2) {
    ElMessage.error('请选择日期范围')
    return
  }
  
  const params = {
    start_date: searchForm.dateRange[0],
    end_date: searchForm.dateRange[1]
  }
  
  window.open(`/api/orders/export?start_date=${params.start_date}&end_date=${params.end_date}&token=${localStorage.getItem('token')}`)
}

onMounted(() => {
  fetchOrders()
})
</script>
