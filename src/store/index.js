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
    layer.index = l.index
    layer.parent = l.parent
    layer.companionText = l.companionText

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

    preferences: {
      display: {
        description: 'Display Settings',
        settings: {
          shouldShowCompanionText: {
            type: 'boolean',
            default: true,
            value: true,
            description: 'Show companion text along with layer data'
          }
        }
      },
      posColors: {
        type: 'group',
        description: 'Part of Speech Colors',
        settings: {
          shouldHighlightPartsOfSpeech: {
            type: 'boolean',
            default: true,
            value: true,
            description: 'Change the color of words based on their part of speech'
          },
          verb: {
            type: 'color',
            default: '#2196F3', // 'blue'
            value: '#2196F3'
          },
          participle: {
            type: 'color',
            default: '#4CAF50', // 'green'
            value: '#4CAF50'
          },
          infinitive: {
            type: 'color',
            default: '#9c27b0', // 'purple'
            value: '#9c27b0'
          },
          relative: {
            type: 'color',
            default: '#ffeb3b', // 'yellow'
            value: '#ffeb3b'
          },
          adjective: {
            type: 'color',
            default: '#ff9800', // 'orange'
            value: '#ff9800'
          },
          article: {
            type: 'color',
            value: '#9e9e9e', // 'grey'
            default: '#9e9e9e'
          },
          conjunction: {
            type: 'color',
            default: '#F44336', // 'red'
            value: '#F44336'
          }
        }
      }
    },

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
    setPreference: function (state, pref) {
      state.preferences[pref.groupName].settings[pref.name].value = (pref.value !== null) ? pref.value : state.preferences[pref.groupName].settings[pref.name].default
    },
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
    // Updates index values for any layers necessary in order to accommodate
    // putting a layer at the specified location, then sets the index for the
    // layer to that location. Payload must contain 'index' where to put the
    // layer, and 'layer' as the layer we want to put there.
    moveLayerToIndex: function ({ state }, payload) {
      // Don't do anything if our layer is already at the requested index
      if (payload.layer.index === payload.index) {
        return
      }

      // Check which direction we need to move index values
      if (payload.layer.index === null || payload.layer.index > payload.index) {
        // - Move index values up
        let upperLimit = state.layers.length
        if (payload.layer.index !== null) {
          upperLimit = payload.layer.index
        }
        state.layers.filter(layer => layer.index >= payload.index && layer.index < upperLimit).forEach((layer) => {
          layer.index++
        })
      } else {
        // - Move index values down
        let lowerLimit = 0
        if (payload.layer.index !== null) {
          lowerLimit = payload.layer.index
        }
        state.layers.filter(layer => layer.index <= payload.index && layer.index > lowerLimit).forEach((layer) => {
          layer.index--
        })
      }

      // Set the index value for our working layer
      payload.layer.index = payload.index
    },
    // Adds a passed Layer object as a new layer in the global list. Payload
    // must contain 'index' where to put the layer, and 'layer' as the layer we
    // want to put there.
    insertLayerAtIndex: function ({ state, dispatch }, payload) {
      // Accommodate our new layer
      dispatch('moveLayerToIndex', payload)

      // Put the new layer into our layer list
      state.layers.splice(payload.index, 0, payload.layer)
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
