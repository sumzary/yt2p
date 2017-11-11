'use strict'

function install () {}

function startup ({ webExtension }) {
  webExtension.startup().then(api => {
    api.browser.runtime.onMessage.addListener(importStorageFromPrefs)
  })
}
function shutdown () {}

function uninstall () {}

function importStorageFromPrefs (message, sender, sendReply) {
  if (message.type !== 'import-legacy-data') return
  const branch = Components.utils
    .import('resource://gre/modules/Services.jsm', {})
    .Services.prefs.getBranch('extensions.yt2p.')
  const players = JSON.parse(getPref('players') || '[]')
  const reply = {
    toolsMenuItemsEnabled: getPref('toolsMenuItemsEnabled'),
    iconContextMenuEnabled: getPref('contextMenuItemsEnabled'),
    iconContextMenuTheme: 'default',
    iconContextMenuIconSize: 16,
    iconContextMenuPadding: getPref('contextMenuIconRowVerticalMargin'),
    contextMenuItemsEnabled: true,
    videoLinkChangeEnabled: getPref('videoLinkChangeEnabled'),
    videoLinkClickChangeEnabled: getPref('videoLinkClickChangeEnabled'),
    videoLinkClickPlayerCommand: getClickSenderCommand(players),
    embeddedVideoChangeEnabled: getPref('embeddedVideoChangeEnabled'),
    filClickChangeEnabled: getPref('filClickChangeEnabled')
  }
  switch (getPref('videoLinkChangeType')) {
    case 0: reply.videoLinkChangeType = 'glow'; break
    case 1: reply.videoLinkChangeType = 'embed'; break
    case 2: reply.videoLinkChangeType = 'fil'; break
    default: reply.videoLinkChangeType = 'underline'
  }
  switch (getPref('videoLinkClickChangeType')) {
    case 1: reply.videoLinkClickChangeType = 'embed'; break
    case 2: reply.videoLinkClickChangeType = 'fil'; break
    default: reply.videoLinkClickChangeType = 'send'
  }
  switch (getPref('embeddedVideoChangeType')) {
    case 0: reply.embeddedVideoChangeType = 'link'; break
    case 1: reply.embeddedVideoChangeType = 'embed'; break
    default: reply.embeddedVideoChangeType = 'fil'
  }
  switch (getPref('filClickChangeType')) {
    case 2: reply.filClickChangeType = 'link'; break
    default: reply.filClickChangeType = 'embed'; break
  }
  reply.playerGroups = [{
    name: message.name,
    icon: message.icon,
    players: flatten(players).map(player => {
      if (player.isSeparator) return { isSeparator: true }
      return {
        name: player.name || '',
        icon: player.icon || '',
        command: (player.command || '')
          .replace('$VIDEOURL$', 'VIDEOURL')
          .replace('$VIDEOID$', 'VIDEOID'),
        clipboard: (player.clipboard || '')
          .replace('$VIDEOURL$', 'VIDEOURL')
          .replace('$VIDEOID$', 'VIDEOID')
      }
    })
  }]
  sendReply(reply)

  function getPref (key) {
    try {
      switch (branch.getPrefType(key)) {
        case 32: return branch.getCharPref(key)
        case 64: return branch.getIntPref(key)
        case 128: return branch.getBoolPref(key)
      }
    } catch (e) { return undefined }
  }

  function flatten (children) {
    if (!Array.isArray(children)) return []
    return children.reduce((array, child) => {
      array.push(child)
      return array.concat(flatten(child.children))
    }, [])
  }

  function getClickSenderCommand (children = []) {
    for (let data of children) {
      if (data.isClickSender) return data.command
      if (!data.children) continue
      const command = getClickSenderCommand(data.children)
      if (command) return command
    }
    return ''
  }
}
