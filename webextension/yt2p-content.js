/*
 * YouTube 2 Player - Watch videos in an external player.
 *
 * Copyright 2016-2017 Rasmus Riiner <rasmus.riiner@mail.ee>
 *
 * Distributed under the MIT/X11 License. See LICENSE.md for more details.
 */

/* global browser */

'use strict'

// ;(function (global) {
//   'use strict'
// })(this)

const GOOGLE_KEY = 'AIzaSyDCV-JwiIQL4sBjMJlaP5bMZfGL-W_YMDA'

let prefs = {}

browser.storage.local.get().then(storage => {
  prefs = Object.create(storage)
  // window.yt2pStorage = Object.create(storage)
  browser.storage.onChanged.addListener(onStorageChanged)
  browser.runtime.onMessage.addListener(onMessage)
  onContentLoad()
})

// browser.runtime.onSuspend.addListener(onContentUnload)

// function getValue (key) {
//   return window.yt2pStorage[key]
// }

function $ (selector, element = document) {
  return element.querySelector(selector)
}

function $$ (selector, element = document) {
  return [...element.querySelectorAll(selector)]
}

function fetchChannelItem (channelId) {
  return new Promise((resolve, reject) => {
    const request = new window.XMLHttpRequest()
    request.onerror = event => reject(new Error())
    request.onload = event => {
      if (request.status !== 200) reject(new Error())
      resolve(JSON.parse(request.response).items[0])
    }
    request.open('GET', `https://www.googleapis.com/youtube/v3/channels?key=${GOOGLE_KEY}&id=${channelId}&part=snippet,statistics,contentDetails&fields=items(id,snippet(title,description,thumbnails(default)),statistics(videoCount,subscriberCount,hiddenSubscriberCount))`)
    request.send()
  })
}

function fetchVideoImage (videoId) {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.className = 'yt2p-video-image'
    img.width = 480
    img.height = 360
    img.onerror = event => reject(new Error())
    img.onload = event => {
      if (img.naturalWidth > 120) return resolve(img)
      if (!/sddefault\.jpg$/.test(img.src)) return reject(new Error())
      img.src = `https://i.ytimg.com/vi/${videoId}/0.jpg`
    }
    img.src = `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`
  })
}

function fetchVideoItem (videoId) {
  return new Promise((resolve, reject) => {
    const request = new window.XMLHttpRequest()
    request.onerror = event => reject(new Error())
    request.onload = event => {
      if (request.status !== 200) reject(new Error())
      resolve(JSON.parse(request.response).items[0])
    }
    request.open('GET', `https://www.googleapis.com/youtube/v3/videos?key=${GOOGLE_KEY}&id=${videoId}&part=snippet,statistics,contentDetails&fields=items(snippet(publishedAt,channelId,title,description),contentDetails(duration),statistics(viewCount,likeCount,dislikeCount))`)
    request.send()
  })
}

