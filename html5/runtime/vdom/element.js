import Node from './node'
import { extend } from '../../shared/utils'
import {
  getDoc,
  getListener,
  uniqueId,
  linkParent,
  nextElement,
  previousElement,
  insertIndex,
  moveIndex,
  removeIndex
} from './operation'

const DEFAULT_TAG_NAME = 'div'

export default function Element (type = DEFAULT_TAG_NAME, props) {
  props = props || {}
  this.nodeType = 1
  this.nodeId = uniqueId()
  this.ref = this.nodeId
  this.type = type
  this.attr = props.attr || {}
  this.style = props.style || {}
  this.classStyle = props.classStyle || {}
  this.event = {}
  this.children = []
  this.pureChildren = []
}

Element.prototype = new Node()
Element.prototype.constructor = Element

function registerNode (docId, node) {
  const doc = getDoc(docId)
  doc.nodeMap[node.nodeId] = node
}

Element.prototype.appendChild = function (node) {
  if (node.parentNode && node.parentNode !== this) {
    return
  }
  if (!node.parentNode) {
    linkParent(node, this)
    insertIndex(node, this.children, this.children.length, true)
    if (this.docId) {
      registerNode(this.docId, node)
    }
    if (node.nodeType === 1) {
      insertIndex(node, this.pureChildren, this.pureChildren.length)
      const listener = getListener(this.docId)
      if (listener) {
        return listener.addElement(node, this.ref, -1)
      }
    }
  }
  else {
    moveIndex(node, this.children, this.children.length, true)
    if (node.nodeType === 1) {
      const index = moveIndex(node, this.pureChildren, this.pureChildren.length)
      const listener = getListener(this.docId)
      if (listener && index >= 0) {
        return listener.moveElement(node.ref, this.ref, index)
      }
    }
  }
}

Element.prototype.insertBefore = function (node, before) {
  if (node.parentNode && node.parentNode !== this) {
    return
  }
  if (node === before || (node.nextSibling && node.nextSibling === before)) {
    return
  }
  if (!node.parentNode) {
    linkParent(node, this)
    insertIndex(node, this.children, this.children.indexOf(before), true)
    if (this.docId) {
      registerNode(this.docId, node)
    }
    if (node.nodeType === 1) {
      const pureBefore = nextElement(before)
      const index = insertIndex(
        node,
        this.pureChildren,
        pureBefore
          ? this.pureChildren.indexOf(pureBefore)
          : this.pureChildren.length
      )
      const listener = getListener(this.docId)
      if (listener) {
        return listener.addElement(node, this.ref, index)
      }
    }
  }
  else {
    moveIndex(node, this.children, this.children.indexOf(before), true)
    if (node.nodeType === 1) {
      const pureBefore = nextElement(before)
      const index = moveIndex(
        node,
        this.pureChildren,
        pureBefore
          ? this.pureChildren.indexOf(pureBefore)
          : this.pureChildren.length
      )
      const listener = getListener(this.docId)
      if (listener && index >= 0) {
        return listener.moveElement(node.ref, this.ref, index)
      }
    }
  }
}

Element.prototype.insertAfter = function (node, after) {
  if (node.parentNode && node.parentNode !== this) {
    return
  }
  if (node === after || (node.previousSibling && node.previousSibling === after)) {
    return
  }
  if (!node.parentNode) {
    linkParent(node, this)
    insertIndex(node, this.children, this.children.indexOf(after) + 1, true)
    if (this.docId) {
      registerNode(this.docId, node)
    }
    if (node.nodeType === 1) {
      const index = insertIndex(
        node,
        this.pureChildren,
        this.pureChildren.indexOf(previousElement(after)) + 1
      )
      const listener = getListener(this.docId)
      if (listener) {
        return listener.addElement(node, this.ref, index)
      }
    }
  }
  else {
    moveIndex(node, this.children, this.children.indexOf(after) + 1, true)
    if (node.nodeType === 1) {
      const index = moveIndex(
        node,
        this.pureChildren,
        this.pureChildren.indexOf(previousElement(after)) + 1
      )
      const listener = getListener(this.docId)
      if (listener && index >= 0) {
        return listener.moveElement(node.ref, this.ref, index)
      }
    }
  }
}

Element.prototype.removeChild = function (node, preserved) {
  if (node.parentNode) {
    removeIndex(node, this.children, true)
    if (node.nodeType === 1) {
      removeIndex(node, this.pureChildren)
      const listener = getListener(this.docId)
      if (listener) {
        listener.removeElement(node.ref)
      }
    }
  }
  if (!preserved) {
    node.destroy()
  }
}

Element.prototype.clear = function () {
  const listener = getListener(this.docId)
  if (listener) {
    this.pureChildren.forEach(node => {
      listener.removeElement(node.ref)
    })
  }
  this.children.forEach(node => {
    node.destroy()
  })
  this.children.length = 0
  this.pureChildren.length = 0
}

Element.prototype.setAttr = function (key, value, silent) {
  if (this.attr[key] === value && silent !== false) {
    return
  }
  this.attr[key] = value
  const listener = getListener(this.docId)
  if (!silent && listener) {
    listener.setAttr(this.ref, key, value)
  }
}

Element.prototype.setStyle = function (key, value, silent) {
  if (this.style[key] === value && silent !== false) {
    return
  }
  this.style[key] = value
  const listener = getListener(this.docId)
  if (!silent && listener) {
    listener.setStyle(this.ref, key, value)
  }
}

Element.prototype.resetClassStyle = function () {
  for (const key in this.classStyle) {
    this.classStyle[key] = ''
  }
}

Element.prototype.setClassStyle = function (classStyle) {
  this.resetClassStyle()
  extend(this.classStyle, classStyle)
  const listener = getListener(this.docId)
  if (listener) {
    listener.setStyles(this.ref, this.toStyle())
  }
}

Element.prototype.addEvent = function (type, handler) {
  if (!this.event[type]) {
    this.event[type] = handler
    const listener = getListener(this.docId)
    if (listener) {
      listener.addEvent(this.ref, type)
    }
  }
}

Element.prototype.removeEvent = function (type) {
  if (this.event[type]) {
    delete this.event[type]
    const listener = getListener(this.docId)
    if (listener) {
      listener.removeEvent(this.ref, type)
    }
  }
}

Element.prototype.fireEvent = function (type, e) {
  const handler = this.event[type]
  if (handler) {
    return handler.call(this, e)
  }
}

Element.prototype.toStyle = function () {
  return extend({}, this.classStyle, this.style)
}

Element.prototype.toJSON = function () {
  const result = {
    ref: this.ref.toString(),
    type: this.type,
    attr: this.attr,
    style: this.toStyle()
  }
  const event = Object.keys(this.event)
  if (event.length) {
    result.event = event
  }
  if (this.pureChildren.length) {
    result.children = this.pureChildren.map((child) => child.toJSON())
  }
  return result
}

Element.prototype.toString = function () {
  return '<' + this.type +
    ' attr=' + JSON.stringify(this.attr) +
    ' style=' + JSON.stringify(this.toStyle()) + '>' +
    this.pureChildren.map((child) => child.toString()).join('') +
    '</' + this.type + '>'
}
