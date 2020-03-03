<template>
  <v-container @click="clearSelection" fill-height align-start>
    <template v-if="layers.length === 0">
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
          <template>
            <p
              v-if="shouldRenderLayer(layer)"
              :class="['display-1', (layer.isSelected) ? 'primary' : '']"
              style="border-radius: 10px;"
            >
              <v-icon
                @click.stop="layerClicked(layer)"
                @mouseover="layerMouseOver(layer)"
                @mouseout="layerMouseOut(layer)"
              >
                {{ layerIcon }}
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
                :class="[(word.isSelected) ? 'accent' : '']"
                :style="{borderRadius: '10px', color: (posColors.shouldHighlightPartsOfSpeech.value === true && posColors[word.pos]) ? posColors[word.pos].value : 'black', backgroundColor: (word.isHighlighted) ? (word.highlightColor || 'yellow') : ''}"
              >
                <v-icon v-if="word.icon">
                  {{ word.icon }}
                </v-icon>
                {{ word.value }}
                <v-btn icon v-if="word.isSelected && word.nextWord && word.nextWord.layer.id === word.layer.id && !word.nextWord.isSelected" @click.stop="extendSelection(word)">
                  <v-icon>mdi-chevron-right</v-icon>
                </v-btn>
                <!--
                 If this is not the last word in the layer but its .nextWord value
                 lives in a different layer, insert an icon to visualize that
                 something parenthetical has been extracted into a separate line/layer
                -->
                <span
                  v-if="word.nextWord !== null && word.nextWord.layer.id !== word.layer.id && word.layer.words[word.layer.words.length - 1].id !== word.id"
                >
                  <v-icon>mdi-arrow-expand-horizontal</v-icon>
                </span>
              </span>
            </p>
            <p v-else class="text-center">
              <v-icon>mdi-dots-horizontal</v-icon>
            </p>
          </template>
          <template v-if="preferences.display.settings.shouldShowCompanionText.value === true && shouldRenderLayer(layer)">
            <p v-if="companionTextLayer === layer.id">
              <v-text-field
                label="Companion Text"
                v-model="companionText"
              />
              <v-row>
                <v-spacer />
                <v-btn @click="$store.commit('saveLayers'); layer.companionText = companionText; companionTextLayer = null">Save</v-btn>
                <v-btn @click="companionTextLayer = null">Cancel</v-btn>
              </v-row>
            </p>
            <template v-else>
              <p class="headline">{{ layer.companionText || '' }}</p>
            </template>
          </template>
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
              <v-btn block @click.stop="action.action">
                <v-icon v-if="action.target" left>{{ action.target === 'Layer' ? 'mdi-text' : 'mdi-alphabetical' }}</v-icon>
                {{ action.title }}
              </v-btn>
            </v-col>
          </v-row>
        </v-row>
      </v-footer>
    </v-expand-transition>
    <v-dialog
      v-model="shouldShowWordSplitDialog"
    >
      <v-card>
        <v-card-title>
          Split Word
        </v-card-title>
        <v-card-text>
          <p class="display-3 text-center">
            <span v-for="(letter, i) in wordSplitText" :key="i">
              <span :class="(i < wordSplitIndex) ? 'yellow--text' : 'blue--text'">{{ letter }}</span>
              <span v-if="i === wordSplitIndex - 1">|</span>
            </span>
          </p>
          <v-slider
            v-model="wordSplitIndex"
            step="1"
            :min="1"
            :max="wordSplitText.length - 1"
            ticks
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialogPendingAction">Split</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import Layer from '@/plugins/Layer'
import Word from '@/plugins/Word'
let Latin = require('parse-latin')

