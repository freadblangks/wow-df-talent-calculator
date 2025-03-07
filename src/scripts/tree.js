import { EditorTalent, TranslateTalent, CalculatorTalent } from "./talent";
import { cellSize, cellSpace, editorCellSize, editorCellSpace } from "./const"
import { request } from "./api"

import '../styles/tree.scss'

class BaseTree {
  constructor(cols, rows) {
    this.cols = cols
    this.rows = rows
    this.class = ''
    this.tree = ''
    this.talents = []
    this.defaultTalents = []
    this.title = ''
    this.color = ''
    this.maxid = 0
  }

  setTree(tree) {
    this.cols = tree.cols
    this.rows = tree.rows
    this.class = tree.class
    this.tree = tree.tree || tree.spec
    this.title = tree.title || ''
    this.color = tree.color || '#212121'
    this.maxid = tree.maxid || 0
  }

  createElement(selector) {
    this.container = document.querySelector(selector)
    this.canvas = document.createElement('canvas')
    this.container.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')
    this.talentsContainer = document.createElement('div')
    this.container.appendChild(this.talentsContainer)
  }

  resize() {
    const width = this.size * this.cols + this.space * (this.cols + 1)
    const height = this.size * this.rows + this.space * (this.rows + 1)
    this.container.style.width = `${width}px`
    this.container.style.height = `${height}px`

    this.canvas.width = width
    this.canvas.height = height
  }

  saveAsFile(talents = this.talents, lang = 'en', upload = false) {
    const treeToSave = {
      class: this.class,
      tree: this.tree,
      cols: this.cols,
      rows: this.rows,
      talents: talents.map(tal => tal.saveTree()),
      defaultTalents: this.defaultTalents,
      maxid: this.maxid
      // title: this.title
    }
    const translation = {
      title: this.title,
      talents: talents.map(tal => tal.saveTranslation())
    }
    if (this.color != '' && this.color != '#212121') treeToSave.color = this.color
    if (upload) {
      const req = {
        lang: lang,
        class: this.class,
        spec: this.tree,
        tree: treeToSave,
        translation: translation
      }
      request('saveTree', req, true)
        .then(res => res.json())
        .then(res => {
          if (res == true) alert('Tree is saved successfully')
          else alert(res.error)
        })
      return
    }
    const a = document.createElement('a')
    a.href = window.URL.createObjectURL(new Blob([JSON.stringify(treeToSave)], { type: 'text/plain' }))
    a.download = `${this.class}_${this.tree}${lang ? '.' + lang : ''}.json`
    a.click()
  }
}

export class EditorTree extends BaseTree {
  constructor(cols, rows = 10, selector) {
    super(cols, rows)
    this.size = editorCellSize
    this.space = editorCellSpace
    this.createElement(selector)
    this.selected

    this.talents = [...Array(this.cols)].map((_, j) => [...Array(this.rows)].map((_, i) => new EditorTalent(j, i, this)))
    this.texts = document.querySelector('.editor-texts')

    this.resize()
  }

  resize(colsDiff, rowsDiff) {
    super.resize()

    this.texts.innerHTML = ''
    const tr = this.talents[0].map((_, colIndex) => this.talents.map(row => row[colIndex]))
    tr.forEach((row, i) => {
      const num = document.createElement('h4')
      num.innerText = `Row ${i + 1}`
      this.texts.appendChild(num)
      row.forEach(talent => {
        this.texts.appendChild(talent.div)
      })
    })
    if (!colsDiff && !rowsDiff) return

    if (rowsDiff > 0) {
      for (let i = 0; i < rowsDiff; i++) {
        this.talents.forEach((col, j) => {
          const tal = new EditorTalent(j, col.length, this, this.tooltip)
          col.push(tal)
        })
      }
    }
    if (rowsDiff < 0) {
      rowsDiff = -rowsDiff
      for (let i = 1; i <= rowsDiff; i++) {
        this.talents.forEach((col, j) => {
          col[col.length - 1].delete()
          col.splice(-1)
        })
      }
    }
    if (colsDiff > 0) {
      for (let i = 0; i < colsDiff; i++) {
        let col = [...Array(this.rows)].map((_, j) => new EditorTalent(this.talents.length, j, this, this.tooltip))
        this.talents.push(col)
      }
    }
    if (colsDiff < 0) {
      colsDiff = -colsDiff
      for (let i = 1; i <= colsDiff; i++) {
        this.talents[this.talents.length - i].forEach(tal => tal.delete())
      }
      this.talents.splice(this.talents.length - colsDiff)
    }

    this.redraw()
  }

