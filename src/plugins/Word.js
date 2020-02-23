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

export default Word
