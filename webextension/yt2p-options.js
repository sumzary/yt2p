/*
 * YouTube 2 Player - Watch videos in an external player.
 *
 * Copyright 2016-2017 Rasmus Riiner <rasmus.riiner@mail.ee>
 *
 * Distributed under the MIT/X11 License. See LICENSE.md for more details.
 */

/* global browser */

'use strict'

localize()

const $groups = document.getElementById('groups')
const $players = document.getElementById('players')

let aS // active <select>
let aO // active <option>
let aI // active <input>

let acPort = null
let canBrowseNatively = false

window.setInterval(pingNativeClient, 500)

initElements()
loadPrefs()
setData({})

function initElements () {
  $('#downloadNative').onclick = onDownloadNativeClick
  $groups.onkeydown = onPlayerGroupsSelectKeyDown
  $players.onkeydown = onPlayerGroupsSelectKeyDown
  $groups.onchange = onGroupsSelectChange
  $players.onchange = onPlayersSelectChange
  $groups.onfocus = onPlayerGroupsSelectFocus
  $players.onfocus = onPlayerGroupsSelectFocus
  $('#new').onclick = doNew
  $('#newSeparator').onclick = doNewSeparator
  $('#moveUp').onclick = doMoveUp
  $('#moveDown').onclick = doMoveDown
  $('#delete').onclick = doDelete
  $('#name').onchange = onNameChange
  $('#icon').onchange = onIconChange
  $('#iconFile').onchange = onIconFileChange
  $('#iconBrowse').onclick = onIconBrowseClick
  $('#toggleClipboard').onclick = onToggleClipboardClick
  $('#clipboard').onchange = onClipboardChange
  // $('#command').onclick = onCommandInput
  $('#command').onfocus = onCommandFocus
  $('#command').oninput = onCommandInput
  $('#command').addEventListener(
    'awesomplete-select', onCommandAwesompleteSelect)
  $('#command').onchange = onCommandChange
  $('#commandBrowse').onclick = onCommandBrowseClick
  $('#name').addEventListener('change', savePrefs)
  $('#icon').addEventListener('change', savePrefs)
  $('#clipboard').addEventListener('change', savePrefs)
  $('#command').addEventListener('change', savePrefs)
  $('#clickCommand').onfocus = onCommandFocus
  $('#clickCommand').oninput = onCommandInput
  $('#clickCommand').addEventListener('input', onClickCommandInput)
  $('#clickCommand').addEventListener(
    'awesomplete-select', onCommandAwesompleteSelect)
  $('#clickCommandBrowse').onclick = onCommandBrowseClick
  $('#clickPlayers').onchange = onClickPlayersChange
  $('#clickCommand').addEventListener('change', savePrefs)
  $('#clickPlayers').addEventListener('change', savePrefs)
  $('#command').yt2pAwesomplete = new window.Awesomplete($('#command'), {
    autoFirst: true,
    maxItems: 20,
    minChars: 1,
    filter: commandAwesompleteFilter,
    data: commandAwesompleteData
  })
  $('#command').yt2pAwesomplete.yt2pInput = $('#command')
  $('#clickCommand').yt2pAwesomplete = new window.Awesomplete($('#clickCommand'), {
    autoFirst: true,
    maxItems: 15,
    minChars: 1,
    filter: commandAwesompleteFilter,
    data: commandAwesompleteData
  })
  $('#clickCommand').yt2pAwesomplete.yt2pInput = $('#clickCommand')
}

