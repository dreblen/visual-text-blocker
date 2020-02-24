import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

// Define routes
const routeDefinitions = [
  {
    path: '/',
    name: 'Home'
  },
  {
    path: '/preferences',
    name: 'Preferences'
  }
]

// Associate our route definitions with components
var routes = []
for (let route of routeDefinitions) {
  route.component = () => import('../views/' + route.name + '.vue')
  routes.push(route)
}

// Finalize our router
const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