function getHtmlTextWidth (text, font) {
  const div = document.createElement('div')
  div.style.width = 'auto'
  div.style.height = 'auto'
  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = 'nowrap'
  div.style.font = font
  div.textContent = text
  document.body.appendChild(div)
  const width = div.clientWidth + 1
  document.body.removeChild(div)
  return width
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

function getTimestampFromISO8601 (iso8601Duration) {
  const matches = iso8601Duration.match(/(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/)
  if (matches[8]) {
    if (matches[7]) {
      if (matches[6]) {
        return `${pad(matches[6])}:${pad(matches[7])}:${pad(matches[8])}`
      }
      return `${pad(matches[7])}:${pad(matches[8])}`
    }
    return `${pad(matches[8])}s`
  }
  return ''

  function pad (string) {
    return (string.length < 2 ? '0' : '') + string
  }
}

function getVideoIdFromUrl (videoUrl) {
  const temp = videoUrl.replace(/v=|v%3[Dd]|youtu.be\/|\/v\/|\/embed\/|img.youtube.com\/vi\/|attribution_link=/ig, '$IDSTART$')
  return temp.substr(temp.indexOf('$IDSTART$') + 9, 11)
}

function getVideoUrlFromId (videoId, playlistId) {
  if (!videoId) return ''
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
  if (playlistId) return `${videoUrl}&list=${playlistId}`
  return videoUrl
}

function isVideoUrl (url) {
  return /^(?:(?:(?:view-source:)?https?:)?\/\/)?(?:(?:www\.|m\.)?(?:youtube|youtube-nocookie)\.com\/(?:watch\?|embed\/|v\/|attribution_link\?a)|youtu\.be\/|\/watch\?|.+%2[Ff]watch%3[Ff][Vv]%3[Dd])/.test(url)
}

function makeYouTubeVideoPageTitleClickable () {
  if (!prefs.videoLinkChangeEnabled) return
  if (exec($('#eow-title'))) return
  if (exec($('#container > h1.title'))) return
  new window.MutationObserver((mutations, obs) => {
    if (exec($('#container > h1.title'))) obs.disconnect()
  }).observe(document.body, {
    childList: true,
    subtree: true
  })
  function exec (node) {
    if (!node) return false
    const a = makeVideoLink()
    a.classList.add('yt2p-send-override')
    a.href = window.location.href
    a.appendChild(node.cloneNode(true))
    node.parentElement.insertBefore(a, node)
    node.classList.add('yt2p-replaced')
    return true
  }
}

function newEmbeddedVideoElement (videoUrl) {
  const div = document.createElement('div')
  div.className = 'yt2p-video yt2p-embedded'
  const iframe = document.createElement('iframe')
  iframe.className = 'yt2p-iframe'
  iframe.src = `https://www.youtube.com/embed/${getVideoIdFromUrl(videoUrl)}`
  iframe.setAttribute('width', 480)
  iframe.setAttribute('height', 270)
  iframe.setAttribute('frameborder', 0)
  iframe.setAttribute('allowfullscreen', true)
  div.appendChild(iframe)
  return div
}

function newEmbeddedVideoObject (videoId) {
  const div = document.createElement('div')
  div.className = 'yt2p-video yt2p-embedded'
  const object = document.createElement('object')
  const embed = document.createElement('embed')
  const url = `http://www.youtube.com/v/${videoId}&amp;version=3`
  object.setAttribute('width', 480)
  object.setAttribute('height', 270)
  embed.setAttribute('width', 480)
  embed.setAttribute('height', 270)
  embed.setAttribute('allowfullscreen', true)
  embed.setAttribute('type', 'application/x-shockwave-flash')
  embed.setAttribute('src', url)
  object.appendChild(newParam('allowfullscreen', 'true'))
  object.appendChild(newParam('wmode', 'transparent'))
  object.appendChild(newParam('movie', url))
  object.appendChild(embed)
  div.appendChild(object)
  return div
}

function onPlayerButtonClick (event) {
  browser.runtime.sendMessage({
    commandPattern: event.target.yt2pCommand,
    linkUrl: $('#yt2pIconContextMenu').yt2pLinkUrl
  })
  $('#yt2pIconContextMenu').style.display = 'none'
}

function newPlayerButtonElementFromPlayer (player) {
  const div = document.createElement('div')
  div.className = 'yt2p-player'
  if (player.isSeparator) {
    div.classList.add('yt2p-separator')
    return div
  }
  const input = document.createElement('input')
  input.type = 'image'
  input.className = 'yt2p-playerbutton'
  input.title = player.name
  input.src = player.icon || browser.extension.getURL('icons/16/player.png')
  input.yt2pCommand = player.command
  input.onmousedown = onPlayerButtonClick
  input.onmouseup = onPlayerButtonClick
  input.onclick = onPlayerButtonClick
  div.appendChild(input)
  return div
}

function newPlayerGroupElementFromGroup (group) {
  const div = document.createElement('div')
  div.className = 'yt2p-playergroup'
  if (group.isSeparator) {
    div.classList.add('yt2p-separator')
    return div
  }
  group.players
    .map(newPlayerButtonElementFromPlayer)
    .map(element => div.appendChild(element))
  return div
}

function createIconContextMenu () {
  const div = document.createElement('div')
  div.id = 'yt2pIconContextMenu'
  div.style.display = 'none'
  div.setAttribute('yt2p-theme', prefs.iconContextMenuTheme)
  const padding = prefs.iconContextMenuPadding
  div.style.setProperty('--yt2p-padding', padding + 'px')
  div.style.setProperty('--yt2p-padding-half', Math.floor(padding / 2) + 'px')
  div.style.setProperty('--yt2p-iconsize', prefs.iconContextMenuIconSize + 'px')
  if (prefs.playerGroups) {
    prefs.playerGroups
      .map(newPlayerGroupElementFromGroup)
      .map(element => div.appendChild(element))
  }
  div.onmousedown = event => event.stopPropagation()
  const old = $('#yt2pIconContextMenu')
  if (old) {
    document.body.replaceChild(div, old)
  } else {
    document.body.appendChild(div)
  }
  document.addEventListener('mousedown', closeAllContextMenus)
  document.addEventListener('keydown', closeAllContextMenus)
  document.addEventListener('blur', closeAllContextMenus)
}

function closeAllContextMenus (event) {
  // if (event.type === 'mousedown' && event.button !== 0) return
  // if (event.type === 'keydown' && event.keyCode !== 27) return
  return browser.runtime.sendMessage('closeallcontextmenus')
}

function newFilElement (videoUrl) {
  const filDiv = document.createElement('div')
  filDiv.className = 'yt2p-video yt2p-fil'
  const videoA = makeVideoLink()
  videoA.className = 'yt2p-video-link'
  videoA.href = getStandardisedVideoUrl(videoUrl)
  filDiv.appendChild(videoA)
  const videoId = getVideoIdFromUrl(videoUrl)
  const videoImagePromise = fetchVideoImage(videoId)
  const videoItemPromise = fetchVideoItem(videoId)
  videoImagePromise.then(videoImage => {
    videoA.appendChild(videoImage)
    videoItemPromise.then(videoItem => {
      updateFilDivFromVideoItem(filDiv, videoItem)
      fetchChannelItem(videoItem.snippet.channelId).then(channelItem => {
        updateFilDivFromChannelItem(filDiv, channelItem)
      })
    })
  }).catch(error => {
    this.dump(error)
    updateFilDivWithErrorMessage(filDiv)
  })
  return filDiv
}

function newParam (name, value) {
  const param = document.createElement('param')
  param.setAttribute('name', name)
  param.setAttribute('value', value)
  return param
}

function onAddedNode (node) {
  if (!(node instanceof window.HTMLElement)) return
  if (node.className.startsWith('yt2p')) return
  if (prefs.embeddedVideoChangeEnabled) {
    if (/IFRAME|OBJECT|EMBED/.test(node.tagName) &&
        (node.parentElement && node.parentElement.tagName !== 'OBJECT')) {
      onEmbeddedVideo(node)
    } else {
      $$('iframe, object, embed', node).forEach(onEmbeddedVideo)
    }
  }
  if (prefs.videoLinkChangeEnabled) {
    if (node.tagName === 'A') {
      onVideoLink(node)
    } else {
      $$('a', node).forEach(onVideoLink)
    }
  }
}

function onMessage (message) {
  if (message === 'closecontextmenus') {
    const menu = $('#yt2pIconContextMenu')
    if (!menu) return
    if (window.yt2pOpenedMenu && window.yt2pOpenedMenu === menu) return
    menu.style.display = 'none'
  }
}

function onContentLoad () {
  if (isVideoUrl(window.location.href)) {
    makeYouTubeVideoPageTitleClickable()
  }
  if (prefs.iconContextMenuEnabled) {
    createIconContextMenu()
  }
  window.yt2pDoneVideoIds = []
  if (prefs.embeddedVideoChangeEnabled) {
    $$('iframe, object, :not(object) > embed').forEach(onEmbeddedVideo)
  }
  if (prefs.videoLinkChangeEnabled) {
    $$('a').forEach(onVideoLink)
  }
  if (!prefs.embeddedVideoChangeEnabled &&
      !prefs.videoLinkChangeEnabled &&
      !prefs.videoLinkClickChangeEnabled) return
  window.yt2pMutationObserver = new window.MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) onAddedNode(node)
    }
  }).observe(document.body, {
    childList: true,
    subtree: true
  })
  const div = document.createElement('div')
  div.id = 'yt2pLoaded'
  div.style.display = 'none'
  document.body.appendChild(div)
}

