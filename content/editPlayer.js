/*
 * YouTube 2 Player - Watch videos in an external player.
 *
 * Copyright 2016-2017 Rasmus Riiner <rasmus.riiner@mail.ee>
 *
 * Distributed under the MIT/X11 License. See LICENSE.md for more details.
 */

;(function (global) {
  'use strict'

  const {Constructor: CC, classes: Cc, interfaces: Ci, utils: Cu} = global.Components
  const {Services} = Cu.import('resource://gre/modules/Services.jsm', {})
  const IFilePicker = CC('@mozilla.org/filepicker;1', 'nsIFilePicker', 'init')
  const IFile = CC('@mozilla.org/file/local;1', 'nsIFile', 'initWithPath')

  const WINDOWS = '@mozilla.org/windows-registry-key;1' in Cc
  const OSX = !WINDOWS && 'nsILocalFileMac' in Ci
  const SESSION_TIME = Date.now()
  const STRING_BUNDLE = 'chrome://yt2p/locale/yt2p.properties?' + SESSION_TIME

  const stringBundle = Services.strings.createBundle(STRING_BUNDLE)

  let oldData

  global.init = init
  global.accept = accept
  global.cancel = cancel
  global.browseCommand = browseCommand
  global.browseIcon = browseIcon
  global.onIconChange = onIconChange

  function $ (selector, element = document) {
    return element.querySelector(selector)
  }

  function accept () {
    const data = {}
    if (oldData.isClickSender) data.isClickSender = true
    if ($('#name').value) data.name = $('#name').value
    if ($('#command').value) data.command = $('#command').value
    if ($('#icon').value) data.icon = $('#icon').value
    if ($('#clipboard').value) data.clipboard = $('#clipboard').value
    if (oldData.isNew) {
      window.opener.addPlayerFromData(data)
    } else {
      window.opener.setCurrentPlayerData(data)
    }
  }

  function browseCommand () {
    const fp = new IFilePicker(window, 'YT2P', Ci.nsIFilePicker.modeOpen)
    if (fp.show() !== Ci.nsIFilePicker.returnOK) return
    const file = fp.file.QueryInterface(Ci.nsIFile)
    const path = file.path
    const iconUrl = getFileIconUrl(file)
    if (iconUrl) {
      $('#icon').value = iconUrl
      $('#icon-image').src = iconUrl
    }
    const args = getCommandPatternParams($('#command').value).join(' ') || '$VIDEOURL$'
    $('#command').value = (path.indexOf(' ') >= 0 ? '"' + path + '"' : path) + ' ' + args
    if (!$('#name').value || $('#name').value === getString('sendToPlayer')) {
      const name = file.leafName
      $('#name').value = name.substr(0, name.lastIndexOf('.')) || name
    }
  }

  function browseIcon () {
    const fp = new IFilePicker(window, 'YT2P', Ci.nsIFilePicker.modeOpen)
    if (fp.show() !== Ci.nsIFilePicker.returnOK) return
    const file = fp.file.QueryInterface(Ci.nsIFile)
    const iconUrl = getFileIconUrl(file)
    if (!iconUrl) return
    $('#icon-image').src = iconUrl
    $('#icon').value = iconUrl
  }

  function cancel () {}

  function getCommandPatternParams (pattern) {
    if (!pattern) return []
    const matches = pattern.match(/[^"'\s]+|"[^"]+"|'[^']+'/g)
    if (!matches || !matches[1]) return []
    matches.shift()
    return matches
  }

  function getFileIconUrl (iFile, px = 16) {
    if (WINDOWS || OSX) {
      return 'moz-icon:' + Services.io.newFileURI(iFile).spec + '?size=' + px
    }
    try {
      if (iFile.isSymlink()) iFile = new IFile(iFile.target)
      const leafName = iFile.leafName
      for (let relPath of [
        'browser/chrome/icons/default/default' + px + '.png',
        'chrome/icons/default/default' + px + '.png',
        'product_logo_' + px + '.png'
      ]) {
        let relFile = iFile.parent
        relFile.appendRelativePath(relPath)
        if (relFile.exists()) return Services.io.newFileURI(relFile).spec
      }
      for (let absPath of [
        '/usr/share/icons/Paper/' + px + 'x' + px + '/apps/' + leafName + '.png',
        '/usr/share/icons/Numix-Circle/48/apps/' + leafName + '.svg',
        '/usr/share/icons/Moka/' + px + 'x' + px + '/apps/' + leafName + '.png',
        '/usr/share/icons/Dalisha/' + px + 'x' + px + '/apps/' + leafName + '.png',
        '/usr/share/icons/Shadow/' + px + 'x' + px + '/apps/' + leafName + '.svg',
        '/usr/share/icons/Uniform+/apps/scalable/' + leafName + '.svg',
        '/usr/share/icons/Square-Light/' + px + 'x' + px + '/apps/' + leafName + '.svg',
        '/usr/share/icons/Vivacious/apps/scalable/' + leafName + '.svg',
        '/usr/share/icons/default.kde4/' + px + 'x' + px + '/apps/' + leafName + '.png',
        '/usr/share/icons/hicolor/' + px + 'x' + px + '/apps/' + leafName + '.png'
      ]) {
        let absFile = new IFile(absPath)
        if (absFile.exists()) return Services.io.newFileURI(absFile).spec
      }
    } catch (e) {}
    return Services.io.newFileURI(iFile).spec
  }

  function getString (name, nameMatched) {
    name = nameMatched || name || 'nil'
    try {
      return stringBundle.GetStringFromName(name)
    } catch (e) { Cu.reportError(e) }
    return '__' + name + '__'
  }

  function init ([data]) {
    $('#name').value = data.name || ''
    $('#command').value = data.command || ''
    $('#icon').value = data.icon || ''
    $('#icon-image').src = data.icon || ''
    $('#clipboard').value = data.clipboard || ''
    oldData = data
  }

  function onIconChange (event) {
    $('#icon-image').src = event.target.value
  }
})(this)
