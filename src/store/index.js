import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    shouldReset: false
  },
  mutations: {
    reset: function (state, val) {
      state.shouldReset = (val === undefined) ? true : val
    }
  }
})