function onContentUnload () {
  if (window.yt2pMutationObserver) {
    window.yt2pMutationObserver.disconnect()
    delete window.yt2pMutationObserver
  }
  if (window.yt2pDoneVideoIds) {
    delete window.yt2pDoneVideoIds
  }
  for (const element of $$('.yt2p-replaced')) {
    element.classList.remove('yt2p-replaced')
    const replacement = element.previousElementSibling
    if (!replacement) continue
    if (!replacement.className.startsWith('yt2p')) continue
    replacement.parentElement.removeChild(replacement)
  }
}

function mouseX (event) {
  if (event.pageX) {
    return event.pageX
  } else if (event.clientX) {
    return event.clientX + (document.documentElement.scrollLeft
      ? document.documentElement.scrollLeft
      : document.body.scrollLeft)
  }
}

function mouseY (event) {
  if (event.pageY) {
    return event.pageY
  } else if (event.clientY) {
    return event.clientY + (document.documentElement.scrollTop
      ? document.documentElement.scrollTop
      : document.body.scrollTop)
  }
}

function onVideoLinkContextMenu (event) {
  const menu = $('#yt2pIconContextMenu')
  if (!menu) return
  window.yt2pOpenedMenu = menu
  closeAllContextMenus().then(() => delete window.yt2pOpenedMenu)
  const a = event.currentTarget
  menu.yt2pLinkUrl = a.href // getStandardisedVideoUrl()
  menu.style.left = (mouseX(event) + 2) + 'px'
  menu.style.top = (mouseY(event) + 2) + 'px'
  menu.style.display = ''
  a.oncontextmenu = () => (menu.style.display = 'none')
  setTimeout(() => (a.oncontextmenu = onVideoLinkContextMenu), 500)
  event.stopPropagation()
  event.preventDefault()
  return false
}

