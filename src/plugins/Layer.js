// A layer holds words and may be subordinate to a word
var Layer = function () {
  this.id = Math.random()
  this.index = null
  this.type = null
  this.parent = null // Word
  this.words = []

  this.companionText = null

  this.isSelected = false
}

// Define some layer types that can be used to handle layer data more specifically
Layer.types = {
  Phrase: {
    Prepositional: 1001,
    Generic: 1000
  },
  Clause: {
    Independent: 2001,
    Dependent: 2002,
    Relative: 2003,
    Generic: 2000
  }
}

Layer.prototype.serialize = function () {
  return JSON.parse(JSON.stringify({
    id: this.id,
    index: this.index,
    type: this.type,
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
