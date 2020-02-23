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
          label="Upload exported file"
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
import Layer from '@/plugins/Layer'
import Word from '@/plugins/Word'
let Latin = require('parse-latin')

export default {
  name: 'home',
  data: () => ({
    // Text and layers
    rawText: '',
    parsedText: null,

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
      'layers',
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
                  // Store our current state before making changes
                  this.$store.commit('saveLayers')

                  // Set our word's head term
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
                // Store our current state before making changes
                this.$store.commit('saveLayers')

                this.selectedWords.forEach((w) => {
                  // Set our word's part of speech
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
              // Store our current state before making changes
              this.$store.commit('saveLayers')

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
              _this.$store.commit('spliceLayers', {
                index,
                layer
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

      // Layer-related actions
      if (this.selectedLayers.length > 0) {
        // Change parent
        actions.push({
          title: 'Change Parent',
          action: function () {
            _this.pendingActionCallback = function (w) {
              // Store our current state before making changes
              this.$store.commit('saveLayers')

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

      // Empty out our text
      this.rawText = ''
      this.parsedText = null
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
      this.$store.commit('setLayers', layers)
    },
    // Reads an uploaded file and tries to import it as layer and word data
    fileUploaded: function (file) {
      let reader = new FileReader()
      reader.onload = (ev) => {
        // Store our layers globally, and mark our text as parsed
        let json = JSON.parse(ev.target.result)
        this.$store.commit('importLayers', json)
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
