/*
 * YouTube 2 Player - Watch videos in an external player.
 *
 * Copyright 2016-2017 Rasmus Riiner <rasmus.riiner@mail.ee>
 *
 * Distributed under the MIT/X11 License. See LICENSE.md for more details.
 */

/* global browser */

'use strict'

// browser.storage.local.clear()

browser.storage.local.get({
  playerGroups: [{
    name: browser.i18n.getMessage('mainGroup'),
    icon: browser.extension.getURL('icons/16/yt2p.png'),
    players: [{
      name: browser.i18n.getMessage('sendToPlayer'),
      icon: browser.extension.getURL('icons/16/player.png'),
      command: 'mpv VIDEOURL',
      clipboard: ''
    }]
  }],
  toolsMenuItemsEnabled: true,
  iconContextMenuEnabled: true,
  iconContextMenuTheme: 'default', // default, light, dark
  iconContextMenuIconSize: 16, // 0-256
  iconContextMenuPadding: 8, // 0-99
  contextMenuItemsEnabled: true,
  videoLinkChangeEnabled: true,
  videoLinkChangeType: 'underline', // underline, glow, embed, fil
  videoLinkClickChangeEnabled: true,
  videoLinkClickChangeType: 'send', // send, menu, embed, fil
  videoLinkClickPlayerCommand: '',
  embeddedVideoChangeEnabled: true,
  embeddedVideoChangeType: 'fil', // link, embed, fil
  filClickChangeEnabled: false,
  filClickChangeType: 'embed' // link, embed
}).then((storage) => {
  browser.storage.local.set(storage)
  installContextMenuItems(storage.playerGroups)
  browser.storage.onChanged.addListener(onStorageChanged)
  browser.runtime.sendMessage({
    type: 'import-legacy-data',
    name: browser.i18n.getMessage('importedGroup'),
    icon: browser.extension.getURL('icons/16/yt2p.png')
  }).then(reply => {
    if (!reply) return
    installContextMenuItems(storage.playerGroups)
    browser.storage.local.set(reply)
  })
})

browser.runtime.onInstalled.addListener(onInstalled)
browser.runtime.onMessage.addListener(onMessage)
browser.tabs.onActivated.addListener(closeAllContextMenus)

function onInstalled (details) {
  if (details.reason === 'install' ||
      (details.reason === 'update' && details.previousVersion.startsWith('2'))) {
    browser.runtime.openOptionsPage()
  }
  // browser.tabs.query({}).then(tabs => {
  //   for (const tab of tabs) {
  //     browser.tabs.insertCSS(tab.id, {
  //       file: '/yt2p-content.css',
  //       runAt: 'document_start',
  //       allFrames: true
  //     })
  //     browser.tabs.executeScript(tab.id, {
  //       file: '/yt2p-content.js',
  //       runAt: 'document_end',
  //       allFrames: true
  //     })
  //   }
  // })
}

async function closeAllContextMenus () {
  const tabs = await browser.tabs.query({})
  return Promise.all(tabs.map(async (tab) => {
    try {
      await browser.tabs.sendMessage(tab.id, 'closecontextmenus')
    } catch (e) {}
  }))
}

function onMessage (message, sender, sendResponse) {
  if (message === 'ping') return
  if (message === 'closeallcontextmenus') {
    return closeAllContextMenus()
    // closeAllContextMenus().then(sendResponse)
    // return true
  } else {
    if (!message.commandPattern) {
      createNotification(browser.i18n.getMessage('commandNotSet'))
      return
    }
    browser.runtime.sendNativeMessage('ee.sumzary.yt2p', {
      type: 'execute',
      command: formatCommand(message.commandPattern, message.linkUrl)
    }).then(response => {
      if (response === true) return
      createNotification(response.message)
    }).catch(error => {
      console.log(error)
      createNotification(error.message)
    })
  }
}

function createNotification (message) {
  return browser.notifications.create(null, {
    type: 'basic',
    title: browser.i18n.getMessage('extensionName'),
    iconUrl: browser.extension.getURL('icons/64/yt2p.png'),
    message: message
  })
}

function onStorageChanged (changes) {
  if (changes.playerGroups) {
    browser.contextMenus.removeAll().then(() => {
      installContextMenuItems(changes.playerGroups.newValue)
    })
  }
  if (changes.contextMenuItemsEnabled) {
    if (changes.contextMenuItemsEnabled.newValue) {
      browser.storage.local.get('playerGroups', storage => {
        installContextMenuItems(storage.playerGroups)
      })
    } else {
      browser.contextMenus.removeAll()
    }
  }
}

function getVideoIdFromUrl (videoUrl) {
  const re = /v=|v%3[Dd]|youtu.be\/|\/v\/|\/embed\/|img.youtube.com\/vi\/|attribution_link=/ig
  const temp = videoUrl.replace(re, '$IDSTART$')
  return temp.substr(temp.indexOf('$IDSTART$') + 9, 11)
}

function getPlaylistIdFromUrl (videoUrl) {
  if (!videoUrl.includes('list=')) return ''
  const temp = videoUrl.replace('list=', '$PLAYLISTID$')
  return temp.substr(temp.indexOf('$PLAYLISTID$') + 11, 11)
}

function getStandardisedVideoUrl (videoUrl) {
  const result = `https://www.youtube.com/watch?v=${getVideoIdFromUrl(videoUrl)}`
  const playlistId = getPlaylistIdFromUrl(videoUrl)
  if (playlistId) return result + `&list=${playlistId}`
  return result
}

function formatCommand (pattern, linkUrl) {
  return pattern
    .replace('LINKURL', linkUrl)
    .replace('VIDEOURL', getStandardisedVideoUrl(linkUrl))
    .replace('VIDEOID', getVideoIdFromUrl(linkUrl))
    .replace('PLAYLISTID', getPlaylistIdFromUrl(linkUrl))
}

function installPlayerContextMenuItems (player, parentId) {
  if (player.isSeparator) {
    browser.contextMenus.create({ type: 'separator', parentId })
    return
  }
  const commandPattern = player.command
  browser.contextMenus.create({
    title: player.name,
    icons: { '16': player.icon },
    parentId,
    onclick: (info) => {
      const url = info.linkUrl || info.srcUrl || info.frameUrl || info.pageUrl
      browser.runtime.sendNativeMessage('ee.sumzary.yt2p', {
        type: 'execute',
        command: formatCommand(commandPattern, url)
      })
    }
  })
}

function installPlayerGroupContextMenuItems (group, isOnlyChild) {
  if (group.isSeparator) {
    browser.contextMenus.create({ type: 'separator' })
    return
  }
  const itemId = isOnlyChild ? undefined : browser.contextMenus.create({
    title: group.name,
    icons: { '16': group.icon }
  })
  for (const player of group.players) {
    installPlayerContextMenuItems(player, itemId)
  }
}

function installContextMenuItems (playerGroups) {
  for (const group of playerGroups) {
    installPlayerGroupContextMenuItems(group, playerGroups.length === 1)
  }
}

// function onNativeMessageResponse (response) {
//   if (browser.runtime.lastError && browser.runtime.lastError.message.indexOf('not found') >= 0) {
//     browser.tabs.create({ url: browser.runtime.getURL('/getnative.html') })
//     return
//   }
//   if (response === 'success') return
//   browser.notifications.create(null, {
//     type: 'basic',
//     title: browser.i18n.getMessage('extensionName'),
//     iconUrl: browser.extension.getURL('icons/64/yt2p.png'),
//     message: response
//   })
// }

// function onNativeMessageError () {
//   browser.tabs.create({ url: browser.runtime.getURL('/getnative.html') })
// }
