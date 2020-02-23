import Vue from 'vue'
import Vuex from 'vuex'

import Layer from '@/plugins/Layer'
import Word from '@/plugins/Word'

Vue.use(Vuex)

function serializeLayers (layers) {
  return layers.map((layer) => {
    return layer.serialize()
  })
}

function unserializeLayers (json) {
  let layers = []
  let words = []

  // Recreate our layers and words
  json.forEach((l) => {
    // Make a new layer with the right values
    let layer = new Layer()
    layer.id = l.id
    layer.order = l.order
    layer.parent = l.parent

    // Make a new word with the right values
    l.words.forEach((w) => {
      let word = new Word()
      word.id = w.id
      word.pos = w.pos
      word.value = w.value
      word.layer = layer
      word.prevWord = w.prevWord
      word.nextWord = w.nextWord
      word.headTerm = w.headTerm

      // Store the word in its new layer
      layer.words.push(word)

      // Store the word temporarily in an easy-to-access array
      words[word.id] = word
    })

    // Store our new layer
    layers.push(layer)
  })

  // Re-assign object values from IDs now that our layers and words exist
  layers.forEach((l) => {
    if (l.parent !== null) {
      l.parent = words[l.parent]
    }
  })
  for (let w in words) {
    let word = words[w]
    if (word.prevWord !== null) {
      word.prevWord = words[word.prevWord]
    }
    if (word.nextWord !== null) {
      word.nextWord = words[word.nextWord]
    }
    if (word.headTerm !== null) {
      word.headTerm = words[word.headTerm]
    }
  }

  return layers
}

export default new Vuex.Store({
  state: {
    layers: [],
    layerHistory: [],
    layerHistoryDepth: 0,
    shouldReset: false
  },
  getters: {
    serializedLayers: function (state) {
      return serializeLayers(state.layers)
    },
    canUndo: function (state) {
      return state.layerHistory.length > 0 && state.layerHistoryDepth !== state.layerHistory.length
    },
    canRedo: function (state) {
      return state.layerHistory.length > 0 && state.layerHistoryDepth > 1
    }
  },
  mutations: {
    // Saves the current state of the layers so it can be returned to via history
    saveLayers: function (state) {
      // Discard any redo possibilities past our current history depth
      if (state.layerHistoryDepth > 0) {
        state.layerHistory.splice(-state.layerHistoryDepth)
        state.layerHistoryDepth = 0
      }

      state.layerHistory.push(serializeLayers(state.layers))
    },
    setLayers: function (state, layers) {
      state.layers = layers
    },
    spliceLayers: function (state, payload) {
      state.layers.splice(payload.index, 0, payload.layer)
    },
    importLayers: function (state, json) {
      state.layers = unserializeLayers(json)
    }
  },
  actions: {
    reset: function ({ state, commit }) {
      // Update our indicator value for the benefit of any listeners
      state.shouldReset = true

      // Clear out our layer data and history
      commit('setLayers', [])
      state.layerHistory = []
      state.layerHistoryDepth = 0

      // Update our indicator again to show completion, giving any listeners a
      // chance to respond to the first change above
      Vue.nextTick(() => {
        state.shouldReset = false
      })
    },
    undo: function ({ state, getters, commit }) {
      // See if we're able to go back any further
      if (!getters.canUndo) {
        return
      }

      // Capture the current state if this is our first undo action
      if (state.layerHistoryDepth === 0) {
        commit('saveLayers')
        state.layerHistoryDepth++
      }

      // Increase our depth and return the stored state
      state.layers = unserializeLayers(state.layerHistory[state.layerHistory.length - state.layerHistoryDepth - 1])
      state.layerHistoryDepth++
    },
    redo: function ({ state, getters }) {
      // See if we're able to go any further forward
      if (!getters.canRedo) {
        return
      }

      // Decrease our depth and return the stored state
      state.layerHistoryDepth--
      state.layers = unserializeLayers(state.layerHistory[state.layerHistory.length - state.layerHistoryDepth])
    }
  }
})
