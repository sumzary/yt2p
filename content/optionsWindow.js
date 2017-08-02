/*
 * YouTube 2 Player - Watch videos in an external player.
 *
 * Copyright 2016-2017 Rasmus Riiner <rasmus.riiner@mail.ee>
 *
 * Distributed under the MIT/X11 License. See LICENSE.md for more details.
 */

;(function (global) {
  'use strict'

  const {isArray} = Array
  const {Constructor: CC, classes: Cc, interfaces: Ci, utils: Cu} = global.Components
  const {Services} = Cu.import('resource://gre/modules/Services.jsm', {})
  const IFilePicker = CC('@mozilla.org/filepicker;1', 'nsIFilePicker', 'init')
  const IFileInputStream = CC('@mozilla.org/network/file-input-stream;1', 'nsIFileInputStream', 'init')
  const IFileOutputStream = CC('@mozilla.org/network/file-output-stream;1', 'nsIFileOutputStream', 'init')
  const IScriptableInputStream = CC('@mozilla.org/scriptableinputstream;1', 'nsIScriptableInputStream', 'init')
  const IScriptableUnicodeConverter = CC('@mozilla.org/intl/scriptableunicodeconverter', 'nsIScriptableUnicodeConverter')

  const LOGO_16 = 'chrome://yt2p/skin/16/yt2p.png'
  const PLAYER_16 = 'chrome://yt2p/skin/16/player.png'
  const EDIT_XUL = 'chrome://yt2p/content/editPlayer.xul'
  const PREF_BRANCH = 'extensions.yt2p.'

  const prefBranch = Services.prefs.getBranch(PREF_BRANCH)
  const playerView = {
    _prefName: 'players',
    _items: [],
    _rows: [],
    _tree: null,
    get rowCount () {
      return this._rows.length
    },
    _clearItemClickSenders (item) {
      delete item.isClickSender
      if (!isArray(item.children)) return
      item.children.forEach(playerView._clearItemClickSenders)
    },
    _countVisibleRowsForRow (rowIndex) {
      const row = this._rows[rowIndex]
      for (let i = rowIndex + 1; i < this._rows.length; i++) {
        if (this._rows[i].level <= row.level) return i - rowIndex
      }
      return this._rows.length - rowIndex
    },
    _newRowsFromItems (items, level = 0) {
      if (!isArray(items)) return []
      return items.reduce((rows, item) => {
        rows.push({ item, level })
        if (item.isOpen) {
          const newRows = playerView._newRowsFromItems(item.children, level + 1)
          return rows.concat(newRows)
        }
        return rows
      }, [])
    },
    addItem (item) {
      const selectedRows = this.getSelectedRows()
      const currentRow = selectedRows.length
        ? selectedRows[selectedRows.length - 1]
        : this._rows[0]
      const currentRowIndex = this._rows.indexOf(currentRow)
      currentRow.item.children = currentRow.item.children || []
      currentRow.item.children.push(item)
      const visibleRowCount = this._countVisibleRowsForRow(currentRowIndex)
      const insertIndex = currentRowIndex + visibleRowCount
      const level = currentRow.level + 1
      this._rows.splice(insertIndex, 0, { item, level })
      this._tree.rowCountChanged(insertIndex, 1)
      this.selection.select(insertIndex)
      this.maybeSavePref()
    },
    canDrop (rowIndex, orientation, dataTransfer) {
      if (rowIndex === 0) return
      if (orientation === Ci.nsITreeView.DROP_ON &&
          this._rows[rowIndex].item.isSeparator) return
      const draggedRows = this._draggedRows
      if (!draggedRows) {
        const json = dataTransfer.getData('text/plain')
        return json && isArray(JSON.parse(json))
      }
      return !draggedRows.some(draggedRow => {
        const draggedRowIndex = this._rows.indexOf(draggedRow)
        const visibleRowCount = this._countVisibleRowsForRow(draggedRowIndex)
        const lastIndex = draggedRowIndex + visibleRowCount
        return rowIndex >= draggedRowIndex && rowIndex < lastIndex
      })
    },
    contextMenuOpened (event) {
      const popup = event.target
      const selectedItems = this.getSelectedItems()
      const item = selectedItems[0]
      const isSelection = selectedItems.length > 0
      $$('.require-selection', popup).forEach(mi => (mi.hidden = !isSelection))
      const isContainer = selectedItems.length === 1 && !item.isSeparator
      $$('.require-container', popup).forEach(mi => (mi.hidden = !isContainer))
      const isEditable = isContainer && item !== this._items[0]
      $$('.require-editable', popup).forEach(mi => (mi.hidden = !isEditable))
    },
    copyItems () {
      const data = this.getSelectedItems()
      if (!data) return
      const json = JSON.stringify(data)
      setClipboardString(json)
    },
    cutItems () {
      this.copyItems()
      this.deleteItems()
    },
    cycleHeader (column, elem) {},
    deleteItems (force = false, rows = this.getSelectedRows()) {
      if (!force && rows.some(row => !row.item.isSeparator) &&
          !Services.prompt.confirm(null, 'YT2P',
            $('#playerTree').getAttribute('_confirmDelete'))) return
      const deleteRows = rows.slice()
      for (let row of rows) {
        const start = this._rows.indexOf(row)
        const end = start + this._countVisibleRowsForRow(row)
        for (let i = start; i < end; i++) {
          if (rows.indexOf(this._rows[i]) !== -1) continue
          deleteRows.push(this._rows[i])
        }
      }
      deleteRows.sort((a, b) => b.level - a.level).forEach(row => {
        const rowIndex = this._rows.indexOf(row)
        const parentRowIndex = this.getParentIndex(rowIndex)
        const parentRow = this._rows[parentRowIndex]
        const itemIndex = parentRow.item.children.indexOf(row.item)
        parentRow.item.children.splice(itemIndex, 1)
        const deleteCount = this._countVisibleRowsForRow(rowIndex)
        this._rows.splice(rowIndex, deleteCount)
        this._tree.invalidateRow(parentRowIndex)
        this._tree.rowCountChanged(rowIndex, -deleteCount)
      })
      this.maybeSavePref()
    },
    doubleClicked (event) {
      // const selData = this.getSelectedItems()
      // if (selData.length !== 1) return
      // const data = selData[0]
      // if (data.children && data.children.length) return
      // this.editItem()
    },
    drop (rowIndex, orientation, dataTransfer) {
      const row = this._rows[rowIndex]
      const json = dataTransfer.getData('text/plain')
      if (!json) return
      const draggedItems = JSON.parse(json)
      if (!isArray(draggedItems)) return
      if (dataTransfer.dropEffect === 'move' && this._draggedRows) {
        this.deleteItems(true, this._draggedRows)
        rowIndex = this._rows.indexOf(row)
      } else if (dataTransfer.dropEffect === 'copy') {
        draggedItems.forEach(this._clearItemClickSenders)
      }
      if (orientation === Ci.nsITreeView.DROP_ON) {
        row.item.children = row.item.children || []
        if (!row.item.isOpen) {
          this.toggleOpenState(rowIndex)
          this._tree.invalidateRow(rowIndex)
        }
        draggedItems.forEach(item => row.item.children.push(item))
        const visibleRowCount = this._countVisibleRowsForRow(rowIndex)
        const insertIndex = rowIndex + visibleRowCount
        const newRows = this._newRowsFromItems(draggedItems, row.level + 1)
        this._rows.splice(insertIndex, 0, ...newRows)
        this._tree.rowCountChanged(insertIndex, newRows.length)
        const lastIndex = insertIndex + newRows.length - 1
        this.selection.rangedSelect(insertIndex, lastIndex, false)
      } else {
        const parentRowIndex = this.getParentIndex(rowIndex)
        const parentRow = this._rows[parentRowIndex]
        if (!parentRow.item.isOpen) {
          this.toggleOpenState(parentRowIndex)
          this._tree.invalidateRow(parentRowIndex)
        }
        const itemIndex = parentRow.item.children.indexOf(row.item)
        const itemInsertIndex = orientation === Ci.nsITreeView.DROP_BEFORE
          ? itemIndex
          : itemIndex + 1
        parentRow.item.children.splice(itemInsertIndex, 0, ...draggedItems)
        const insertIndex = orientation === Ci.nsITreeView.DROP_BEFORE
          ? rowIndex
          : rowIndex + this._countVisibleRowsForRow(rowIndex)
        const newRows = this._newRowsFromItems(draggedItems, row.level)
        this._rows.splice(insertIndex, 0, ...newRows)
        this._tree.rowCountChanged(insertIndex, newRows.length)
        const lastIndex = insertIndex + newRows.length - 1
        this.selection.rangedSelect(insertIndex, lastIndex, false)
      }
      this.maybeSavePref()
    },
    editItem () {
      const selectedItems = this.getSelectedItems()
      if (!selectedItems.length) return
      const item = selectedItems[selectedItems.length - 1]
      if (item === this._rows[0]) return
      if (item.isSeparator) return
      $('prefwindow').openSubDialog(EDIT_XUL, '', item).focus()
    },
    endDrag (event) {
      delete this._draggedRows
    },
    getCellProperties (rowIndex, column, properties) {
      if (rowIndex === 0) return
      const item = this._rows[rowIndex].item
      if (item.isSeparator) return 'isSeparator'
      if (column.id === 'isIconRow' &&
          item.isIconRow !== true &&
          !this.isContainerEmpty(rowIndex)) return 'isPopup'
      return column.id
    },
    getCellText (rowIndex, column) {
      return this._rows[rowIndex].item[column.id]
    },
    getCellValue (rowIndex, column) {
      return this._rows[rowIndex].item[column.id]
    },
    getColumnProperties (colid, column, props) {},
    getImageSrc (rowIndex, column) {
      if (column.id !== 'name') return
      const item = this._rows[rowIndex].item
      if (!item.icon) return
      return item.icon
    },
    getLevel (rowIndex) {
      return this._rows[rowIndex].level
    },
    getParentIndex (rowIndex) {
      const row = this._rows[rowIndex]
      for (let i = rowIndex - 1; i >= 0; --i) {
        if (this._rows[i].level < row.level) return i
      }
      return -1
    },
    getRowProperties (rowIndex) {},
    getSelectedItems () {
      const items = []
      const start = {}
      const end = {}
      for (let i = 0; i < this.selection.getRangeCount(); i++) {
        this.selection.getRangeAt(i, start, end)
        let headLevel = Infinity
        for (let j = start.value; j <= end.value; j++) {
          const row = this._rows[j]
          if (row.level > headLevel) continue
          items.push(row.item)
          headLevel = row.level
        }
      }
      return items
    },
    getSelectedRows () {
      const rows = []
      const start = {}
      const end = {}
      for (let i = 0; i < this.selection.getRangeCount(); i++) {
        this.selection.getRangeAt(i, start, end)
        for (let j = start.value; j <= end.value; j++) {
          rows.push(this._rows[j])
        }
      }
      return rows
    },
    isContainer (rowIndex) {
      return true
    },
    isContainerEmpty (rowIndex) {
      const children = this._rows[rowIndex].item.children
      return !isArray(children) || !children.length
    },
    isContainerOpen (rowIndex) {
      return this._rows[rowIndex].item.isOpen
    },
    isEditable (rowIndex, column) {
      return column.editable
    },
    isSeparator (rowIndex) {
      return this._rows[rowIndex].item.isSeparator
    },
    isSorted () {},
    maybeSavePref (force = false) {
      if (!force && !$('prefwindow').instantApply) return
      const items = this._items[0].children
      setPref(this._prefName, JSON.stringify(items))
    },
    pasteItems () {
      const copyItems = JSON.parse(getClipboardString())
      if (!copyItems) return
      copyItems.forEach(this._clearItemClickSenders)
      const selectedRows = this.getSelectedRows()
      const currentRow = selectedRows.length
        ? selectedRows[selectedRows.length - 1]
        : this._rows[0]
      const currentRowIndex = this._rows.indexOf(currentRow)
      currentRow.item.children = currentRow.item.children || []
      currentRow.item.children.push(...copyItems)
      const newRows = this._newRowsFromItems(copyItems, currentRow.level + 1)
      const visibleRowCount = this._countVisibleRowsForRow(currentRowIndex)
      const insertIndex = currentRowIndex + visibleRowCount
      this._rows.splice(insertIndex, 0, ...newRows)
      this._tree.rowCountChanged(insertIndex, newRows.length)
      this.selection.rangedSelect(insertIndex, insertIndex + newRows.length - 1, false)
      this.maybeSavePref()
    },
    performAction (action) {
      // if (action === 'delete') {}
    },
    selectionChanged (event) {},
    setCellValue (rowIndex, column, value) {
      if (rowIndex === 0) return
      const item = this._rows[rowIndex].item
      if (item.isSeparator) return
      if (column.id === 'isClickSender') {
        this._items.forEach(this._clearItemClickSenders)
        item.isClickSender = true
      } else if (column.id === 'isIconRow') {
        if (value === 'true') {
          item.isIconRow = true
        } else {
          delete item.isIconRow
        }
      }
      this._tree.invalidateCell(rowIndex, column)
      $('#playerTree').view = this
      this.maybeSavePref()
    },
    setItems (items) {
      this._items = items
      this._rows = this._newRowsFromItems(items)
      $('#playerTree').view = playerView
    },
    setRowItem (rowIndex, item) {
      const rowItem = this._rows[rowIndex].item
      Object.keys(rowItem).forEach(key => {
        if (key !== 'children') delete rowItem[key]
      })
      Object.assign(rowItem, item)
      this._tree.invalidateRow(rowIndex)
      this.maybeSavePref()
    },
    setTree (tree) {
      this._tree = tree
    },
    startDrag (event) {
      this._draggedRows = this.getSelectedRows()
      const json = JSON.stringify(this.getSelectedItems())
      event.dataTransfer.setData('text/plain', json)
      event.dataTransfer.effectAllowed = 'copyMove'
      event.stopPropagation()
    },
    toggleOpenState (rowIndex) {
      const row = this._rows[rowIndex]
      const item = row.item
      item.isOpen = !item.isOpen
      if (item.isOpen) {
        const newRows = this._newRowsFromItems(row.item.children, row.level + 1)
        this._rows.splice(rowIndex + 1, 0, ...newRows)
        this._tree.rowCountChanged(rowIndex + 1, newRows.length)
      } else {
        let deleteCount = 0
        for (let i = rowIndex + 1; i < this._rows.length; ++i) {
          if (this._rows[i].level <= row.level) break
          deleteCount++
        }
        if (deleteCount) {
          this._rows.splice(rowIndex + 1, deleteCount)
          this._tree.rowCountChanged(rowIndex + 1, -deleteCount)
        }
      }
      this._tree.invalidateRow(rowIndex)
      this.maybeSavePref()
    }
  }

  Object.assign(global, {
    playerView,
    $,
    $$,
    init,
    accept,
    importPrefs,
    exportPrefs,
    resetPrefs,
    onSubPrefsHeadClick,
    onSubPrefsHeadSelect,
    addPlayer,
    addSeparator
  })

  Object.assign(window, {
    setCurrentPlayerData,
    addPlayerFromData
  })

  function $ (selector, element = document) {
    return element.querySelector(selector)
  }

  function $$ (selector, element = document) {
    return [...element.querySelectorAll(selector)]
  }

  function accept () {
    playerView.maybeSavePref(true)
  }

  function addPlayer () {
    $('prefwindow').openSubDialog(EDIT_XUL, '', {
      icon: PLAYER_16,
      isNew: true
    }).focus()
  }

  function addPlayerFromData (data) {
    playerView.addItem(data)
  }

  function addSeparator () {
    playerView.addItem({ isSeparator: true })
  }

  function exportPrefs () {
    const fp = IFilePicker(window, 'YT2P', Ci.nsIFilePicker.modeSave)
    fp.defaultExtension = 'ini'
    fp.defaultString = `YT2P-${(new Date()).toLocaleFormat('%Y-%m-%d-%H%M%S')}.ini`
    fp.appendFilters(Ci.nsIFilePicker.filterAll)
    if (fp.show() === Ci.nsIFilePicker.returnCancel) return
    if (fp.file.exists()) fp.file.remove(true)
    fp.file.create(Ci.nsIFile.NORMAL_FILE_TYPE, parseInt('0666', 8))
    const stream = IFileOutputStream(fp.file, 0x02, 0x200, null)
    const converter = IScriptableUnicodeConverter()
    converter.charset = 'UTF-8'
    const names = prefBranch.getChildList('').sort()
    const lines = names.map(name => `${name}=${getPref(name)}`)
    const iniString = `[YT2P]\n${lines.join('\n')}\n`
    const iniText = converter.ConvertFromUnicode(iniString)
    stream.write(iniText, iniText.length)
    stream.close()
  }

  function getClipboardString () {
    const trans = Cc['@mozilla.org/widget/transferable;1']
      .createInstance(Ci.nsITransferable)
    trans.init()
    trans.addDataFlavor('text/unicode')
    Services.clipboard.getData(trans, Services.clipboard.kGlobalClipboard)
    let string = {}
    trans.getTransferData('text/unicode', string, {})
    return string.value.QueryInterface(Ci.nsISupportsString).data
  }

  function getPref (name) {
    try {
      switch (prefBranch.getPrefType(name)) {
        case 32: return prefBranch.getCharPref(name)
        case 64: return prefBranch.getIntPref(name)
        case 128: return prefBranch.getBoolPref(name)
      }
    } catch (e) { Cu.reportError(e) }
  }

  function importPrefs () {
    const fp = IFilePicker(window, 'YT2P', Ci.nsIFilePicker.modeOpen)
    fp.defaultExtension = 'ini'
    fp.appendFilters(Ci.nsIFilePicker.filterAll)
    if (fp.show() === Ci.nsIFilePicker.returnCancel) return
    const stream = IFileInputStream(fp.file, 0x01, parseInt('0444', 8), null)
    const streamIO = IScriptableInputStream(stream)
    const iniText = streamIO.read(stream.available())
    streamIO.close()
    stream.close()
    const converter = IScriptableUnicodeConverter()
    converter.charset = 'UTF-8'
    const iniString = converter.ConvertToUnicode(iniText)
    iniString.split('\n')
      .map(line => line.match(/^(.*?)=(.*)$/))
      .filter(matches => matches && matches.length === 3)
      .forEach(matches => setPref(matches[1], matches[2]))
    loadFromPrefs()
  }

  function init () {
    const extraButton = document.documentElement.getButton('extra1')
    if (extraButton) {
      extraButton.setAttribute('type', 'menu')
      extraButton.appendChild($('#optionsMenuPopup'))
    }
    loadFromPrefs()
  }

  function loadFromPrefs () {
    playerView.setItems([
      {
        name: $('#playerTree').getAttribute('_allPlayers'),
        icon: LOGO_16,
        children: JSON.parse(getPref('players') || '[]'),
        isOpen: true
      }
    ])
    updateDisabledState()
  }

  function onSubPrefsHeadClick (event) {
    if (event.button !== 0) return
    const head = event.target
    const enabled = head.getAttribute('checked') || head.getAttribute('selected')
    $$('*', head.nextElementSibling).forEach(e => (e.disabled = enabled))
  }

  function onSubPrefsHeadSelect (event) {
    $$(':scope > radio + .subprefs', event.target).forEach(sp => {
      const head = sp.previousElementSibling
      const enabled = head.getAttribute('checked') || head.getAttribute('selected')
      $$('*', sp).forEach(e => (e.disabled = !enabled))
    })
  }

  function resetPrefs () {
    const names = prefBranch.getChildList('')
    names.forEach(name => prefBranch.clearUserPref(name))
    loadFromPrefs()
  }

  function setClipboardString (string) {
    Cc['@mozilla.org/widget/clipboardhelper;1']
      .getService(Ci.nsIClipboardHelper)
      .copyString(string)
  }

  function setCurrentPlayerData (data) {
    playerView.setRowItem($('#playerTree').currentIndex, data)
  }

  function setPref (name, value) {
    try {
      switch (prefBranch.getPrefType(name)) {
        case 32: prefBranch.setCharPref(name, value); break
        case 64: prefBranch.setIntPref(name, typeof value === 'string' ? parseInt(value) : value); break
        case 128: prefBranch.setBoolPref(name, typeof value === 'string' ? value === 'true' : value); break
      }
    } catch (e) { Cu.reportError(e) }
  }

  function updateDisabledState () {
    $$('.subprefs').forEach(sp => $$('*', sp).forEach(e => (e.disabled = false)))
    $$('.subprefs').forEach(sp => {
      const head = sp.previousElementSibling
      if (head.getAttribute('checked') || head.getAttribute('selected')) return
      $$('*', sp).forEach(e => (e.disabled = true))
    })
  }
})(this)
