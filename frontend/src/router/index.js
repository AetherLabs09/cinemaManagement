import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/layout/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '控制台', icon: 'Odometer' }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/users/UserList.vue'),
        meta: { title: '账号管理', icon: 'User', roles: ['super_admin', 'admin'] }
      },
      {
        path: 'movies',
        name: 'Movies',
        component: () => import('@/views/movies/MovieList.vue'),
        meta: { title: '电影管理', icon: 'Film' }
      },
      {
        path: 'halls',
        name: 'Halls',
        component: () => import('@/views/halls/HallList.vue'),
        meta: { title: '影厅管理', icon: 'Grid' }
      },
      {
        path: 'schedules',
        name: 'Schedules',
        component: () => import('@/views/schedules/ScheduleList.vue'),
        meta: { title: '排片管理', icon: 'Calendar' }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/orders/OrderList.vue'),
        meta: { title: '订单管理', icon: 'Tickets' }
      },
      {
        path: 'seats',
        name: 'Seats',
        component: () => import('@/views/seats/SeatManage.vue'),
        meta: { title: '座位管理', icon: 'Seat' }
      },
      {
        path: 'members',
        name: 'Members',
        component: () => import('@/views/members/MemberList.vue'),
        meta: { title: '会员管理', icon: 'Avatar' }
      },
      {
        path: 'promotions',
        name: 'Promotions',
        component: () => import('@/views/promotions/PromotionList.vue'),
        meta: { title: '优惠活动', icon: 'Present' }
      },
      {
        path: 'news',
        name: 'News',
        component: () => import('@/views/news/NewsList.vue'),
        meta: { title: '新闻公告', icon: 'Document' }
      },
      {
        path: 'stats',
        name: 'Stats',
        component: () => import('@/views/stats/StatsReport.vue'),
        meta: { title: '数据统计', icon: 'DataLine' }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: { title: '个人信息', hidden: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 电影院后台管理系统` : '电影院后台管理系统'
  
  const userStore = useUserStore()
  const token = localStorage.getItem('token')
  
  if (to.path !== '/login' && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else if (to.meta.roles && !to.meta.roles.includes(userStore.user?.role)) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