  setTree(tree) {
    const collDiff = tree.cols - this.cols
    const rowDiff = tree.rows - this.rows

    super.setTree(tree)

    this.talents.forEach((col, j) => {
      col.forEach((tal, i) => {
        tal.clear()
      })
    })

    this.resize(collDiff, rowDiff)

    tree.talents.forEach(talent => {
      this.talents[talent.col || talent.x || 0][talent.row || talent.y || 0].setInfo(talent)
    })

    this.talents.forEach(col => {
      col.forEach(tal => {
        tal.children = tal.children.map(child => {
          const t = tree.talents.filter(c => c.id == child)[0]
          
          return this.talents[t.col][t.row]
        })
      })
    })

    if (tree.defaultTalents) this.defaultTalents = tree.defaultTalents.map(tal => {
      return { col: tal.col || tal.x || 0, row: tal.row || tal.y || 0 }
    })

    document.querySelector('#color').value = this.color
    document.querySelector('#title').value = this.title

    this.redraw()
  }

  saveAsFile(upload = false) {
    const talents = this.talents[0].map((_, i) => this.talents.map(row => row[i])).flat().filter(tal => tal.title)
    super.saveAsFile(talents, 'en', upload)
  }

  redraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.beginPath()
    this.ctx.fillStyle = '#FFF'
    this.ctx.lineWidth = 2
    this.talents.forEach(col => {
      col.forEach(tal => {
        tal.draw(this.ctx)
      })
    })
    this.ctx.stroke()
  }
}

export class TranslateTree /*extends BaseTree*/ {
  constructor() {
    this.title = ''
    this.talents = []
  }

  setTitle(title) {
    this.title = title
  }

  addTalent(talent) {
    this.talents.push(talent)
  }

  setTree(tree) {
    super.setTree(tree)

    this.talents = tree.talents.map(talent => new TranslateTalent(talent))

    this.defaultTalents = tree.defaultTalents
    document.querySelector('#title-en').innerHTML = this.title
  }

  copyTranslation(tree, callback) {
    const talents = tree.talents

    this.talents.forEach(tal => {
      const talent = talents.find(t => t.id == tal.id)
      if (talent) {
        tal.setInfo(talent, false)
      }
      else {
        tal.clearTexts()
      }
    })

    this.title = tree.title || ''
    const title = document.querySelector('#title-locale')
    title.value = this.title
    title.addEventListener('input', () => {
      this.title = title.value
    })

    callback()
  }

  setClear(callback) {
    this.talents.forEach(tal => {
      tal.clearTexts()
    })

    const title = document.querySelector('#title-locale')
    title.addEventListener('input', () => {
      this.title = title.value
    })

    callback()
  }

  saveAsFile(talents = this.talents, lang = 'en', upload = false, cls, spec) {
    // const treeToSave = {
    //   class: this.class,
    //   tree: this.tree,
    //   cols: this.cols,
    //   rows: this.rows,
    //   talents: talents.map(tal => tal.saveTree()),
    //   defaultTalents: this.defaultTalents,
    //   maxid: this.maxid
    //   // title: this.title
    // }
    const translation = {
      title: this.title,
      talents: talents
    }
    // if (this.color != '' && this.color != '#212121') treeToSave.color = this.color
    if (upload) {
      const req = {
        lang: lang,
        class: cls,
        spec: spec,
        // tree: treeToSave,
        translation: translation
      }
      console.log(req)
      request('saveTree', req, true)
        .then(res => res.json())
        .then(res => {
          if (res == true) alert('Tree is saved successfully')
          else alert(res.error)
        })
      return
    }
    const a = document.createElement('a')
    a.href = window.URL.createObjectURL(new Blob([JSON.stringify(treeToSave)], { type: 'text/plain' }))
    a.download = `${this.class}_${this.tree}${lang ? '.' + lang : ''}.json`
    a.click()
  }
}

export class CalculatorTree extends BaseTree {
  constructor(selector, points, tooltip, build) {
    super(10, 10)
    this.size = cellSize
    this.space = cellSpace
    this.createElement(selector)
    this.resize()

    const title = document.createElement('div')
    title.classList.add('spec-name')
    this.titleEl = document.createElement('div')
    title.appendChild(this.titleEl)
    const reset = document.createElement('div')
    reset.classList.add('reset-tree')
    reset.title = 'Reset Tree'
    reset.innerHTML = '❌'
    reset.addEventListener('click', () => {
      this.reset()
    })
    title.appendChild(reset)
    this.container.appendChild(title)

    this.tooltip = tooltip
    this.points = points
    this.pointsSpent = 0
    this.sectionPoints = [0, 0, 0]

    this.build = build
  }

