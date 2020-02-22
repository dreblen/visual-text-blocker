<template>
  <v-container @click="clearSelection" fill-height align-start>
    <template v-if="parsedText === null">
      <v-row>
        <v-col>
          <v-row>
            <v-col>
              <v-textarea
                label="Enter raw text to be parsed"
                v-model="rawText"
              />
            </v-col>
          </v-row>
          <v-row>
              <v-spacer />
              <v-btn @click="parse">Parse</v-btn>
          </v-row>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <p class="headline text-center">Or</p>
        </v-col>
      </v-row>
      <v-row>
        <v-file-input
          label="Uploaded exported file"
          @change="fileUploaded"
          />
      </v-row>
    </template>
    <v-row>
      <v-col>
        <div v-for="layer in layers" :key="layer.id">
          <p
            :class="['display-1', (layer.isSelected) ? 'primary' : '']"
            style="border-radius: 10px;"
          >
            <v-icon
              @click.stop="layerClicked(layer)"
              @mouseover="layerMouseOver(layer)"
              @mouseout="layerMouseOut(layer)"
            >
              mdi-drag
            </v-icon>
            <v-icon v-for="i in layer.getNumParents()" :key="i" class="mx-3">
              mdi-keyboard-tab
            </v-icon>
            <span
              v-for="word in layer.words"
              :key="word.id"
              @click.stop="wordClicked(word)"
              @mouseover="wordMouseOver(word)"
              @mouseout="wordMouseOut(word)"
              :class="[(word.isSelected) ? 'accent' : '', (word.isHighlighted) ? (word.highlightColor || 'yellow') : '', (posColors[word.pos]) ? posColors[word.pos] + '--text' : '']"
              style="border-radius: 10px;"
            >
              {{ word.value }}
              <v-btn icon v-if="word.isSelected && word.nextWord && word.nextWord.layer.id === word.layer.id && !word.nextWord.isSelected" @click.stop="extendSelection(word)">
                <v-icon>mdi-chevron-right</v-icon>
              </v-btn>
            </span>
          </p>
        </div>
      </v-col>
    </v-row>
    <v-expand-transition>
      <v-footer app v-if="haveActiveSelection">
        <v-row v-if="activeSelectionAction && activeSelectionAction.instructions">
          <v-col class="text-center">
            {{ activeSelectionAction.instructions }}
          </v-col>
        </v-row>
        <v-row>
          <v-row class="overflow-x-auto pb-3" style="width: 100vw; flex-wrap: nowrap;">
            <v-col v-for="action in selectionActions" :key="action.title">
              <v-btn @click.stop="action.action">
                {{ action.title }}
              </v-btn>
            </v-col>
          </v-row>
        </v-row>
      </v-footer>
    </v-expand-transition>
  </v-container>
</template>

<script>
import { mapState } from 'vuex'
let Latin = require('parse-latin')

// A word holds text
var Word = function () {
  this.id = Math.random()
  this.pos = null
  this.value = ''
  this.layer = null

  this.isSelected = false
  this.isHighlighted = false
  this.highlightColor = 'yellow'

  this.prevWord = null
  this.nextWord = null

  // Adjective/Article properties
  this.headTerm = null
}

Word.prototype.serialize = function () {
  return JSON.parse(JSON.stringify({
    id: this.id,
    pos: this.pos,
    value: this.value,
    layer: this.layer.id,
    prevWord: (this.prevWord) ? this.prevWord.id : null,
    nextWord: (this.nextWord) ? this.nextWord.id : null,
    headTerm: (this.headTerm) ? this.headTerm.id : null
  }))
}

// A layer holds words and may be subordinate to a word
// TODO: Add categorization of the layer type (e.g., sentence, cause, phrase,
// association [e.g., article/noun, adj/noun]) so we can handle/render them
// appropriately based on user preference
var Layer = function () {
  this.id = Math.random()
  this.order = null
  this.parent = null // Word
  this.words = []

  this.isSelected = false
}

Layer.prototype.serialize = function () {
  return JSON.parse(JSON.stringify({
    id: this.id,
    order: this.order,
    parent: (this.parent) ? this.parent.id : null,
    words: this.words.map((word) => {
      return word.serialize()
    })
  }))
}

// Returns the number of Layer levels above the Layer object
Layer.prototype.getNumParents = function () {
  if (this.parent === null) {
    return 0
  } else {
    return 1 + this.parent.layer.getNumParents()
  }
}

