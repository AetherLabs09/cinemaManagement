import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || '')

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    token.value = res.token
    user.value = res.user
    localStorage.setItem('token', res.token)
    return res
  }

  const logout = () => {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
  }

  const fetchUser = async () => {
    if (token.value) {
      try {
        const res = await api.get('/auth/me')
        user.value = res
      } catch (error) {
        logout()
      }
    }
  }

  return { user, token, login, logout, fetchUser }
})