  setTree(tree, build = '') {
    this.sectionPoints = [0, 0, 0]
    this.pointsSpent = 0
    super.setTree(tree)
    this.talents.forEach(talent => {
      talent.delete()
    })

    this.titleEl.innerText = `${this.title ? this.title : (this.tree + ' tree')} (${this.pointsSpent}/${this.points})`

    this.resize()

    this.talents = tree.talents.map(tal => {
      const talent = new CalculatorTalent(tal.col, tal.row, this)
      talent.setInfo(tal)
      talent.children = tal.children
      return talent
    })

    this.talents.forEach(talent => {
      talent.children = talent.children.map(child => {
        const tal = this.talents.filter(t => t.id == child)[0]
        tal.parents.push(talent)
        return tal
      })
    })

    // let talents = [...Array(this.cols)].map((_, j) => [...Array(this.rows)].map((_, i) => new CalculatorTalent(j, i, this)))

    // tree.talents.forEach(talent => {
    //   const col = talent.col || talent.x || 0
    //   const row = talent.row || talent.y || 0
    //   talents[col][row].setInfo(talent)

    //   const children = talent.children || talent.connections

    //   children.forEach(child => {
    //     talents[col][row].children.push(talents[child.col || child.x || 0][child.row || child.y || 0])
    //     talents[child.col || child.x || 0][child.row || child.y || 0].parents.push(talents[col][row])
    //   })
    // })

    // talents = talents[0].map((_, i) => talents.map(row => row[i])).flat().filter(tal => tal.title)

    // this.talents = talents.flat().filter(talent => talent.title)
    this.talents.forEach(talent => talent.createElements(this.talentsContainer))

    this.talents.filter(talent => talent.row == 0).forEach(talent => {
      talent.enable()
    })

    this.redraw()

    if (build) this.setTalents(build)
  }

  addPoints(points, section) {
    this.sectionPoints[section] += points
    this.pointsSpent = this.sectionPoints.reduce((a, b) => a + b, 0)

    this.titleEl.innerHTML = `${this.title ? this.title : (this.tree + ' tree')} (${this.pointsSpent}/${this.points})`

    if (this.sectionPoints[0] > 7) {
      this.talents.filter(talent => talent.row >= 4 && talent.row < 7).forEach(talent => {
        talent.enable(true)
      })
    }

    if (this.sectionPoints[0] + this.sectionPoints[1] > 19) {
      this.talents.filter(talent => talent.row >= 7).forEach(talent => {
        talent.enable(true)
      })
    }

    if (this.sectionPoints[0] < 8) {
      this.talents.filter(talent => talent.row >= 4 && talent.row < 7).forEach(talent => {
        talent.disable(true)
      })
    }

    if (this.sectionPoints[0] + this.sectionPoints[1] < 20) {
      this.talents.filter(talent => talent.row >= 7).forEach(talent => {
        talent.disable(true)
      })
    }

    if (this.pointsSpent == this.points) {
      this.talents.filter(talent => talent.enabled && talent.rank == 0).forEach(talent => {
        talent.setGray(true)
      })
    }

    if (this.pointsSpent < this.points) {
      this.talents.filter(talent => talent.grayout).forEach(talent => {
        talent.setGray(false)
      })
    }

    this.updateLink()
    this.redraw()
  }

  updateLink() {
    let line = this.talents.reduce((prev, curr) => {
      return prev + curr.rank
    }, '')
    const link = line.match(/.{1,10}/g).map(el => parseInt(el + '0'.repeat(10 - el.length), 4).toString(36)).map(el => el == '0' ? '' : el).join('-').replace(/-*$/, '')

    if (this.tree == 'class') this.build.setClassLink(link)
    else this.build.setSpecLink(link)

    this.build.setPoints(this.tree, this.pointsSpent)
  }

  setTalents(build) {
    this.sectionPoints = [0, 0, 0]
    this.build.setClassLink('')
    const p = build.split('-')
    let res = ''
    p.forEach((el, i) => {
      if (el == '') {
        res += '0'.repeat(10)
        return
      }
      let t = parseInt(el, 36).toString(4)
      t = '0'.repeat(10 - t.length) + t
      res += t
    })

    const points = res.split('').map(el => parseInt(el))
    for (let i = 0; i < Math.min(points.length); i++) {
      if (points[i] == 0) continue

      this.talents[i].activate(points[i])
    }

    this.addPoints(0, 0)
  }

  setDefaultTalents(talents) {
    talents = talents.map(tal => {
      return { col: tal.col || tal.x || 0, row: tal.row || tal.y || 0 }
    })

    this.talents.filter(talent => !talent.countable).forEach(talent => talent.countable = true)

    talents.forEach(tal => {
      const talent = this.talents.find(talent => talent.col == tal.col && talent.row == tal.row)
      talent.countable = false
      talent.activate(talent.ranks)
    })

    this.addPoints(-talents.length, 0)
  }

  redraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.beginPath()
    this.talents.forEach(talent => talent.draw(this.ctx))
    this.ctx.stroke()
  }

  reset() {
    this.talents.filter(talent => talent.grayout).forEach(talent => {
      talent.setGray(false)
    })

    this.talents.filter(tal => tal.row == 0).forEach(tal => {
      tal.reset()
    })
  }
}