export default {
  name: 'home',
  data: () => ({
    // Text and layers
    rawText: '',
    parsedText: null,
    layers: [],

    // Actions and selections
    activeSelectionAction: null,
    pendingActionCallback: null,

    // Theming
    posColors: {
      verb: 'blue',
      participle: 'green',
      infinitive: 'purple',
      relative: 'yellow',
      adjective: 'orange',
      article: 'grey',
      conjunction: 'red'
    }
  }),
  computed: {
    ...mapState([
      'shouldReset'
    ]),
    // Retrieves only the sentence nodes from the parsed NLCST data
    parsedSentences: function () {
      // We can't do anything if the text hasn't been parsed yet or if we're
      // working with an imported layer file
      if (this.parsedText === null || this.parsedText === true) {
        return []
      }

      return this.parsedText.children.reduce((collector, paragraph) => {
        // If our paragraph has no children, we don't care about it
        if (!paragraph.children) {
          return collector
        }

        // Iterate the paragraph's children
        for (let child of paragraph.children) {
          if (child.type === 'SentenceNode') {
            collector.push(child)
          }
        }

        return collector
      }, [])
    },
    // Retrieves an array of Word objects that are currently selected
    selectedWords: function () {
      return this.layers.reduce((collector, layer) => {
        for (let word of layer.words) {
          if (word.isSelected) {
            collector.push(word)
          }
        }

        return collector
      }, [])
    },
    // Retrieves an array of Layer objects that are currently selected
    selectedLayers: function () {
      return this.layers.filter((layer) => {
        return layer.isSelected === true
      })
    },
    // Retrieves an array of action definitions that can be used to work with
    // the currently selected words and/or layers
    selectionActions: function () {
      let actions = []

      // Some of our actions require knowledge of both themselves and the
      // component, so we make the component available as _this
      let _this = this

      // See if we're showing a sub-menu from a previous action
      if (this.activeSelectionAction !== null) {
        // Sub items
        actions = this.activeSelectionAction.actions || []

        // Back button
        actions.unshift({
          title: '<',
          action: function () {
            _this.activeSelectionAction = null
            _this.pendingActionCallback = null
          }
        })

        return actions
      }

      // Word-related actions
      if (this.selectedWords.length > 0) {
        // Single-word actions
        if (this.selectedWords.length === 1) {
          let word = this.selectedWords[0]
          // Adjective/Article actions
          if (['adjective', 'article'].indexOf(word.pos) !== -1) {
            // Mark head term
            actions.push({
              title: 'Head Term',
              action: function () {
                _this.pendingActionCallback = function (w) {
                  word.headTerm = w

                  // Finish our selection/action process
                  _this.clearSelection()
                }
                _this.activeSelectionAction = this
              },
              instructions: 'Select a word as this word\'s head term'
            })
          }
        }

        // Mark part of speech (has sub menu)
        actions.push({
          title: 'Part of Speech',
          action: function () {
            _this.activeSelectionAction = this
          },
          actions: [ 'verb', 'participle', 'infinitive', 'relative', 'adjective', 'article', 'conjunction' ].map((pos) => {
            return {
              title: pos,
              action: () => {
                this.selectedWords.forEach((w) => {
                  w.pos = pos
                })
              }
            }
          })
        })

        // Create a layer
        actions.push({
          title: 'Make Layer',
          action: function () {
            _this.pendingActionCallback = function (w) {
              // Make a new layer with our selected words and remove the words
              // from their current layers (storing the first word's original
              // layer for later in case we need it)
              let layer = new Layer()
              layer.parent = w
              let previousLayer = null
              for (let word of this.selectedWords) {
                // Store the layer of the first word
                if (previousLayer === null) {
                  previousLayer = word.layer
                }

                // Change the word's layer
                layer.words.push(word)
                word.layer.words = word.layer.words.filter((w) => {
                  return w !== word
                })
                word.layer = layer
              }

              // Add our layer to the global list after the parent word's layer
              // (or the first selected word's layer if there's no parent)
              let index = 0
              let targetID = previousLayer.id
              if (w !== null) {
                targetID = w.layer.id
              }
              for (let i in _this.layers) {
                let layer = _this.layers[i]
                if (layer.id === targetID) {
                  index = parseInt(i) + 1
                  break
                }
              }
              // eslint-disable-next-line vue/no-side-effects-in-computed-properties
              _this.layers.splice(index, 0, layer)

              // Finish our selection/action process
              _this.clearSelection()
            }
            _this.activeSelectionAction = this
          },
          actions: [
            { title: 'Top Level', action: () => { this.wordClicked(null) } }
          ],
          instructions: 'Select a word as this layer\'s parent, or select an action below'
        })
      }

      // Layer-related actions
      if (this.selectedLayers.length > 0) {
        // Change parent
        actions.push({
          title: 'Change Parent',
          action: function () {
            _this.pendingActionCallback = function (w) {
              // Change the parent of each selected layer
              _this.selectedLayers.forEach((layer) => {
                layer.parent = w
              })

              // Finish our selection/action process
              _this.clearSelection()
            }
            _this.activeSelectionAction = this
          },
          actions: [
            { title: 'Top Level', action: () => { this.wordClicked(null) } }
          ],
          instructions: 'Select a word as this layer\'s parent, or select an action below'
        })
      }

      return actions
    },
    // true/false on whether or not anything is currently selected
    haveActiveSelection: function () {
      return this.selectedWords.length > 0 || this.selectedLayers.length > 0
    }
  },
  watch: {
    // Wait for a reset "signal" so we know when to start over
    shouldReset: function (val) {
      if (val === false) {
        return
      }

      // Make sure we aren't storing any selection
      this.clearSelection()

      // Empty out our text and layers
      this.rawText = ''
      this.parsedText = null
      this.layers = []

      // Mark the reset as complete
      this.$store.commit('reset', false)
    }
  },
  methods: {
    // Parses the rawText value into a NLCST-formatted parsedText value, and
    // uses that data to generate Layer and Word objects that can be more easily
    // manipulated
    parse: function () {
      // Parse any Latin-type script into NLCST
      let parser = new Latin()
      this.parsedText = parser.parse(this.rawText)

      // Simplify our parsed text into our own semantic units...
      let layers = []
      let prevWord = null
      // ...mapping each sentence to a layer
      for (let sentence of this.parsedSentences) {
        // Make a new layer
        let layer = new Layer()
        // Convert all the words in the sentence into a Word object
        for (let child of sentence.children) {
          if (child.type !== 'WordNode' || child.children.length === 0) {
            continue
          }
          child = child.children[0]
          if (child.type !== 'TextNode') {
            continue
          }

          // Create our word and add it to our layer
          let w = new Word()
          w.value = child.value
          w.layer = layer
          layer.words.push(w)

          // Add word linkings to preserve original sequence even across layers
          w.prevWord = prevWord
          if (prevWord !== null) {
            prevWord.nextWord = w
          }
          prevWord = w
        }

        // Add our layer to our list
        layers.push(layer)
      }

      // Establish our global layer list
      this.layers = layers
      this.$root.layers = this.layers
    },
    // Reads an uploaded file and tries to import it as layer and word data
    fileUploaded: function (file) {
      let reader = new FileReader()
      reader.onload = (ev) => {
        let json = JSON.parse(ev.target.result)
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

        // Store our layers globally, and mark our text as parsed
        this.layers = layers
        this.$root.layers = this.layers
        this.parsedText = true
      }
      reader.readAsText(file)
    },
    layerMouseOver: function (layer) {
      if (layer.parent) {
        layer.parent.isHighlighted = true
      }
    },
    layerMouseOut: function (layer) {
      if (layer.parent) {
        layer.parent.isHighlighted = false
      }
    },
    layerClicked: function (layer) {
      layer.isSelected = !layer.isSelected
    },
    wordMouseOver: function (word) {
      // Part-of-speech-specific logic
      switch (word.pos) {
        case 'adjective':
        case 'article':
          if (word.headTerm) {
            word.headTerm.highlightColor = this.posColors[word.pos]
            word.headTerm.isHighlighted = true
          }
          break
      }
    },
    wordMouseOut: function (word) {
      // Part-of-speech-specific logic
      switch (word.pos) {
        case 'adjective':
        case 'article':
          if (word.headTerm) {
            word.headTerm.isHighlighted = false
          }
          break
      }
    },
    wordClicked: function (word) {
      // If we have a callback queued, use that instead of our default logic
      if (this.pendingActionCallback !== null) {
        return this.pendingActionCallback(word)
      }

      word.isSelected = !word.isSelected
    },
    // From the specified word, mark each remaining word in the layer as selected
    extendSelection: function (word) {
      let w = word
      let id = w.layer.id
      while (w !== null && w.layer.id === id) {
        w.isSelected = true
        w = w.nextWord
      }
    },
    // Mark all words and layers as unselected, and reset the action pane
    clearSelection: function () {
      this.selectedWords.forEach((w) => { w.isSelected = false })
      this.selectedLayers.forEach((l) => { l.isSelected = false })

      this.activeSelectionAction = null
      this.pendingActionCallback = null
    }
  }
}
</script>