function onVideoLinkMouseDown (event) {
  // if (event.button !== 2) return
  // const menu = $('#yt2pIconContextMenu')
  // if (!menu) return
  // const a = event.currentTarget
  // closeAllContextMenus().then(() => {
  //   console.log('SHOWING')
  //   menu.yt2pLinkUrl = a.href // getStandardisedVideoUrl()
  //   menu.style.left = (mouseX(event) + 2) + 'px'
  //   menu.style.top = (mouseY(event) + 2) + 'px'
  //   menu.style.display = ''
  // })
  // event.stopPropagation()
  // return false
}

function onStorageChanged (changes) {
  for (const key of Object.keys(changes)) prefs[key] = changes[key].newValue
  if (changes.playerGroups) {
    createIconContextMenu()
  }
  if (changes.iconContextMenuEnabled) {
    if (changes.iconContextMenuEnabled.newValue) {
      createIconContextMenu()
    } else {
      document.removeEventListener('mousedown', closeAllContextMenus)
      document.removeEventListener('keydown', closeAllContextMenus)
      document.removeEventListener('blur', closeAllContextMenus)
      document.body.removeChild($('#yt2pIconContextMenu'))
    }
  }
  if (changes.iconContextMenuTheme && prefs.iconContextMenuEnabled) {
    $('#yt2pIconContextMenu')
      .setAttribute('yt2p-theme', changes.iconContextMenuTheme.newValue)
  }
  if (changes.iconContextMenuPadding && prefs.iconContextMenuEnabled) {
    const padding = changes.iconContextMenuPadding.newValue
    $('#yt2pIconContextMenu').style
      .setProperty('--yt2p-padding', padding + 'px')
    $('#yt2pIconContextMenu').style
      .setProperty('--yt2p-padding-half', Math.floor(padding / 2) + 'px')
  }
  if (changes.iconContextMenuIconSize && prefs.iconContextMenuEnabled) {
    const size = changes.iconContextMenuIconSize.newValue
    $('#yt2pIconContextMenu').style.setProperty('--yt2p-iconsize', size + 'px')
  }
  if (changes.videoLinkChangeType) {
    const {oldValue, newValue} = changes.videoLinkChangeType
    if (newValue && (oldValue === 'underline' || oldValue === 'glow') &&
       (newValue === 'underline' || newValue === 'glow')) {
      for (const element of $$(`.yt2p-${oldValue}`)) {
        element.classList.remove(`yt2p-${oldValue}`)
        element.classList.add(`yt2p-${newValue}`)
      }
    }
  }
}

