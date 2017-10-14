/*
 * YouTube 2 Player - Watch videos in an external player.
 *
 * Copyright 2016-2017 Rasmus Riiner <rasmus.riiner@mail.ee>
 *
 * Distributed under the MIT/X11 License. See LICENSE.md for more details.
 */

;(function (global) {
  'use strict'

  const {utils: Cu} = global.Components
  const {Services} = Cu.import('resource://gre/modules/Services.jsm', {})

  const THUNDERBIRD = Services.appinfo.name === 'Thunderbird'
  const SESSION_TIME = Date.now()
  const GOOGLE_KEY = 'AIzaSyDCV-JwiIQL4sBjMJlaP5bMZfGL-W_YMDA'
  const PREF_BRANCH = 'extensions.yt2p.'
  const STRING_BUNDLE = 'chrome://yt2p/locale/yt2p.properties?' + SESSION_TIME

  const prefBranch = Services.prefs.getBranch(PREF_BRANCH)
  const stringBundle = Services.strings.createBundle(STRING_BUNDLE)

  let window
  let document

  global.addEventListener('DOMContentLoaded', onContentFrameLoad)
  global.addEventListener('yt2p-unloadFrameScript', onContentFrameUnload)

  function $ (selector, element = document) {
    return element.querySelector(selector)
  }

  function $$ (selector, element = document) {
    return [...element.querySelectorAll(selector)]
  }

  function fetchChannelItem (channelId, resolve, reject) {
    const request = new window.XMLHttpRequest()
    request.onerror = event => reject()
    request.onload = event => {
      if (request.status !== 200) reject()
      resolve(JSON.parse(request.response).items[0])
    }
    request.open('GET', 'https://www.googleapis.com/youtube/v3/channels?key=' + GOOGLE_KEY + '&id=' + channelId + '&part=snippet,statistics,contentDetails&fields=items(id,snippet(title,description,thumbnails(default)),statistics(videoCount,subscriberCount,hiddenSubscriberCount))')
    request.send()
  }

  function fetchVideoImage (videoId, resolve, reject) {
    const img = new window.Image()
    img.className = 'yt2p-video-image'
    img.width = 480
    img.height = 360
    img.onerror = event => reject()
    img.onload = event => {
      if (img.naturalWidth > 120) return resolve(img)
      if (!/sddefault\.jpg$/.test(img.src)) return reject()
      img.src = 'https://i.ytimg.com/vi/' + videoId + '/0.jpg'
    }
    img.src = 'https://i.ytimg.com/vi/' + 'videoId' + '/sddefault.jpg'
  }

  function fetchVideoItem (videoId, resolve, reject) {
    const request = new window.XMLHttpRequest()
    request.onerror = () => reject()
    request.onload = event => {
      if (request.status !== 200) return reject()
      resolve(JSON.parse(request.response).items[0])
    }
    request.open('GET', 'https://www.googleapis.com/youtube/v3/videos?key=' + GOOGLE_KEY + '&id=' + videoId + '&part=snippet,statistics,contentDetails&fields=items(snippet(publishedAt,channelId,title,description),contentDetails(duration),statistics(viewCount,likeCount,dislikeCount))')
    request.send()
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
    if (videoUrl.indexOf('list=') === -1) return ''
    const temp = videoUrl.replace('list=', '$PLAYLISTID$')
    return temp.substr(temp.indexOf('$PLAYLISTID$') + 11, 11)
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
    const result = 'https://www.youtube.com/watch?v=' + getVideoIdFromUrl(videoUrl)
    const playlistId = getPlaylistIdFromUrl(videoUrl)
    if (playlistId) return result + '&list=' + playlistId
    return result
  }

  function getString (name, nameMatched) {
    name = nameMatched || name || 'nil'
    try {
      return stringBundle.GetStringFromName(name)
    } catch (e) { Cu.reportError(e) }
    return '__' + name + '__'
  }

  function getTimestampFromISO8601 (iso8601Duration) {
    const matches = iso8601Duration.match(/(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/)
    if (matches[8]) {
      if (matches[7]) {
        if (matches[6]) {
          return pad(matches[6]) + ':' + pad(matches[7]) + ':' + pad(matches[8])
        }
        return pad(matches[7]) + ':' + pad(matches[8])
      }
      return pad(matches[8]) + 's'
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
    const videoUrl = 'https://www.youtube.com/watch?v=' + videoId
    if (playlistId) return videoUrl + '&list=' + playlistId
    return videoUrl
  }

  function isVideoUrl (url) {
    return /^(?:(?:(?:view-source:)?https?:)?\/\/)?(?:(?:www\.|m\.)?(?:youtube|youtube-nocookie)\.com\/(?:watch\?|embed\/|v\/|attribution_link\?a)|youtu\.be\/|\/watch\?|.+%2[Ff]watch%3[Ff][Vv]%3[Dd])/.test(url)
  }

  function makeYouTubeVideoPageTitleClickable () {
    if (!getPref('videoLinkChangeEnabled')) return
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
      const a = document.createElement('a')
      a.className = 'yt2p-send-override'
      if (getPref('videoLinkChangeType') === 0) {
        a.classList.add('yt2p-glow')
      } else {
        a.classList.add('yt2p-underline')
      }
      a.href = window.location.href
      a.onclick = onVideoLinkClick
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
    iframe.src = 'https://www.youtube.com/embed/' + getVideoIdFromUrl(videoUrl)
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
    const url = 'https://www.youtube.com/v/' + videoId + '&amp;version=3'
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

  function newFilElement (videoUrl) {
    const filDiv = document.createElement('div')
    filDiv.className = 'yt2p-video yt2p-fil'
    const videoA = document.createElement('a')
    videoA.className = 'yt2p-video-link'
    videoA.href = getStandardisedVideoUrl(videoUrl)
    videoA.onclick = onFilVideoLinkClick
    filDiv.appendChild(videoA)
    const videoId = getVideoIdFromUrl(videoUrl)
    let done1 = false
    let videoItem
    function onError () {
      updateFilDivWithErrorMessage(filDiv)
    }
    function step2 () {
      updateFilDivFromVideoItem(filDiv, videoItem)
      fetchChannelItem(videoItem.snippet.channelId, item => {
        updateFilDivFromChannelItem(filDiv, item)
      }, onError)
    }
    fetchVideoImage(videoId, image => {
      videoA.appendChild(image)
      if (done1) step2()
      done1 = true
    }, onError)
    fetchVideoItem(videoId, item => {
      videoItem = item
      if (done1) step2()
      done1 = true
    }, onError)
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
    if (getPref('embeddedVideoChangeEnabled')) {
      if (/IFRAME|OBJECT|EMBED/.test(node.tagName) &&
          (node.parentElement && node.parentElement.tagName !== 'OBJECT')) {
        onEmbeddedVideo(node)
      } else {
        $$('iframe, object, embed', node).forEach(onEmbeddedVideo)
      }
    }
    if (getPref('videoLinkChangeEnabled')) {
      if (node.tagName === 'A') {
        onVideoLink(node)
      } else {
        $$('a', node).forEach(onVideoLink)
      }
    }
  }

  function onContentFrameLoad (event) {
    if (event.originalTarget.nodeName !== '#document') return
    document = event.originalTarget
    if (!document.body) return
    window = document.defaultView
    if (isVideoUrl(window.location.href)) {
      makeYouTubeVideoPageTitleClickable()
    }
    window.doneVideoIds = []
    if (THUNDERBIRD) {
      const base = $('base')
      if (base && isVideoUrl(base.href)) {
        const filElement = newFilElement(base.href)
        filElement.classList.add('yt2p-mail-node')
        document.body.textContent = ''
        document.body.appendChild(filElement)
        return
      }
      $$('a > img').forEach(img => {
        const matches = img.src.match(/^(?:https?:)?\/\/img\.youtube\.com\/vi\/(.*)\/0\.jpg$/)
        if (!matches) return
        const videoId = matches[1]
        if (!videoId) return
        const videoUrl = getVideoUrlFromId(videoId)
        const filElement = newFilElement(videoUrl)
        const a = img.parentElement
        a.parentElement.replaceChild(filElement, a)
      })
    }
    if (getPref('embeddedVideoChangeEnabled')) {
      $$('iframe, object, :not(object) > embed').forEach(onEmbeddedVideo)
    }
    if (getPref('videoLinkChangeEnabled')) {
      $$('a').forEach(onVideoLink)
    }
    if (!getPref('embeddedVideoChangeEnabled') &&
        !getPref('videoLinkChangeEnabled') &&
        !getPref('videoLinkClickChangeEnabled')) return
    global.yt2pMutationObserver = new window.MutationObserver(mutations => {
      mutations.forEach(mutation => {
        for (let node of mutation.addedNodes) onAddedNode(node)
      })
    }).observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  function onContentFrameUnload () {
    global.removeEventListener('DOMContentLoaded', onContentFrameLoad)
    if (global.yt2pMutationObserver) {
      global.yt2pMutationObserver.disconnect()
      delete global.yt2pMutationObserver
    }
    delete window.doneVideoIds
    $$('.yt2p-replaced').forEach(element => {
      element.classList.remove('yt2p-replaced')
      const replacement = element.previousElementSibling
      if (!replacement) return
      if (!replacement.className.startsWith('yt2p')) return
      replacement.parentElement.removeChild(replacement)
    })
    document = null
    window = null
  }

  function onEmbeddedVideo (element) {
    if (!getPref('embeddedVideoChangeEnabled')) return
    if (/yt2p-/.test(element.className)) return
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
    while (parent.childNodes.length === 1 && parent.tagName !== 'CENTER') {
      element = parent
      parent = element.parentElement
    }
    const changeType = getPref('embeddedVideoChangeType')
    if (changeType === 0 ||
        window.doneVideoIds.some(id => id === videoId)) {
      const a = document.createElement('a')
      a.className = 'yt2p-link'
      if (getPref('videoLinkChangeType') === 0) {
        a.classList.add('yt2p-glow')
      } else {
        a.classList.add('yt2p-underline')
      }
      a.href = getVideoUrlFromId(videoId)
      a.textContent = videoId
      a.onclick = onVideoLinkClick
      parent.replaceChild(a, element)
      return
    }
    window.doneVideoIds.push(videoId)
    if (changeType === 1) {
      const object = newEmbeddedVideoObject(videoId)
      parent.replaceChild(object, element)
      return
    }
    if (changeType === 2) {
      parent.replaceChild(newFilElement(videoUrl), element)
      if (parent.classList) parent.classList.add('yt2p-video-parent')
      // parent.insertBefore(newFilElement(videoUrl), element)
      // element.classList.add('yt2p-replaced')
    }
  }

  function onFilVideoLinkClick (event) {
    if (!getPref('filClickChangeEnabled')) return
    event.preventDefault()
    event.stopPropagation()
    const filA = event.currentTarget
    const filElement = filA.parentElement
    const parentElement = filElement.parentElement
    const changeType = getPref('filClickChangeType')
    if (changeType === 0) {
      sendVideoUrlToPlayer(filA.href)
      return false
    }
    if (changeType === 1) {
      const videoElement = newEmbeddedVideoElement(filA.href)
      parentElement.replaceChild(videoElement, filElement)
      return false
    }
    if (changeType === 2) {
      const videoId = getVideoIdFromUrl(filA.href)
      const a = document.createElement('a')
      a.href = getVideoUrlFromId(videoId)
      a.classList.add('yt2p-link')
      a.classList.add('yt2p-glow')
      a.textContent = videoId
      a.onclick = onVideoLinkClick
      parentElement.replaceChild(a, filElement)
    }
    return false
  }

  function onVideoLink (a) {
    if (!getPref('videoLinkChangeEnabled')) return
    if (!isVideoUrl(a.href)) return
    if (/yt2p-|ytp-button|iv-promo-txt/.test(a.className)) return
    if (/comment-renderer-time|submessage/.test(a.parentElement.className)) return
    if (/YT-FORMATTED-STRING/.test(a.parentElement.tagName)) return
    // if (videoLinkType === 0/* || !isElementTextOnly(a) */) {
    //   makeAnchorClickSend(a)
    //   return
    // }
    const videoId = getVideoIdFromUrl(a.href)
    const changeType = getPref('videoLinkChangeType')
    if (changeType === 0 || changeType === 3 ||
        /ytp-|yt-uix-|yt-simple-/.test(a.className) ||
        /c-detail__title/.test(a.parentElement.className) ||
        window.doneVideoIds.some(id => id === videoId)) {
      if (/ytp-/.test(a.className)) {
        const newA = a.cloneNode(true)
        a.parentElement.insertBefore(newA, a.nextElementSibling)
        a.classList.add('yt2p-replaced')
        newA.classList.add('yt2p-link')
        newA.classList.add(changeType === 0 ? 'yt2p-glow' : 'yt2p-underline')
        if (isVideoUrl(a.textContent)) {
          newA.textContent = getVideoIdFromUrl(a.href)
        }
        newA.onclick = onVideoLinkClick
        return
      }
      a.classList.add('yt2p-link')
      a.classList.add(changeType === 0 ? 'yt2p-glow' : 'yt2p-underline')
      if (isVideoUrl(a.textContent) &&
          !window.location.href.startsWith('view-source:')) {
        a.textContent = getVideoIdFromUrl(a.href)
      }
      a.onclick = onVideoLinkClick
      return
    }
    a.classList.add('yt2p-replaced')
    if (changeType === 1) {
      window.doneVideoIds.push(videoId)
      const videoElement = newEmbeddedVideoElement(a.href)
      a.parentElement.insertBefore(videoElement, a.nextElementSibling)
      a.parentElement.classList.add('yt2p-video-parent')
      onVideoLink(a)
      return
    }
    if (changeType === 2) {
      window.doneVideoIds.push(videoId)
      if (a.textContent !== a.href && a.textContent !== videoId) {
        const textDiv = document.createElement('div')
        textDiv.className = 'yt2p-remaining-text'
        textDiv.textContent = a.textContent
        a.parentElement.insertBefore(textDiv, a)
      }
      a.parentElement.insertBefore(newFilElement(a.href), a)
      a.parentElement.classList.add('yt2p-video-parent')
    }
  }

  function onVideoLinkClick (event) {
    if (!getPref('videoLinkClickChangeEnabled')) return
    event.preventDefault()
    event.stopPropagation()
    const a = event.currentTarget
    const changeType = getPref('videoLinkClickChangeType')
    if (changeType === 0 ||
        /ytp-|yt-uix-|yt-simple-|yt2p-send-override/.test(a.className)) {
      sendVideoUrlToPlayer(a.href)
      return false
    }
    if (changeType === 1) {
      a.parentElement.replaceChild(newEmbeddedVideoElement(a.href), a)
      return false
    }
    if (changeType === 2) {
      a.parentElement.replaceChild(newFilElement(a.href), a)
    }
    return false
  }

  function sendVideoUrlToPlayer (videoUrl) {
    global.sendAsyncMessage('yt2p-sendToPlayer', { videoUrl: videoUrl })
  }

  function updateFilDivFromChannelItem (filDiv, item) {
    const channelA = document.createElement('a')
    channelA.className = 'yt2p-channel-link'
    channelA.href = 'https://www.youtube.com/channel/' + item.id + '/videos'
    channelA.title = item.snippet.title + '\n 🎞 ' + parseInt(item.statistics.videoCount).toLocaleString() + item.statistics.hiddenSubscriberCount ? '' : '   👤  ' + parseInt(item.statistics.subscriberCount).toLocaleString() + ' ' + item.snippet.description ? '\n\n' + item.snippet.description : ''
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
    const viewsString = viewCount + ' 👁'
    const viewsDiv = document.createElement('div')
    viewsDiv.className = 'yt2p-text yt2p-views'
    viewsDiv.textContent = viewsString
    videoA.appendChild(viewsDiv)
    const durationString = '⌚ ' + getTimestampFromISO8601(item.contentDetails.duration)
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
    publishedAtDiv.style.left = (20 + viewsWidth) + 'px'
    publishedAtDiv.style.width = publishedAtWidth + 'px'
    publishedAtDiv.style.maxWidth = publishedAtWidth + 'px'
    videoA.appendChild(publishedAtDiv)
    const likeCount = parseInt(item.statistics.likeCount)
    const dislikeCount = parseInt(item.statistics.dislikeCount)
    const likesWidth = Math.floor(likeCount / (likeCount + dislikeCount) * 480)
    if (likesWidth > 0) {
      const likesDiv = document.createElement('div')
      likesDiv.className = 'yt2p-votebar yt2p-likes'
      likesDiv.style.width = likesWidth + 'px'
      videoA.appendChild(likesDiv)
      if (likesWidth < 480) {
        const dislikesDiv = document.createElement('div')
        dislikesDiv.className = 'yt2p-votebar yt2p-dislikes'
        dislikesDiv.style.width = (480 - likesWidth) + 'px'
        videoA.appendChild(dislikesDiv)
      }
    }
  }

  function updateFilDivWithErrorMessage (filDiv) {
    filDiv.classList.add('yt2p-error')
    const videoA = $('.yt2p-video-link', filDiv)
    const textDiv = document.createElement('div')
    textDiv.className = 'yt2p-text yt2p-title'
    textDiv.textContent = '⚠ ' + getString('videoNotFoundAlert')
    videoA.appendChild(textDiv)
  }
})(this)