export default {
  name: 'home',
  data: () => ({
    // Text and layers
    rawText: '',
    parsedText: null,

    // Word-splitting dialog
    dialogPendingAction: null,
    shouldShowWordSplitDialog: false,
    wordSplitText: '',
    wordSplitIndex: 0,

    // Actions and selections
    activeSelectionAction: null,
    pendingActionCallback: null,
    pendingActionTarget: null,
    companionText: null,
    companionTextLayer: null
  }),
  computed: {
    ...mapState([
      'preferences',
      'shouldReset'
    ]),
    ...mapGetters([
      'hiddenLayerPhraseTypes',
      'hiddenLayerClauseTypes'
    ]),
    layers: function () {
      return this.$store.state.layers.slice(0).sort((a, b) => {
        if (a.index < b.index) {
          return -1
        }
        if (a.index > b.index) {
          return 1
        }
        return 0
      })
    },
    layerIcon: function () {
      return (this.pendingActionTarget === 'Layer' && this.pendingActionCallback !== null) ? 'mdi-bullseye-arrow' : 'mdi-drag'
    },
    posColors: function () {
      return this.preferences.posColors.settings
    },
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
            _this.pendingActionTarget = null
          }
        })

        return actions
      }

      // Word-related actions
      if (this.selectedWords.length > 0) {
        // Single-word actions
        if (this.selectedWords.length === 1) {
          let word = this.selectedWords[0]
          // Verbal actions
          if (['verb', 'participle', 'infinitive'].indexOf(word.pos) !== -1) {
            // Mark subject
            actions.push({
              title: 'Subject',
              target: 'Word',
              action: function () {
                _this.pendingActionCallback = function (w) {
                  // Store our current state before making changes
                  this.$store.commit('saveLayers')

                  // Set our word's subject
                  word.verbalSubject = w

                  // Finish our selection/action process
                  _this.clearSelection()
                }
                _this.pendingActionTarget = 'Word'
                _this.activeSelectionAction = this
              },
              instructions: 'Select a word as this verbal\'s subject'
            })

            // Mark direct object
            actions.push({
              title: 'Direct Object',
              target: 'Word',
              action: function () {
                _this.pendingActionCallback = function (w) {
                  // Store our current state before making changes
                  this.$store.commit('saveLayers')

                  // Set our word's subject
                  word.verbalDirectObject = w

                  // Finish our selection/action process
                  _this.clearSelection()
                }
                _this.pendingActionTarget = 'Word'
                _this.activeSelectionAction = this
              },
              instructions: 'Select a word as this verbal\'s direct object'
            })
          }

          // Adjective/Article actions
          if (['adjective', 'article'].indexOf(word.pos) !== -1) {
            // Mark head term
            actions.push({
              title: 'Head Term',
              target: 'Word',
              action: function () {
                _this.pendingActionCallback = function (w) {
                  // Store our current state before making changes
                  this.$store.commit('saveLayers')

                  // Set our word's head term
                  word.headTerm = w

                  // Finish our selection/action process
                  _this.clearSelection()
                }
                _this.pendingActionTarget = 'Word'
                _this.activeSelectionAction = this
              },
              instructions: 'Select a word as this word\'s head term'
            })
          }

          // Split a word into two words
          actions.push({
            title: 'Split',
            target: 'Word',
            action: function () {
              _this.wordSplitText = _this.selectedWords[0].value
              _this.dialogPendingAction = () => {
                // Store our current state before making changes
                _this.$store.commit('saveLayers')

                // Change the value of our word
                let word = _this.selectedWords[0]
                word.value = _this.wordSplitText.slice(0, _this.wordSplitIndex)

                // Add a new word with the rest of the value
                let w = new Word()
                w.value = _this.wordSplitText.slice(_this.wordSplitIndex)
                w.layer = word.layer
                w.layer.words.splice(1 + w.layer.words.findIndex(s => s.id === word.id), 0, w)

                // Update connections
                w.nextWord = word.nextWord
                word.nextWord.prevWord = w
                word.nextWord = w
                w.prevWord = word

                // Finish our selection/action process
                _this.clearSelection()
              }
              _this.wordSplitIndex = 0
              _this.shouldShowWordSplitDialog = true
            }
          })
        }

        // Mark part of speech (has sub menu)
        actions.push({
          title: 'Part of Speech',
          target: 'Word',
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
          target: 'Word',
          action: function () {
            _this.pendingActionCallback = function (w) {
              // If the selected parent word is in our active selection, then
              // we have to stop now to avoid circular references
              if (w !== null && this.selectedWords.find((word) => {
                return word.id === w.id
              })) {
                return
              }

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
              let targetLayer = previousLayer
              if (w !== null) {
                targetLayer = w.layer
              }
              // eslint-disable-next-line vue/no-side-effects-in-computed-properties
              _this.$store.dispatch('insertLayerAtIndex', {
                index: targetLayer.index + 1,
                layer
              })

              // Finish our selection/action process
              _this.clearSelection()
            }
            _this.pendingActionTarget = 'Word'
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
        // Single-layer actions
        if (this.selectedLayers.length === 1) {
          // Change order
          actions.push({
            title: 'Change Order',
            target: 'Layer',
            action: function () {
              _this.pendingActionCallback = function (l) {
                // Store our current state before making changes
                this.$store.commit('saveLayers')

                // Move the selected layer
                _this.$store.dispatch('moveLayerToIndex', {
                  layer: _this.selectedLayers[0],
                  index: l.index
                })

                // Finish our selection/action process
                _this.clearSelection()
              }
              _this.pendingActionTarget = 'Layer'
              _this.activeSelectionAction = this
            },
            instructions: 'Select a new location for this layer'
          })

          // Add companion text
          if (this.preferences.display.settings.shouldShowCompanionText.value === true) {
            actions.push({
              title: 'Companion Text',
              target: 'Layer',
              action: function () {
                let layer = _this.selectedLayers[0]
                _this.companionText = layer.companionText
                _this.companionTextLayer = layer.id
              }
            })
          }
        }

        // Set layer type
        actions.push({
          title: 'Set Type',
          target: 'Layer',
          action: function () {
            _this.pendingActionCallback = function (type) {
              // Queue up our next action based on the second-level menu
              _this.pendingActionCallback = function (typeVal) {
                // Store our current state before making changes
                _this.$store.commit('saveLayers')

                // Update the type value for our selected layer(s)
                _this.selectedLayers.forEach((layer) => {
                  layer.type = typeVal
                })

                // Finish our selection/action process
                _this.clearSelection()
              }

              // Build our list of actions from the specified broad type
              let types = Layer.types[type]
              let actions = []
              for (let type in types) {
                actions.push({
                  title: type,
                  action: () => { _this.pendingActionCallback(types[type]) }
                })
              }

              // Show the next menu
              _this.activeSelectionAction = {
                actions
              }
            }
            _this.activeSelectionAction = this
          },
          actions: [
            { title: 'Phrase', action: () => { this.pendingActionCallback('Phrase') } },
            { title: 'Clause', action: () => { this.pendingActionCallback('Clause') } }
          ]
        })

        // Change parent
        actions.push({
          title: 'Change Parent',
          target: 'Layer',
          action: function () {
            _this.pendingActionCallback = function (w) {
              if (w !== null) {
                // If the selected parent word is in our layer(s), we have to stop
                // to avoid circular references
                if (this.selectedLayers.find((layer) => {
                  return layer.id === w.layer.id
                })) {
                  return
                }

                // If the selected parent word is directly or indirectly the child
                // of our layer(s), then we have to stop to avoid circular references
                let blacklistLayerIds = []
                let parent = w.layer.parent
                while (parent !== null) {
                  blacklistLayerIds.push(parent.layer.id)
                  parent = parent.layer.parent
                }
                if (this.selectedLayers.find((layer) => {
                  return blacklistLayerIds.indexOf(layer.id) !== -1
                })) {
                  return
                }
              }

              // Store our current state before making changes
              this.$store.commit('saveLayers')

              // Change the parent of each selected layer
              _this.selectedLayers.forEach((layer) => {
                layer.parent = w
              })

              // Finish our selection/action process
              _this.clearSelection()
            }
            _this.pendingActionTarget = 'Word'
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
        layer.index = layers.length
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
      // If we have a callback queued, use that instead of our default logic
      if (this.pendingActionTarget === 'Layer' && this.pendingActionCallback !== null) {
        return this.pendingActionCallback(layer)
      }

      layer.isSelected = !layer.isSelected
    },
    wordMouseOver: function (word) {
      [
        { name: 'verbalSubject', icon: 'mdi-alpha-s-box-outline' },
        { name: 'verbalDirectObject', icon: 'mdi-alpha-o-box-outline' },
        { name: 'headTerm' }
      ].forEach((prop) => {
        if (word[prop.name]) {
          word[prop.name].highlightColor = this.posColors[word.pos].value
          word[prop.name].isHighlighted = true
          if (prop.icon) {
            word[prop.name].icon = prop.icon
          }
        }
      })
    },
    wordMouseOut: function (word) {
      [
        'verbalSubject',
        'verbalDirectObject',
        'headTerm'
      ].forEach((prop) => {
        if (word[prop]) {
          word[prop].isHighlighted = false
          word[prop].highlightColor = null
          word[prop].icon = null
        }
      })
    },
    wordClicked: function (word) {
      // If we have a callback queued, use that instead of our default logic
      if (this.pendingActionTarget === 'Word' && this.pendingActionCallback !== null) {
        return this.pendingActionCallback(word)
      }

      word.isSelected = !word.isSelected
    },
    // Based on user preferences, return whether or not to show this layer
    shouldRenderLayer: function (layer) {
      return this.hiddenLayerPhraseTypes.indexOf(layer.type) === -1 &&
        this.hiddenLayerClauseTypes.indexOf(layer.type) === -1
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

      this.shouldShowWordSplitDialog = false

      this.activeSelectionAction = null
      this.pendingActionCallback = null
      this.pendingActionTarget = null
    }
  }
}
</script>
