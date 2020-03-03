// A layer holds words and may be subordinate to a word
// TODO: Add categorization of the layer type (e.g., sentence, cause, phrase,
// association [e.g., article/noun, adj/noun]) so we can handle/render them
// appropriately based on user preference
var Layer = function () {
  this.id = Math.random()
  this.index = null
  this.parent = null // Word
  this.words = []

  this.companionText = null

  this.isSelected = false
}

Layer.prototype.serialize = function () {
  return JSON.parse(JSON.stringify({
    id: this.id,
    index: this.index,
    parent: (this.parent) ? this.parent.id : null,
    companionText: this.companionText,
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

export default Layer
