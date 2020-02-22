import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    layers: [],
    shouldReset: false
  },
  mutations: {
    setLayers: function (state, layers) {
      state.layers = layers
    },
    spliceLayers: function (state, payload) {
      state.layers.splice(payload.index, 0, payload.layer)
    },
    reset: function (state, val) {
      state.shouldReset = (val === undefined) ? true : val
    }
  }
})