function commandAwesompleteData (item, input) {
  return item.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function commandAwesompleteFilter (text, input) {
  let value = text.value
  if (value.startsWith('"') || value.startsWith("'")) {
    value = value.substring(1)
  } else if (value.startsWith('--')) {
    value = value.substring(2)
  }
  const before = input.substring(0, this.input.selectionEnd)
  let matches = before.match(/^([^\s]*)["']?$/)
  if (!matches) matches = before.match(/^["']([^"']*)["']?$/)
  if (!matches) matches = before.match(/\s-*([^\s]*)["']?$/)
  if (!matches) matches = before.match(/\s["']-*([^"']*)$/)
  if (!matches) return false
  return window.Awesomplete.FILTER_STARTSWITH(value, matches[1])
}

function onPlayerGroupsSelectKeyDown (event) {
  if (event.keyCode === 46) doDelete()
}

function doNew () {
  if (!aS) aS = $groups
  let option
  if (aS === $groups) {
    option = newOption({
      name: '',
      icon: browser.extension.getURL('icons/16/yt2p.png'),
      players: []
    })
  } else {
    option = newOption({
      name: '',
      icon: browser.extension.getURL('icons/16/player.png'),
      command: '',
      clipboard: ''
    })
  }
  aS.insertBefore(option, aO ? aO.nextElementSibling : null)
  aS.selectedIndex = option.index
  aS.onchange()
  savePrefs()
  $('#name').focus()
}

function doNewSeparator () {
  const option = newOption({ isSeparator: true })
  aS.insertBefore(option, aO ? aO.nextElementSibling : null)
  aS.selectedIndex = option.index
  aS.onchange()
  savePrefs()
}

function doMoveUp () {
  for (const option of aS.selectedOptions) {
    const previous = option.previousElementSibling
    if (!previous) continue
    if (previous.selected) continue
    aS.insertBefore(option, previous)
  }
  savePrefs()
}

function doMoveDown () {
  for (const option of [...aS.selectedOptions].reverse()) {
    const next = option.nextElementSibling
    if (next && next.selected) continue
    aS.insertBefore(option, next ? next.nextElementSibling : null)
  }
  savePrefs()
}

function doDelete () {
  if (aS.selectedIndex === -1) return
  const next = aO.nextElementSibling
  for (const option of [...aS.selectedOptions]) {
    aS.removeChild(option)
  }
  aS.selectedIndex = next && next.index ? next.index : aS.length - 1
  aS.onchange()
  savePrefs()
}

function newOption (data) {
  const option = document.createElement('option')
  option.text = data.name || (data.isSeparator
    ? '————————'
    : browser.i18n.getMessage('unnamedOption'))
  option.data = data
  return option
}

function onClickPlayersChange (event) {
  const select = event.target
  const option = select.options[select.selectedIndex]
  $('#clickCommand').value = option.yt2pCommand || ''
  $('#clickCommand').dispatchEvent(new window.Event('change'))
  $('#clickCommand').focus()
}

function onClickCommandInput (event) {
  $('#clickPlayers').selectedIndex = 0
}

function loadPrefs () {
  browser.storage.local.get().then(storage => {
    for (const group of storage.playerGroups) {
      $groups.appendChild(newOption(group))
    }
    for (const element of $$('.pref')) {
      const value = storage[element.name]
      if (element.type === 'checkbox') {
        element.checked = value
        const subprefs = element.parentElement.nextElementSibling
        if (subprefs.classList.contains('subprefs')) {
          for (const e of $$('.pref', subprefs)) e.disabled = !value
        }
      } else if (element.type === 'radio') {
        element.checked = value === element.value
      } else {
        element.value = value
      }
      element.addEventListener('change', onPrefInputChange)
    }
    const customOption = document.createElement('option')
    customOption.text = browser.i18n.getMessage('custom')
    // customOption.style.display = 'none'
    $('#clickPlayers').appendChild(customOption)
    for (const group of storage.playerGroups) {
      const optgroup = document.createElement('optgroup')
      optgroup.disabled = group.isSeparator
      optgroup.label = group.name || (group.isSeparator
        ? '————————'
        : browser.i18n.getMessage('unnamedOption'))
      for (const player of group.players || []) {
        const option = document.createElement('option')
        option.disabled = player.isSeparator
        option.yt2pCommand = player.command
        option.text = player.name || (player.isSeparator
          ? '————————'
          : browser.i18n.getMessage('unnamedOption'))
        optgroup.appendChild(option)
      }
      $('#clickPlayers').appendChild(optgroup)
    }
  })
}

function savePrefs () {
  if ($groups.selectedOptions.length === 1) {
    const group = $groups.options[$groups.selectedIndex].data
    if (!group.isSeparator) {
      group.players = [...$players.options].map(option => option.data)
    }
  }
  const storage = {
    playerGroups: [...$groups.options].map(option => option.data)
  }
  browser.storage.local.set(storage)
}

function setData (data) {
  $players.disabled = aS === $groups && data.isSeparator
  for (const input of $$('#datainputs input')) {
    input.disabled = false
  }
  $('#name').value = data.name || ''
  $('#image').src = data.icon || ''
  $('#icon').value = data.icon || ''
  $('#command').value = data.command || ''
  $('#clipboard').value = data.clipboard || ''
  for (const input of $$('#datainputs input')) {
    input.disabled = data.isSeparator
      ? true
      : typeof data[input.name] === 'undefined'
  }
}

function onIconFileChange (event) {
  if (!this.files || !this.files[0]) return
  const reader = new window.FileReader()
  reader.onload = (event) => {
    $('#icon').value = $('#image').src = aO.data.icon = event.target.result
    savePrefs()
  }
  reader.readAsDataURL(this.files[0])
}

function onIconBrowseClick (event) {
  if (!canBrowseNatively) {
    return $('#iconFile').click()
  }
  browser.runtime.sendNativeMessage('ee.sumzary.yt2p', {
    type: 'browseicon',
    title: browser.i18n.getMessage('selectIcon'),
    large: $('#icmis').value > 16
  }).then(response => {
    if (!response && response !== false/**/) {
      canBrowseNatively = false
      return $('#iconFile').click()
    }
    $('#icon').value = $('#image').src = aO.data.icon = response
    savePrefs()
  })
}

function onCommandBrowseClick (event) {
  const textInput = document.getElementById(event.target.name)
  browser.runtime.sendNativeMessage('ee.sumzary.yt2p', {
    type: 'browseexe',
    title: browser.i18n.getMessage('selectApplication')
  }).then(response => {
    if (typeof response !== 'string') return
    if (response.includes(' ')) response = `"${response}"`
    textInput.value = response// + ' LINKURL'
    savePrefs()
  })
}

function onToggleClipboardClick (event) {
  $('#toggleClipboard').textContent =
    $('#clipboardBox').classList.toggle('none') ? '↓' : '↑'
  return false
}

function onPlayerGroupsSelectFocus (event) {
  aS = this
  aO = aS.options[aS.selectedIndex]
}

function onNameChange (event) {
  const value = this.value || browser.i18n.getMessage('unnamedOption')
  aO.data.name = aO.text = value
}
function onIconChange (event) {
  $('#image').src = aO.data.icon = this.value
}
function onClipboardChange (event) {
  aO.data.clipboard = this.value
}

function splitArguments (string, separator = /\s/g, keepQuotes = false) {
  let singleQuoteOpen = false
  let doubleQuoteOpen = false
  let tokenBuffer = []
  const args = []
  for (const element of string.split('')) {
    const matches = element.match(separator)
    if (element === "'" && !doubleQuoteOpen) {
      if (keepQuotes) tokenBuffer.push(element)
      singleQuoteOpen = !singleQuoteOpen
      continue
    } else if (element === '"' && !singleQuoteOpen) {
      if (keepQuotes) tokenBuffer.push(element)
      doubleQuoteOpen = !doubleQuoteOpen
      continue
    }
    if (!singleQuoteOpen && !doubleQuoteOpen && matches) {
      if (tokenBuffer.length > 0) {
        args.push(tokenBuffer.join(''))
        tokenBuffer = []
      } else if (separator) {
        args.push(element)
      }
    } else {
      tokenBuffer.push(element)
    }
  }
  if (tokenBuffer.length > 0) {
    args.push(tokenBuffer.join(''))
  } else if (separator) {
    args.push('')
  }
  return args
}

function updateCommandInputAutoComplete () {
  const args = splitArguments(aI.value, /\s/g, true)
  if (!aI.yt2pIsInOptions &&
      args[0] && aI.selectionEnd > args[0].length) {
    const matches = args[0].match(/[\\/]?([^\\/"']+)(?:\.exe)?["']?$/)
    if (!matches) return
    const options = window.yt2pPlayerOptions[matches[1]]
    if (!options) return
    aI.yt2pAwesomplete.list = options
    delete aI.yt2pDir
    aI.yt2pIsInOptions = true
  } else if (aI.yt2pIsInOptions &&
      args[0] && aI.selectionEnd <= args[0].length) {
    aI.yt2pIsInOptions = false
  }
  if (!aI.yt2pIsInOptions) {
    const matches = aI.value.match(/^["']?(.*[\\/])/)
    const path = matches ? matches[1] : ''
    if (path === aI.yt2pDir) return
    acPort.postMessage({ port: true, type: 'exeautocomplete', path })
    aI.yt2pDir = path
  }
}

function onAutoCompleteMessage (response) {
  if (!(response instanceof Array)) {
    aI.yt2pAwesomplete.list = []
    return
  }
  aI.yt2pAwesomplete.list = response
  if (response[0] !== aI.value) {
    aI.yt2pAwesomplete.open()
  }
}

function onCommandFocus (event) {
  aI = event.target
  updateCommandInputAutoComplete()
}

function onCommandInput (event) {
  updateCommandInputAutoComplete()
}

function onCommandChange (event) {
  // if (this.value.indexOf('$') < 0) this.value += ' LINKURL'
  aO.data.command = this.value
}

function onCommandAwesompleteSelect (event) {
  event.preventDefault()
  let text = event.text
  const path = splitArguments(aI.value, /\s/g, true)[0] || ''
  if (aI.selectionEnd <= path.length) {
    let after = aI.value.substring(aI.selectionEnd)
    let matches = after.match(/^["']*(.*)/)
    if (matches) after = matches[1]
    if (text.includes(' ')) {
      aI.value = '"' + text + '"' + after
      const index = text.length + 1
      aI.setSelectionRange(index, index)
    } else {
      aI.value = text + after
    }
    if (!text.endsWith('/') && !text.endsWith('\\')) {
      aI.yt2pAwesomplete.close()
    }
  } else {
    text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    const before = aI.value.substring(0, aI.selectionEnd)
    const after = aI.value.substring(aI.selectionEnd)
    let matches = before.match(/(.*\s)[\w-]*$/)
    if (!matches) return
    const firstHalf = matches[1] + text
    aI.value = firstHalf + after
    matches = text.match(/(<.*>)["']?$/)
    if (matches) {
      const index = firstHalf.lastIndexOf(matches[1])
      aI.setSelectionRange(index, index + matches[1].length)
    } else {
      const index = firstHalf.length
      aI.setSelectionRange(index, index)
    }
    aI.yt2pAwesomplete.close()
  }
  updateCommandInputAutoComplete()
}

function onGroupsSelectChange (event) {
  while ($players.firstChild) $players.removeChild($players.firstChild)
  $('#moveUp').disabled = this.selectedOptions.length === 0
  $('#moveDown').disabled = this.selectedOptions.length === 0
  $('#delete').disabled = this.selectedOptions.length === 0
  if (this.selectedOptions.length !== 1) return setData({})
  aO = this.options[this.selectedIndex]
  if (aO.data.players) {
    for (const player of aO.data.players) {
      $players.appendChild(newOption(player))
    }
  }
  setData(aO.data)
}

function onPlayersSelectChange (event) {
  if (this.selectedOptions.length !== 1) {
    if (this.selectedOptions.length === 0) {
      aO = $groups.options[$groups.selectedIndex]
      setData(aO.data)
      return
    }
    setData({})
    return
  }
  aO = this.options[this.selectedIndex]
  setData(aO.data)
}

function $ (selector, element = document) {
  return element.querySelector(selector)
}

function $$ (selector, element = document) {
  return [...element.querySelectorAll(selector)]
}

function onDownloadNativeClick (event) {
  browser.tabs.create({
    url: 'https://github.com/Sumzary/yt2p-native/releases/latest',
    active: true
  })
  return false
}

function onPrefInputChange (event) {
  const input = event.target
  let value
  if (input.tagName === 'SELECT') {
    value = input.options[input.selectedIndex].value
  } else if (input.type === 'checkbox') {
    value = input.checked
    updatePrefsDisabledState()
  } else if (input.type === 'radio') {
    value = $(`input[name="${input.name}"]:checked`).value
    updatePrefsDisabledState()
  } else {
    value = input.value
  }
  browser.storage.local.set({ [input.name]: value })
}

function updatePrefsDisabledState () {
  for (const e of $$('.subprefs :disabled')) e.disabled = false
  for (const subprefs of $$('.subprefs')) {
    if (subprefs.previousElementSibling.firstElementChild.checked) continue
    for (const e of $$('*', subprefs)) e.disabled = true
  }
}

function localize (element = document.documentElement) {
  element.innerHTML = element.innerHTML.toString()
    .replace(/__MSG_(\w+)__/g, (_, m) => browser.i18n.getMessage(m))
}

function pingNativeClient () {
  browser.runtime.sendNativeMessage('ee.sumzary.yt2p', {
    type: 'ping'
  }).then(response => {
    if (acPort) return
    acPort = browser.runtime.connectNative('ee.sumzary.yt2p')
    acPort.onMessage.addListener(onAutoCompleteMessage)
    browser.runtime.sendNativeMessage('ee.sumzary.yt2p', {
      type: 'canbrowse'
    }).then(bool => {
      if (!bool) return
      $('#commandBrowse').classList.remove('none')
      $('#clickCommandBrowse').classList.remove('none')
      canBrowseNatively = true
    })
    $('#nativeWarning').classList.add('none')
  }).catch(() => {
    $('#nativeWarning').classList.remove('none')
    $('#commandBrowse').classList.add('none')
    $('#clickCommandBrowse').classList.add('none')
    canBrowseNatively = false
    acPort = null
  })
}