function makeVideoLink (a = document.createElement('a')) {
  a.classList.add('yt2p-link', prefs.videoLinkChangeType === 'glow'
    ? 'yt2p-glow'
    : 'yt2p-underline')
  a.oncontextmenu = onVideoLinkContextMenu
  a.onmousedown = onVideoLinkMouseDown
  a.onclick = onVideoLinkClick
  return a
}

function onEmbeddedVideo (element) {
  if (!prefs.embeddedVideoChangeEnabled) return
  let videoUrl = element.src || element.getAttribute('data-src') || ($('embed', element) && $('embed', element).src) || element.data || ''
  let videoId
  if (!videoUrl || !isVideoUrl(videoUrl)) {
    videoId = element.getAttribute('data-chomp-id')
    if (!videoId) return
    videoUrl = getVideoUrlFromId(videoId)
  } else {
    videoId = getVideoIdFromUrl(videoUrl)
  }
  let parent = element.parentElement
  const changeType = prefs.embeddedVideoChangeType
  if (changeType === 'link' ||
      window.yt2pDoneVideoIds.some(id => id === videoId)) {
    const a = makeVideoLink()
    a.href = getVideoUrlFromId(videoId)
    a.textContent = videoId
    parent.replaceChild(a, element)
    return
  }
  window.yt2pDoneVideoIds.push(videoId)
  if (changeType === 'object') {
    const object = newEmbeddedVideoObject(videoId)
    parent.replaceChild(object, element)
    return
  }
  if (changeType === 'fil') {
    while (parent.childNodes.length === 1 &&
        parent.tagName !== 'CENTER') {
      element = parent
      parent = element.parentElement
    }
    parent.replaceChild(newFilElement(videoUrl), element)
    if (parent.classList) parent.classList.add('yt2p-video-parent')
    // parent.insertBefore(newFilElement(videoUrl), element)
    // element.classList.add('yt2p-replaced')
  }
}

function onFilVideoLinkClick (event) {
}

