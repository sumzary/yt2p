/*
 * YouTube 2 Player - Watch videos in an external player.
 *
 * Copyright 2016-2017 Rasmus Riiner <rasmus.riiner@mail.ee>
 *
 * Distributed under the MIT/X11 License. See LICENSE.md for more details.
 */

/* global browser */

'use strict'

const defaults = {
  playerGroups: [{
    name: browser.i18n.getMessage('mainGroup'),
    icon: browser.extension.getURL('icons/16/yt2p.png'),
    players: [{
      name: browser.i18n.getMessage('sendToPlayer'),
      icon: browser.extension.getURL('icons/16/player.png'),
      command: '',
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
  videoLinkClickChangeEnabled: false,
  videoLinkClickChangeType: 'send', // send, menu, embed, fil
  videoLinkClickPlayerCommand: '',
  embeddedVideoChangeEnabled: true,
  embeddedVideoChangeType: 'fil', // link, embed, fil
  filClickChangeEnabled: false,
  filClickChangeType: 'embed' // link, embed
}

initStorage()

browser.storage.onChanged.addListener(async changes => {
  if (changes.playerGroups) {
    await browser.contextMenus.removeAll()
    if (changes.playerGroups.newValue) {
      installContextMenuItems(changes.playerGroups.newValue)
    }
  }
  if (changes.contextMenuItemsEnabled) {
    await browser.contextMenus.removeAll()
    if (changes.contextMenuItemsEnabled.newValue) {
      const storage = await browser.storage.local.get('playerGroups')
      installContextMenuItems(storage.playerGroups)
    }
  }
})

browser.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install' ||
      (details.reason === 'update' && /^1|2\./.test(details.previousVersion))) {
    browser.runtime.openOptionsPage()
  }
})

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === 'closeallcontextmenus') {
    return closeAllContextMenus()
  } else if (message === 'resetstorage') {
    return resetStorage()
  } else {
    doExecute(message)
  }
})

browser.tabs.onActivated.addListener(closeAllContextMenus)

async function closeAllContextMenus () {
  const tabs = await browser.tabs.query({})
  return Promise.all(tabs.map(async (tab) => {
    try {
      await browser.tabs.sendMessage(tab.id, 'closecontextmenus')
    } catch (e) {}
  }))
}

async function initStorage () {
  let storage = await browser.storage.local.get(defaults)
  await browser.storage.local.set(storage)
  installContextMenuItems(storage.playerGroups)
}

async function resetStorage () {
  await browser.storage.local.clear()
  await browser.storage.local.set(defaults)
  await browser.contextMenus.removeAll()
  installContextMenuItems(defaults.playerGroups)
}

function doExecute ({command, clipboard, url}) {
  if (!command && !clipboard) {
    createNotification(browser.i18n.getMessage('commandNotSet'))
    browser.runtime.openOptionsPage()
    return
  }
  const message = { type: 'execute' }
  if (command) message.command = formatPattern(command, url)
  if (clipboard) message.clipboard = formatPattern(clipboard, url)
  const startTime = Date.now()
  browser.runtime.sendNativeMessage('ee.sumzary.yt2p', message).then(response => {
    if (response === true) return
    if (Date.now() - startTime > 7500) return
    console.log(response.message)
    createNotification(response.message)
  }).catch(error => {
    console.log(error)
    createNotification(browser.i18n.getMessage('nativeAppMissing'))
    browser.runtime.openOptionsPage()
  })

  function formatPattern (pattern, linkUrl) {
    return pattern
      .replace('LINKURL', linkUrl)
      .replace('VIDEOURL', getStandardisedVideoUrl(linkUrl))
      .replace('VIDEOID', getVideoIdFromUrl(linkUrl))
      .replace('PLAYLISTID', getPlaylistIdFromUrl(linkUrl))
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
}

async function installContextMenuItems (playerGroups) {
  for (const group of playerGroups) {
    installPlayerGroupContextMenuItems(group, playerGroups.length === 1)
  }

  function installPlayerGroupContextMenuItems (group, isOnlyChild) {
    if (group.isSeparator) {
      return createContextMenuItem({ type: 'separator' })
    }
    const itemId = isOnlyChild ? undefined : createContextMenuItem({
      title: group.name,
      icons: { '16': group.icon }
    })
    for (const player of group.players) {
      installPlayerContextMenuItems(player, itemId)
    }
  }

  function installPlayerContextMenuItems (player, parentId) {
    if (player.isSeparator) {
      return createContextMenuItem({ type: 'separator', parentId })
    }
    createContextMenuItem({
      title: player.name,
      icons: { '16': player.icon },
      parentId,
      onclick: info => {
        player.url = info.linkUrl || info.srcUrl || info.frameUrl || info.pageUrl
        doExecute(player)
      }
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

function createContextMenuItem (options) {
  try {
    return browser.contextMenus.create(options)
  } catch (e) {}
  delete options.icons
  return browser.contextMenus.create(options)
}
