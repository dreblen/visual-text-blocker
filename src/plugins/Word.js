// A word holds text
var Word = function () {
  this.id = Math.random()
  this.pos = null
  this.value = ''
  this.layer = null

  this.isSelected = false
  this.isHighlighted = false
  this.highlightColor = '#FDD835' // yellow darken-1

  this.prevWord = null
  this.nextWord = null

  // Verbal properties
  this.verbalSubject = null
  this.verbalDirectObject = null

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
    verbalSubject: (this.verbalSubject) ? this.verbalSubject.id : null,
    verbalDirectObject: (this.verbalDirectObject) ? this.verbalDirectObject.id : null,
    headTerm: (this.headTerm) ? this.headTerm.id : null
  }))
}

export default Word