function onVideoLink (a) {
  if (!prefs.videoLinkChangeEnabled) return
  if (!isVideoUrl(a.href)) return
  if (/yt2p-|ytp-button|iv-promo-txt/.test(a.className)) return
  if (/comment-renderer-time|submessage/.test(a.parentElement.className)) return
  if (/YT-FORMATTED-STRING/.test(a.parentElement.tagName)) return
  // if (videoLinkType === 0/* || !isElementTextOnly(a) */) {
  //   makeAnchorClickSend(a)
  //   return
  // }
  const videoId = getVideoIdFromUrl(a.href)
  const changeType = prefs.videoLinkChangeType
  if (changeType === 'underline' || changeType === 'glow' ||
      /ytp-|yt-uix-|yt-simple-/.test(a.className) ||
      /c-detail__title/.test(a.parentElement.className) ||
      window.yt2pDoneVideoIds.some(id => id === videoId)) {
    // if (/ytp-/.test(a.className)) {
    makeVideoLink(a)
    // const newA = makeVideoLink(a.cloneNode(true))
    if (isVideoUrl(a.textContent)) {
      a.textContent = getVideoIdFromUrl(a.href)
    }
    // a.parentElement.insertBefore(newA, a.nextElementSibling)
    // a.classList.add('yt2p-replaced')
    return
    // }
    // a.classList.add('yt2p-link', `yt2p-${changeType}`)
    // if (isVideoUrl(a.textContent) &&
    //     !window.location.href.startsWith('view-source:')) {
    //   a.textContent = getVideoIdFromUrl(a.href)
    // }
    // a.oncontextmenu = onVideoLinkContextMenu
    // a.onclick = onVideoLinkClick
    // return
  }
  if (changeType === 'embed') {
    window.yt2pDoneVideoIds.push(videoId)
    const videoElement = newEmbeddedVideoElement(a.href)
    a.parentElement.insertBefore(videoElement, a.nextElementSibling)
    a.parentElement.classList.add('yt2p-video-parent')
    a.classList.add('yt2p-replaced')
    onVideoLink(a)
    return
  }
  if (changeType === 'fil') {
    window.yt2pDoneVideoIds.push(videoId)
    if (a.textContent !== a.href && a.textContent !== videoId) {
      const textDiv = document.createElement('div')
      textDiv.className = 'yt2p-remaining-text'
      textDiv.textContent = a.textContent
      a.parentElement.insertBefore(textDiv, a)
    }
    a.parentElement.insertBefore(newFilElement(a.href), a)
    a.parentElement.classList.add('yt2p-video-parent')
    a.classList.add('yt2p-replaced')
  }
}

function onVideoLinkClick (event) {
  const a = event.currentTarget
  const changeType = prefs.filClickChangeEnabled && a.classList.contains('yt2p-video-link')
    ? prefs.filClickChangeType
    : prefs.videoLinkClickChangeEnabled
      ? /ytp-|yt-uix-|yt-simple-|yt2p-send-override/.test(a.className)
        ? 'send'
        : prefs.videoLinkClickChangeType
      : null
  if (!changeType) return
  switch (changeType) {
    case 'send':
      browser.runtime.sendMessage({
        commandPattern: prefs.videoLinkClickPlayerCommand,
        linkUrl: a.href
      })
      break
    case 'menu':
      onVideoLinkContextMenu(event)
      break
    case 'link':
      const videoId = getVideoIdFromUrl(a.href)
      const newA = document.createElement('a')
      newA.href = getVideoUrlFromId(videoId)
      newA.textContent = videoId
      a.parentElement.parentElement.replaceChild(newA, a.parentElement)
      break
    case 'embed':
      a.parentElement.replaceChild(newEmbeddedVideoElement(a.href), a)
      break
    case 'fil':
      a.parentElement.replaceChild(newFilElement(a.href), a)
      break
  }
  event.preventDefault()
  event.stopPropagation()
  return false
}

function updateFilDivFromChannelItem (filDiv, item) {
  const channelA = document.createElement('a')
  channelA.className = 'yt2p-channel-link'
  channelA.href = `https://www.youtube.com/channel/${item.id}/videos`
  channelA.title = `${item.snippet.title}\n 🎞 ${parseInt(item.statistics.videoCount).toLocaleString()}${item.statistics.hiddenSubscriberCount ? '' : `   👤  ${parseInt(item.statistics.subscriberCount).toLocaleString()}`} ${item.snippet.description ? `\n\n${item.snippet.description}` : ''}`
  const channelImg = document.createElement('img')
  channelImg.className = 'yt2p-channel-image'
  channelImg.src = item.snippet.thumbnails.default.url
  channelImg.alt = ''
  channelA.appendChild(channelImg)
  filDiv.appendChild(channelA)
  // const videoA = $('.yt2p-video-link', filDiv)
  // videoA.removeChild($('.yt2p-yt-logo', videoA))
}

