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
  Services.ss = Cc['@mozilla.org/content/style-sheet-service;1'].getService(Ci.nsIStyleSheetService)
  const IFile = CC('@mozilla.org/file/local;1', 'nsIFile', 'initWithPath')
  const IProcess = CC('@mozilla.org/process/util;1', 'nsIProcess', 'init')

  const SESSION_TIME = Date.now()
  const THUNDERBIRD = Services.appinfo.name === 'Thunderbird'
  const TOOLS_MENUPOPUP = THUNDERBIRD ? '#taskPopup' : '#menu_ToolsPopup'
  const CONTEXT_MENUPOPUP = THUNDERBIRD ? '#mailContext' : '#contentAreaContextMenu'
  const INSERT_BEFORE_CONTEXT_MENUITEM = THUNDERBIRD ? '#mailContext-openLinkInBrowser' : '#context-navigation'
  const PLACES_MENUPOPUP = '#placesContext'
  const INSERT_BEFORE_PLACES_MENUITEM = '#placesContext_recentlyBookmarkedSeparator'
  const LOGO_16 = 'chrome://yt2p/skin/16/yt2p.png'
  const PLAYER_16 = 'chrome://yt2p/skin/16/player.png'
  const PREF_BRANCH = 'extensions.yt2p.'
  // const STRING_BUNDLE = `chrome://yt2p/locale/yt2p.properties?${SESSION_TIME}`
  const FRAME_JS = `chrome://yt2p/content/yt2pFrameScript.js?${SESSION_TIME}`
  const YT2P_CSS = `chrome://yt2p/skin/yt2p.css?${SESSION_TIME}`
  const YT2P_CSS_URI = Services.io.newURI(YT2P_CSS, null, null)

  const prefBranch = Services.prefs.getBranch(PREF_BRANCH)
  // const stringBundle = Services.strings.createBundle(STRING_BUNDLE)
  const windowTypes = THUNDERBIRD ? ['mail:3pane', 'mail:messageWindow'] : ['navigator:browser']
  const windowListener = { onOpenWindow: loadIntoXulWindow }

  global.install = install
  global.startup = startup
  global.shutdown = shutdown
  global.uninstall = uninstall

  function $ (selector, element = document) {
    return element.querySelector(selector)
  }

  function $$ (selector, element = document) {
    return [...element.querySelectorAll(selector)]
  }

  function forEachWindow (execute) {
    windowTypes.forEach(type => {
      const xulWindows = Services.wm.getEnumerator(type)
      while (xulWindows.hasMoreElements()) {
        const xulWindow = xulWindows.getNext()
        const window = xulWindow.QueryInterface(Ci.nsIDOMWindow)
        execute(window)
      }
    })
  }

  function getParametersFromString (input, sep, keepQuotes) {
    let separator = sep || /\s/g
    let singleQuoteOpen = false
    let doubleQuoteOpen = false
    let tokenBuffer = []
    let ret = []
    let arr = input.split('')
    for (let i = 0; i < arr.length; ++i) {
      let element = arr[i]
      let matches = element.match(separator)
      if (element === "'" && !doubleQuoteOpen) {
        if (keepQuotes === true) {
          tokenBuffer.push(element)
        }
        singleQuoteOpen = !singleQuoteOpen
        continue
      } else if (element === '"' && !singleQuoteOpen) {
        if (keepQuotes === true) {
          tokenBuffer.push(element)
        }
        doubleQuoteOpen = !doubleQuoteOpen
        continue
      }
      if (!singleQuoteOpen && !doubleQuoteOpen && matches) {
        if (tokenBuffer.length > 0) {
          ret.push(tokenBuffer.join(''))
          tokenBuffer = []
        } else if (sep) {
          ret.push(element)
        }
      } else {
        tokenBuffer.push(element)
      }
    }
    if (tokenBuffer.length > 0) {
      ret.push(tokenBuffer.join(''))
    } else if (sep) {
      ret.push('')
    }
    return ret
  }

  function getPlaylistIdFromUrl (videoUrl) {
    const temp = videoUrl.replace('list=', '$IDSTART$')
    return temp.substr(temp.indexOf('$IDSTART$') + 9, 11)
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

  function getStandardisedVideoUrl (videoUrl) {
    return `https://www.youtube.com/watch?v=${getVideoIdFromUrl(videoUrl)}`
  }

  function getString (name, nameMatched) {
    name = nameMatched || name || 'null'
    try {
      // should probably not create a new string bundle on every string
      return Services.strings
        .createBundle(`chrome://yt2p/locale/yt2p.properties?${Date.now()}`)
        .GetStringFromName(name)
      // return stringBundle.GetStringFromName(name)
    } catch (e) { Cu.reportError(e) }
    return `__${name}__`
  }

  function getStringFromPattern (pattern, videoUrl) {
    return pattern
      .replace('$VIDEOURL$', getStandardisedVideoUrl(videoUrl))
      .replace('$VIDEOID$', getVideoIdFromUrl(videoUrl))
      .replace('$PLAYLISTID$', getPlaylistIdFromUrl(videoUrl))
  }

  function getVideoIdFromUrl (videoUrl) {
    const temp = videoUrl.replace(/v=|v%3D|youtu.be\/|\/v\/|\/embed\/|img.youtube.com\/vi\/|attribution_link=/ig, '$IDSTART$')
    return temp.substr(temp.indexOf('$IDSTART$') + 9, 11)
  }

  function install (data, reason) {}

  function isVideoUrl (url) {
    return /^(?:(?:(?:view-source?:)?https?:)?\/\/)?(?:(?:www\.|m\.)?(?:youtube|youtube-nocookie)\.com\/(?:watch\?|embed\/|v\/|attribution_link\?a)|youtu\.be\/|\/watch\?)/.test(url)
  }

  function loadContextMenuItemsIntoWindow (window) {
    const document = window.document
    const popup = $(CONTEXT_MENUPOPUP, document)
    if (!popup) return
    const insertBeforeItem = $(INSERT_BEFORE_CONTEXT_MENUITEM, document)
    const players = JSON.parse(getPref('players') || '[]')
    const items = players.map(data => newPlayerMenuItem(window, data))
    items.forEach(item => popup.insertBefore(item, insertBeforeItem))
    popup.addEventListener('popupshowing', onMenuPopupShowing)
  }

  function loadDefaultPrefs () {
    const defaults = Services.prefs.getDefaultBranch(PREF_BRANCH)
    defaults.setCharPref('players', JSON.stringify([
      {
        name: getString('sendToPlayer'),
        icon: PLAYER_16,
        isClickSender: true
      },
      {
        isSeparator: true
      }
    ]))
    defaults.setBoolPref('toolsMenuItemsEnabled', true)
    defaults.setBoolPref('placesMenuItemsEnabled', true)
    defaults.setBoolPref('contextMenuItemsEnabled', true)
    defaults.setBoolPref('contextMenuIconRowMarginChangeEnabled', true)
    defaults.setIntPref('contextMenuIconRowVerticalMargin', 4)
    defaults.setIntPref('contextMenuIconRowHorizontalMargin', 4)
    defaults.setBoolPref('embeddedVideoChangeEnabled', true)
    defaults.setIntPref('embeddedVideoChangeType', 2)
    defaults.setBoolPref('videoLinkChangeEnabled', true)
    defaults.setIntPref('videoLinkChangeType', 0)
    defaults.setBoolPref('videoLinkClickChangeEnabled', true)
    defaults.setIntPref('videoLinkClickChangeType', 0)
    defaults.setBoolPref('filClickChangeEnabled', true)
    defaults.setIntPref('filClickChangeType', 0)
  }

  function loadIntoWindow (window) {
    if (getPref('toolsMenuItemsEnabled')) loadToolsMenuItemsIntoWindow(window)
    if (getPref('placesMenuItemsEnabled')) loadPlacesMenuItemsIntoWindow(window)
    if (getPref('contextMenuItemsEnabled')) loadContextMenuItemsIntoWindow(window)
    window.messageManager.loadFrameScript(FRAME_JS, true)
    // if (THUNDERBIRD) loadIntoThunderbirdWindow(window)
  }

  // function loadIntoThunderbirdWindow (window) {
  //   if (!getPref('embeddedVideoChangeEnabled')) return
  //   const mail3View = Services.wm.getMostRecentWindow(windowTypes[0])
  //   mail3View.setTimeout(() => {
  //     console.log(window.GetLoadedMessage())
  //     console.log(mail3View.GetLoadedMessage())
  //     if (!mail3View.gDBView) return
  //     const header = mail3View.gDBView.hdrForFirstSelectedMessage
  //     if (!header) return
  //     if (!(header.folder.server instanceof Ci.nsIRssIncomingServer)) return
  //     const messenger = Cc['@mozilla.org/messenger;1'].createInstance(Ci.nsIMessenger)
  //     const uri = header.folder.getUriForMsg(header)
  //     messenger.messageServiceFromURI(uri).streamHeaders(uri, {
  //       stream: null,
  //       data: '',
  //       QueryInterface: XPCOMUtils.generateQI([
  //         Ci.nsIStreamListener,
  //         Ci.nsIRequestObserver
  //       ]),
  //       onStartRequest (request, context) {},
  //       onStopRequest (request, context, statusCode) {
  //         const matches = this.data.match(/Content-Base:\s(.*?)\r?\n/i)
  //         const videoUrl = matches[1]
  //         if (!videoUrl) return
  //         if (!isVideoUrl(videoUrl)) return
  //         window.messageManager.sendAsyncMessage('yt2p-replaceAllWith', videoUrl)
  //       },
  //       onDataAvailable (request, context, inputStream, offset, count) {
  //         if (this.stream === null) {
  //           this.stream = Cc['@mozilla.org/scriptableinputstream;1'].createInstance(Ci.nsIScriptableInputStream)
  //           this.stream.init(inputStream)
  //         }
  //         this.data += this.stream.read(count)
  //       }
  //     }, null, true)
  //   }, 5000)
  //   // msgHdr.getStringProperty('content-base')
  // }

  function loadIntoXulWindow (xulWindow) {
    const window = xulWindow
      .QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindow)
    if (window.document.readyState === 'complete') {
      onLoad()
    } else {
      window.addEventListener('load', onLoad)
    }
    function onLoad (event) {
      window.removeEventListener('load', onLoad)
      const html = window.document.documentElement
      if (!windowTypes.includes(html.getAttribute('windowtype'))) return
      loadIntoWindow(window)
    }
  }

  function loadPlacesMenuItemsIntoWindow (window) {
    const document = window.document
    const popup = $(PLACES_MENUPOPUP, document)
    if (!popup) return
    const insertBeforeItem = $(INSERT_BEFORE_PLACES_MENUITEM, document)
    const players = JSON.parse(getPref('players') || '[]')
    const items = players.map(data => newPlayerMenuItem(window, data))
    items.forEach(item => popup.insertBefore(item, insertBeforeItem))
    popup.addEventListener('popupshowing', onMenuPopupShowing)
  }

  function loadToolsMenuItemsIntoWindow (window) {
    const document = window.document
    const popup = $(TOOLS_MENUPOPUP, document)
    if (!popup) return
    const menuitem = document.createElement('menuitem')
    menuitem.className = 'yt2p-menuitem menuitem-iconic'
    menuitem.setAttribute('label', getString('toolsMenuItemLabel'))
    menuitem.setAttribute('image', LOGO_16)
    menuitem.addEventListener('command', openOptions)
    const separators = $$(`${TOOLS_MENUPOPUP} > menuseparator`, document)
    popup.insertBefore(menuitem, separators[1])
  }

  function newPlayerMenuItem (window, data, isIcon = false) {
    const document = window.document
    if (data.isSeparator) {
      const separator = isIcon
        ? document.createElement('toolbarseparator')
        : document.createElement('menuseparator')
      separator.className = 'yt2p-separator'
      return separator
    }
    if (data.isIconRow && !isIcon) {
      const group = document.createElement('menugroup')
      group.className = 'yt2p-menugroup'
      const players = flatten(data.children)
      const items = players.map(data => newPlayerMenuItem(window, data, true))
      items.forEach(item => group.appendChild(item))
      return group
    }
    const isMenu = data.children && data.children.length && !isIcon
    const item = isMenu
      ? document.createElement('menu')
      : document.createElement('menuitem')
    item.className = isMenu ? 'yt2p-menu' : 'yt2p-menuitem'
    item.setAttribute(isIcon ? 'tooltiptext' : 'label', data.name || '')
    if (data.icon) {
      item.classList.add(isMenu ? 'menu-iconic' : 'menuitem-iconic')
      item.setAttribute('image', data.icon)
    }
    item.setAttribute('data-command', data.command || '')
    item.setAttribute('data-clipboard', data.clipboard || '')
    item.addEventListener(isMenu ? 'mouseup' : 'command', onContextItemCommand)
    if (isMenu) {
      const popup = document.createElement('menupopup')
      popup.className = 'yt2p-menupopup'
      const items = data.children.map(data => newPlayerMenuItem(window, data))
      items.forEach(item => popup.appendChild(item))
      item.appendChild(popup)
    }
    return item

    function flatten (children) {
      if (!Array.isArray(children)) return []
      return children.reduce((array, child) => {
        array.push(child)
        return array.concat(flatten(child.children))
      }, [])
    }
  }

  function onContextItemCommand (event) {
    const item = event.originalTarget
    if (item !== event.currentTarget) return
    const document = item.ownerDocument
    const window = document.defaultView
    const commandPattern = item.getAttribute('data-command')
    if (!commandPattern) {
      Services.prompt.alert(null,
        getString('alertDialogTitle'),
        getString('playerCommandUnsetAlert'))
      return
    }
    let popup = item
    while (popup &&
      popup.id !== PLACES_MENUPOPUP.substring(1) &&
      popup.id !== CONTEXT_MENUPOPUP.substring(1)) popup = popup.parentNode
    const uri = popup.getAttribute('data-yt2p-uri')
    const videoUrl = uri || window.gContextMenu.linkURL
    if (item.classList.includes('yt2p-menu')) popup.hidePopup()
    const clipboardPattern = item.getAttribute('data-clipboard')
    if (clipboardPattern) {
      setClipboardString(getStringFromPattern(clipboardPattern, videoUrl))
    }
    sendToPlayer(commandPattern, videoUrl)
  }

  function onMenuPopupShowing (event) {
    const popup = event.target
    if (popup !== event.currentTarget) return
    const document = popup.ownerDocument
    const window = document.defaultView
    const bookmarkItem = event.explicitOriginalTarget
    const isPlaces = bookmarkItem && bookmarkItem._placesNode
    const show = isPlaces
      ? isVideoUrl(bookmarkItem._placesNode.uri)
      : window.gContextMenu.onLink && isVideoUrl(window.gContextMenu.linkURL)
    if (show) {
      if (isPlaces) {
        popup.setAttribute('data-yt2p-uri', bookmarkItem._placesNode.uri)
      }
      if (getPref('contextMenuIconRowMarginChangeEnabled')) {
        const horizontalMargin = getPref('contextMenuIconRowHorizontalMargin')
        const verticalMargin = getPref('contextMenuIconRowVerticalMargin')
        $$('.yt2p-menugroup', popup).forEach(group => {
          group.setAttribute('data-yt2p-horizontal-margin', horizontalMargin)
          group.setAttribute('data-yt2p-vertical-margin', verticalMargin)
        })
      } else {
        $$('.yt2p-menugroup', popup).forEach(group => {
          group.removeAttribute('data-yt2p-horizontal-margin')
          group.removeAttribute('data-yt2p-vertical-margin')
        })
      }
    }
    $$('[class^="yt2p"]', popup).forEach(element => {
      element.disabled = false
      element.hidden = !show
    })
  }

  function onMessage ({name, data}) {
    switch (name) {
      case 'yt2p-sendToPlayer':
        sendToPlayer(null, data.videoUrl)
        break
    }
  }

  function openOptions () {
    Services.wm.getMostRecentWindow(windowTypes[0])
      .openDialog('chrome://yt2p/content/optionsWindow.xul', 'yt2pOptions',
        'chrome=yes,dialog=yes,centerscreen,titlebar,toolbar')
  }

  function prefBranchObserver (subject, topic, data) {
    if (topic !== 'nsPref:changed') return
    switch (data) {
      case 'toolsMenuItemsEnabled':
        forEachWindow(getPref('toolsMenuItemsEnabled')
          ? loadToolsMenuItemsIntoWindow
          : unloadToolsMenuItemsFromWindow)
        break
      case 'placesMenuItemsEnabled':
        forEachWindow(getPref('placesMenuItemsEnabled')
          ? loadPlacesMenuItemsIntoWindow
          : unloadPlacesMenuItemsFromWindow)
        break
      case 'contextMenuItemsEnabled':
        forEachWindow(getPref('contextMenuItemsEnabled')
          ? loadContextMenuItemsIntoWindow
          : unloadContextMenuItemsFromWindow)
        break
      case 'players':
        forEachWindow(unloadContextMenuItemsFromWindow)
        forEachWindow(unloadPlacesMenuItemsFromWindow)
        forEachWindow(loadContextMenuItemsIntoWindow)
        forEachWindow(loadPlacesMenuItemsIntoWindow)
        break
    }
  }

  function prefHasUserValue (name) {
    try {
      return prefBranch.prefHasUserValue(name)
    } catch (e) {}
    return false
  }

  function sendToPlayer (playerCommand, videoUrl) {
    if (!playerCommand) {
      const players = JSON.parse(getPref('players') || '[]')
      playerCommand = _getClickSenderCommand(players)
      if (!playerCommand) {
        Services.prompt.alert(null, getString('alertDialogTitle'),
          getString('clickSenderUnsetAlert'))
      }
    }
    const string = getStringFromPattern(playerCommand, videoUrl)
    const params = getParametersFromString(string)
    try {
      const iFile = new IFile(params.shift())
      if (!iFile.isExecutable()) {
        Services.prompt.alert(null, getString('alertDialogTitle'),
          getString('playerCommandNotExecutableAlert'))
        return
      }
      const iProcess = new IProcess(iFile)
      iProcess.run(false, params, params.length)
    } catch (e) {
      Services.prompt.alert(null, getString('alertDialogTitle'),
        getString('playerCommandFailedAlert'))
      Cu.reportError(e)
    }

    function _getClickSenderCommand (children = []) {
      for (let data of children) {
        if (data.isClickSender) return data.command
        if (!data.children) continue
        const command = _getClickSenderCommand(data.children)
        if (command) return command
      }
    }
  }

  function setClipboardString (string) {
    Cc['@mozilla.org/widget/clipboardhelper;1']
      .getService(Ci.nsIClipboardHelper)
      .copyString(string)
  }

  function setPref (name, value) {
    try {
      switch (prefBranch.getPrefType(name)) {
        case 32: prefBranch.setCharPref(name, value); break
        case 64: prefBranch.setIntPref(name, value); break
        case 128: prefBranch.setBoolPref(name, value); break
      }
    } catch (e) { Cu.reportError(e) }
  }

  function shutdown (data, reason) {
    if (reason === global.APP_SHUTDOWN) return
    Services.wm.removeListener(windowListener)
    forEachWindow(unloadFromWindow)
    prefBranch.removeObserver('', prefBranchObserver)
    Services.mm.removeMessageListener('yt2p-sendToPlayer', onMessage)
    Services.ss.unregisterSheet(YT2P_CSS_URI, Services.ss.USER_SHEET)
    Services.obs.notifyObservers(null, 'chrome-flush-caches', null)
    Services.strings.flushBundles()
  }

  function startup ({oldVersion}, reason) {
    loadDefaultPrefs()
    let openOptionsEnabled = reason === global.ADDON_INSTALL
    if (reason === global.ADDON_UPGRADE) {
      if (Services.vc.compare(oldVersion, '1.*') < 0) {
        updatePrefsFromVersion1()
        openOptionsEnabled = true
      }
    }
    if (openOptionsEnabled) openOptions()
    Services.ss.loadAndRegisterSheet(YT2P_CSS_URI, Services.ss.USER_SHEET)
    Services.mm.addMessageListener('yt2p-sendToPlayer', onMessage)
    prefBranch.addObserver('', prefBranchObserver, false)
    forEachWindow(loadIntoXulWindow)
    Services.wm.addListener(windowListener)
  }

  function uninstall (data, reason) {
    if (reason !== global.ADDON_UNINSTALL) return
    Services.prefs.deleteBranch('extensions.yt2p.')
  }

  function unloadContextMenuItemsFromWindow (window) {
    const popup = $(CONTEXT_MENUPOPUP, window.document)
    if (!popup) return
    $$('[class^="yt2p"]', popup).forEach(e => e.parentElement.removeChild(e))
    popup.removeEventListener('popupshowing', onMenuPopupShowing)
  }

  function unloadFromWindow (window) {
    window.messageManager.broadcastAsyncMessage('yt2p-unloadFrameScript')
    window.messageManager.removeDelayedFrameScript(FRAME_JS)
    if (getPref('toolsMenuItemsEnabled')) unloadToolsMenuItemsFromWindow(window)
    if (getPref('placesMenuItemsEnabled')) unloadPlacesMenuItemsFromWindow(window)
    if (getPref('contextMenuItemsEnabled')) unloadContextMenuItemsFromWindow(window)
  }

  function unloadPlacesMenuItemsFromWindow (window) {
    const popup = $(PLACES_MENUPOPUP, window.document)
    if (!popup) return
    $$('[class^="yt2p"]', popup).forEach(e => e.parentElement.removeChild(e))
    popup.removeEventListener('popupshowing', onMenuPopupShowing)
  }

  function unloadToolsMenuItemsFromWindow (window) {
    const popup = $(TOOLS_MENUPOPUP, window.document)
    if (!popup) return
    $$('[class^="yt2p"]', popup).forEach(e => e.parentElement.removeChild(e))
  }

  function updatePrefsFromVersion1 () {
    try {
      if (prefHasUserValue('playerExeDir')) {
        let command = getPref('playerExeDir')
        if (command.includes(' ')) command = `"${command}"`
        command += ' $VIDEOURL$'
        if (prefHasUserValue('keepPlaylistsInURLs')) command += '&list=$PLAYLISTID$'
        setPref('players', JSON.stringify([
          {
            name: getString('sendToPlayer'),
            icon: LOGO_16,
            command,
            isClickSender: true
          },
          {
            isSeparator: true
          }
        ]))
      }
      if (prefHasUserValue('embedWhatDo')) {
        switch (getPref('embedWhatDo')) {
          case 1: setPref('embeddedVideoChangeType', 1); break
          case 2: setPref('embeddedVideoChangeType', 0); break
          case 3: setPref('embeddedVideoChangeType', 2); break
          case 4: setPref('embeddedVideoChangeType', 2); break
          default: setPref('embeddedVideoChangeEnabled', false)
        }
      }
      if (prefHasUserValue('allLinksClickSend')) {
        setPref('videoLinkChangeEnabled', getPref('allLinksClickSend'))
      }
      if (prefHasUserValue('linkWhatDo')) {
        const linkWhatDo = getPref('linkWhatDo')
        if (linkWhatDo === 0) setPref('videoLinkChangeEnabled', false)
        if (linkWhatDo === 1) setPref('videoLinkChangeType', 0)
        if (prefHasUserValue('embedWhatDo')) {
          switch (getPref('embedWhatDo')) {
            case 0: setPref('videoLinkChangeType', 0); break
            case 1: setPref('videoLinkChangeType', 1); break
            case 2: setPref('videoLinkChangeType', 0); break
            case 3: setPref('videoLinkChangeType', 2); break
            case 4: setPref('videoLinkChangeType', 2); break
          }
        }
      }
      if (prefHasUserValue('clickWhatDo')) {
        switch (getPref('clickWhatDo')) {
          case 1: setPref('filClickChangeType', 2); break
          case 2: setPref('filClickChangeType', 1); break
          case 3: setPref('filClickChangeType', 0); break
          default: setPref('filClickChangeEnabled', false); break
        }
      }
    } catch (e) {}
  }
})(this)