function updateFilDivFromVideoItem (filDiv, item) {
  const videoA = $('.yt2p-video-link', filDiv)
  videoA.title = item.snippet.description
  // const ytlogoImg = document.createElement('img')
  // ytlogoImg.className = 'yt2p-yt-logo'
  // ytlogoImg.alt = ''
  // ytlogoImg.src = 'chrome://yt2p/skin/yt-logo.png'
  // videoA.appendChild(ytlogoImg)
  const upperBlackDiv = document.createElement('div')
  upperBlackDiv.className = 'yt2p-blackbox yt2p-upper'
  videoA.appendChild(upperBlackDiv)
  const lowerBlackDiv = document.createElement('div')
  lowerBlackDiv.className = 'yt2p-blackbox yt2p-lower'
  videoA.appendChild(lowerBlackDiv)
  const titleDiv = document.createElement('div')
  titleDiv.className = 'yt2p-text yt2p-title'
  titleDiv.textContent = item.snippet.title
  videoA.appendChild(titleDiv)
  const viewCount = parseInt(item.statistics.viewCount).toLocaleString()
  const viewsString = `${viewCount} 👁`
  const viewsDiv = document.createElement('div')
  viewsDiv.className = 'yt2p-text yt2p-views'
  viewsDiv.textContent = viewsString
  videoA.appendChild(viewsDiv)
  const durationString = `⌚ ${getTimestampFromISO8601(item.contentDetails.duration)}`
  const durationDiv = document.createElement('div')
  durationDiv.className = 'yt2p-text yt2p-duration'
  durationDiv.textContent = durationString
  videoA.appendChild(durationDiv)
  const viewsWidth = getHtmlTextWidth(viewsString, 'normal 11px Arial,Helvetica,sans-serif')
  const durationWidth = getHtmlTextWidth(durationString, 'normal 11px Arial,Helvetica,sans-serif')
  const publishedAtWidth = 440 - viewsWidth - durationWidth
  const publishedAtDate = new Date(item.snippet.publishedAt)
  const publishedAtDiv = document.createElement('div')
  publishedAtDiv.className = 'yt2p-text yt2p-published'
  publishedAtDiv.textContent = publishedAtDate.toLocaleDateString()
  publishedAtDiv.style.left = `${20 + viewsWidth}px`
  publishedAtDiv.style.width = `${publishedAtWidth}px`
  publishedAtDiv.style.maxWidth = `${publishedAtWidth}px`
  videoA.appendChild(publishedAtDiv)
  const likeCount = parseInt(item.statistics.likeCount)
  const dislikeCount = parseInt(item.statistics.dislikeCount)
  const likesWidth = Math.floor(likeCount / (likeCount + dislikeCount) * 480)
  if (likesWidth > 0) {
    const likesDiv = document.createElement('div')
    likesDiv.className = 'yt2p-votebar yt2p-likes'
    likesDiv.style.width = `${likesWidth}px`
    videoA.appendChild(likesDiv)
    if (likesWidth < 480) {
      const dislikesDiv = document.createElement('div')
      dislikesDiv.className = 'yt2p-votebar yt2p-dislikes'
      dislikesDiv.style.width = `${480 - likesWidth}px`
      videoA.appendChild(dislikesDiv)
    }
  }
}

function updateFilDivWithErrorMessage (filDiv) {
  filDiv.classList.add('yt2p-error')
  const videoA = $('.yt2p-video-link', filDiv)
  const textDiv = document.createElement('div')
  textDiv.className = 'yt2p-text yt2p-title'
  textDiv.textContent = '⚠ ' + browser.i18n.getMessage('videoNotFoundAlert')
  videoA.appendChild(textDiv)
}
