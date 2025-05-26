// DPlayer Handler Logic

// Assumes dp, currentHls, adFilteringEnabled, autoplayEnabled, currentVideoUrl, 
// currentVideoTitle, currentEpisodeIndex, currentEpisodes,
// isUserSeeking, videoHasEnded, userClickedPosition are global (from player_vars.js)
// Assumes showError, showPositionRestoreHint, setupProgressBarPreciseClicks, saveToHistory, 
// startProgressSaveInterval, setupLongPressSpeedControl, playNextEpisode are global or imported.

function initPlayer(videoUrl, sourceCode) {
    if (!videoUrl) return;

    let dplayerErrorTimeout = null;
    let hlsPlaybackStarted = false; 
    let errorDisplayedGlobal = false;

    hlsPlaybackStarted = false; errorDisplayedGlobal = false;
    document.getElementById('error').style.display = 'none';
    const loadingDivInit = document.getElementById('loading');
    if(loadingDivInit) {
        loadingDivInit.style.display = 'flex';
        // Ensure only spinner is shown initially
        loadingDivInit.innerHTML = `<div class="loading-spinner"></div>`; 
    }

    const hlsConfig = {
        debug: false,
        loader: adFilteringEnabled ? CustomHlsJsLoader : Hls.DefaultConfig.loader,
        enableWorker: true, lowLatencyMode: false, backBufferLength: 90,
        maxBufferLength: 30, maxMaxBufferLength: 60, maxBufferSize: 30 * 1000 * 1000,
        maxBufferHole: 0.5, fragLoadingMaxRetry: 6, fragLoadingMaxRetryTimeout: 64000,
        fragLoadingRetryDelay: 1000, manifestLoadingMaxRetry: 3, manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 4, levelLoadingRetryDelay: 1000, startLevel: -1,
        abrEwmaDefaultEstimate: 500000, abrBandWidthFactor: 0.95, abrBandWidthUpFactor: 0.7,
        abrMaxWithRealBitrate: true, stretchShortVideoTrack: true, appendErrorMaxRetry: 5,
        liveSyncDurationCount: 3, liveDurationInfinity: false
    };
    
    dp = new DPlayer({
        container: document.getElementById('player'),
        autoplay: true, theme: '#00ccff', preload: 'auto', loop: false, lang: 'zh-cn', 
        hotkey: true, mutex: true, volume: 0.7, screenshot: true, 
        preventClickToggle: false, airplay: true, chromecast: true,
        contextmenu: [
            { text: '关于 LibreTV', link: 'https://github.com/LibreSpark/LibreTV' },
            { text: '问题反馈', click: () => window.open('https://github.com/LibreSpark/LibreTV/issues', '_blank') }
        ],
        video: {
            url: videoUrl,
            type: 'hls',
            pic: 'image/nomedia.png',
            customType: {
                hls: function(videoElement, playerInstance) { // Corrected parameters for DPlayer customType
                    if (currentHls && currentHls.destroy) { 
                        try { currentHls.destroy(); } catch (e) { console.warn('销毁旧HLS实例出错:', e); }
                    }
                    const hls = new Hls(hlsConfig); 
                    currentHls = hls;
                    let errorCount = 0;
                    let bufferAppendErrorCount = 0;
                    
                    videoElement.addEventListener('playing', function() {
                        hlsPlaybackStarted = true; 
                        errorDisplayedGlobal = false;
                        document.getElementById('loading').style.display = 'none';
                        document.getElementById('error').style.display = 'none';
                        if (dplayerErrorTimeout) { clearTimeout(dplayerErrorTimeout); dplayerErrorTimeout = null; }
                    });
                    videoElement.addEventListener('timeupdate', function() { 
                        if (videoElement.currentTime > 1) {
                            document.getElementById('error').style.display = 'none';
                        } 
                    });

                    hls.loadSource(videoElement.src); // Use videoElement.src
                    hls.attachMedia(videoElement);
                    
                    const sourceElementForAirplay = document.createElement('source'); 
                    sourceElementForAirplay.src = videoUrl; 
                    videoElement.appendChild(sourceElementForAirplay); 
                    videoElement.disableRemotePlayback = false;
                    
                    hls.on(Hls.Events.MANIFEST_PARSED, function() { 
                        if (autoplayEnabled) {
                           videoElement.play().catch(e => console.warn('自动播放被阻止:', e));
                        }
                    });
                    
                    hls.on(Hls.Events.ERROR, function(event, data) { 
                        console.log('HLS事件:', event, '数据:', data);
                        errorCount++;
                        if (data.details === 'bufferAppendError') {
                            bufferAppendErrorCount++;
                            console.warn(`bufferAppendError 发生 ${bufferAppendErrorCount} 次`);
                            if (hlsPlaybackStarted) {
                                console.log('视频已在播放中，忽略bufferAppendError');
                                return;
                            }
                            if (bufferAppendErrorCount >= 3) {
                                hls.recoverMediaError();
                            }
                        }
                        if (data.fatal && !hlsPlaybackStarted) {
                            console.error('致命HLS错误:', data);
                            switch(data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    console.log("尝试恢复网络错误");
                                    hls.startLoad(); 
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    console.log("尝试恢复媒体错误");
                                    hls.recoverMediaError(); 
                                    break;
                                default:
                                    if (errorCount > 3 && !errorDisplayedGlobal) {
                                        showError('视频加载失败，可能是格式不兼容或源不可用 (HLS error)');
                                    }
                                    break;
                            }
                        }
                    });
                    hls.on(Hls.Events.FRAG_LOADED, () => { document.getElementById('loading').style.display = 'none'; });
                    hls.on(Hls.Events.LEVEL_LOADED, () => { document.getElementById('loading').style.display = 'none'; });
                }
            } // Explicitly no comma after customType if it's the last property of video
        } // Explicitly no comma after video if it's the last property of DPlayer options
    });

    dp.on('fullscreen', async () => { /* ... Tauri fullscreen logic ... */ });
    dp.on('fullscreen_cancel', async () => { /* ... Tauri fullscreen_cancel logic ... */ });
    
    dp.on('loadedmetadata', function() {
        hlsPlaybackStarted = true; errorDisplayedGlobal = false;
        if (dplayerErrorTimeout) { clearTimeout(dplayerErrorTimeout); dplayerErrorTimeout = null; }
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'none';
        videoHasEnded = false;

        const urlParams = new URLSearchParams(window.location.search);
        const savedPosition = parseInt(urlParams.get('position') || '0');
        if (savedPosition > 10 && dp && dp.video && dp.video.duration > 0 && savedPosition < dp.video.duration - 2) {
            dp.seek(savedPosition); 
            if(typeof showPositionRestoreHint === 'function') showPositionRestoreHint(savedPosition);
        } else {
            try {
                const progressKey = 'videoProgress_' + currentVideoUrl;
                const progressStr = localStorage.getItem(progressKey);
                if (progressStr && dp && dp.video && dp.video.duration > 0) {
                    const progress = JSON.parse(progressStr);
                    if (progress && typeof progress.position === 'number' && progress.position > 10 && progress.position < dp.video.duration - 2) {
                        dp.seek(progress.position); 
                        if(typeof showPositionRestoreHint === 'function') showPositionRestoreHint(progress.position);
                    }
                }
            } catch (e) { /* ignore */ }
        }
        
        // Enhanced autoplay logic
        if (autoplayEnabled && dp && dp.video && dp.video.paused) {
            console.log('[PlayerJS] loadedmetadata: Attempting dp.play() due to autoplayEnabled.');
            dp.play().catch(e => {
                console.warn("Autoplay attempt on loadedmetadata failed. This might be due to browser policy requiring user interaction.", e);
                // Optionally, you could show a "Click to play" button if autoplay is blocked.
            });
        }

        if(typeof setupProgressBarPreciseClicks === 'function') setupProgressBarPreciseClicks();
        setTimeout(saveToHistory, 3000);
        startProgressSaveInterval();
    });

    dp.on('error', function() { /* ... DPlayer error handling ... */ });
    setupLongPressSpeedControl();
    dp.on('seeking', function() { /* ... seeking logic ... */ });
    dp.on('seeked', function() { /* ... seeked logic ... */ });
    dp.on('ended', function() { /* ... ended logic ... */ });
    dp.on('timeupdate', function() { if (dp.video && dp.duration > 0 && isUserSeeking && dp.video.currentTime > dp.video.duration * 0.95) videoHasEnded = false; });
    dp.on('playing', () => { if(dp.video) dp.video.addEventListener('dblclick', () => dp.fullScreen.toggle()); });

    // Function to add custom video view mode settings
    function addCustomVideoViewSettings(playerInstance) {
        if (!playerInstance || !playerInstance.template || !playerInstance.template.settingBox) {
            console.warn('DPlayer instance or template not ready for custom settings.');
            return;
        }

        const originPanel = playerInstance.template.settingBox.querySelector('.dplayer-setting-origin-panel');
        if (!originPanel) {
            console.warn('DPlayer setting origin panel not found.');
            return;
        }

        const videoElement = playerInstance.video;
        let currentVideoMode = localStorage.getItem('dplayer-video-mode') || 'contain'; // Default to 'contain'

        const createSettingItem = (label, mode) => {
            const item = document.createElement('div');
            item.classList.add('dplayer-setting-item');
            item.classList.add(`dplayer-setting-video-mode-${mode}`); // For specific styling if needed
            
            const labelSpan = document.createElement('span');
            labelSpan.classList.add('dplayer-label');
            labelSpan.textContent = label;
            item.appendChild(labelSpan);

            // Add a toggle-like element for visual feedback (checkmark)
            const toggleDiv = document.createElement('div');
            toggleDiv.classList.add('dplayer-toggle'); // Use existing DPlayer toggle style
            // We'll manually manage the 'checked' state via a custom class or direct style
            item.appendChild(toggleDiv);


            item.addEventListener('click', () => {
                videoElement.style.objectFit = mode;
                currentVideoMode = mode;
                localStorage.setItem('dplayer-video-mode', mode);
                updateActiveStates();
                // Optionally, hide the settings panel after selection
                if (playerInstance.setting && typeof playerInstance.setting.hide === 'function') {
                    playerInstance.setting.hide();
                }
            });
            return item;
        };

        const modes = [
            { label: playerInstance.tran('默认模式') || '默认模式', mode: 'contain' }, // Assuming 'contain' is default
            { label: playerInstance.tran('画面裁剪') || '画面裁剪', mode: 'cover' },
            { label: playerInstance.tran('画面拉伸') || '画面拉伸', mode: 'fill' }
        ];

        const settingItems = [];

        modes.forEach(m => {
            const newItem = createSettingItem(m.label, m.mode);
            originPanel.appendChild(newItem);
            settingItems.push(newItem);
        });
        
        function updateActiveStates() {
            settingItems.forEach(item => {
                const itemMode = item.classList.contains('dplayer-setting-video-mode-contain') ? 'contain' :
                                 item.classList.contains('dplayer-setting-video-mode-cover') ? 'cover' : 'fill';
                const toggleDiv = item.querySelector('.dplayer-toggle');

                if (itemMode === currentVideoMode) {
                    item.classList.add('dplayer-setting-item-active'); // Custom active class
                    if (toggleDiv) {
                        // Simulate a checked state for DPlayer's toggle
                        // This requires DPlayer's CSS to have a style for .dplayer-toggle when parent is .dplayer-setting-item-active
                        // Or, we add a specific checkmark SVG or text
                        toggleDiv.innerHTML = '✓'; // Simple checkmark, can be replaced with SVG
                        toggleDiv.style.color = playerInstance.options.theme || '#fff'; // Use theme color for checkmark
                    }
                } else {
                    item.classList.remove('dplayer-setting-item-active');
                    if (toggleDiv) {
                        toggleDiv.innerHTML = ''; // Clear checkmark
                    }
                }
            });
        }
        
        // Apply initial style
        videoElement.style.objectFit = currentVideoMode;
        videoElement.style.width = '100%'; // Ensure these for object-fit
        videoElement.style.height = '100%';
        updateActiveStates();

        // Add translations if not present - DPlayer's tran function is instance specific
        if (!c['zh-cn']['默认模式']) { // c is the global translations object in DPlayer
            c['zh-cn']['默认模式'] = '默认模式';
            c['zh-cn']['画面裁剪'] = '画面裁剪';
            c['zh-cn']['画面拉伸'] = '画面拉伸';
        }
         if (playerInstance.options.lang === 'zh-tw' && !c['zh-tw']['默认模式']) {
            c['zh-tw']['默认模式'] = '默認模式';
            c['zh-tw']['畫面裁剪'] = '畫面裁剪';
            c['zh-tw']['畫面拉伸'] = '畫面拉伸';
        }
    }

    // Call this after DPlayer is fully initialized
    // DPlayer might take a moment to render its DOM, so a slight delay can be safer.
    dp.on('loadedmetadata', function() { // Or another event that ensures DOM is ready
        setTimeout(() => {
            addCustomVideoViewSettings(dp);
        }, 100); // Small delay to ensure DPlayer UI is built
    });


    setTimeout(function() {
        if (dp && dp.video && dp.video.currentTime > 0) return;
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv && loadingDiv.style.display !== 'none') {
            loadingDiv.innerHTML = `
                <div class="loading-spinner"></div>
                <div style="font-size: 12px; color: #aaa; margin-top: 10px;">如长时间无响应，请尝试其他视频源</div>
            `; // Ensured "视频加载时间较长..." is removed
        }
    }, 10000);
    // Tauri fullscreen binding - this was a self-invoking function, ensure it's correctly placed or called if needed.
    // For now, assuming its internal logic is self-contained and correct as per original file.
    // If it was (function(){ ... })(); then it's fine.
    // If it was just a function definition, it needs to be called: initTauriFullscreen();
    // Based on previous full file, it was a self-invoking function.
    (function(){ 
        const fsContainer = document.getElementById('playerContainer');
        if (!dp || !fsContainer) return; // Guard against dp or container not being ready
        dp.on('fullscreen', async () => { 
            try {
                let success = false;
                if (window.__TAURI__ && window.__TAURI__.window) {
                    if (window.__TAURI__.window.appWindow) { 
                        await window.__TAURI__.window.appWindow.setFullscreen(true);
                        success = true;
                    } else if (window.__TAURI__.window.getCurrent) { 
                        const { getCurrent } = window.__TAURI__.window;
                        await getCurrent().setFullscreen(true);
                        success = true;
                    }
                }
                // For web/PWA, try to fullscreen the entire document element for better immersive experience
                const elementToFullscreen = document.documentElement;
                if (!success && elementToFullscreen && typeof elementToFullscreen.requestFullscreen === 'function') {
                    // 尝试请求带有隐藏导航栏选项的全屏
                    elementToFullscreen.requestFullscreen({ navigationUI: "hide" }).catch(err => {
                        console.warn('Document fullscreen with navigationUI: "hide" failed, trying without:', err);
                        // 如果带选项的请求失败 (例如浏览器不支持此选项)，则回退到不带选项的请求
                        elementToFullscreen.requestFullscreen().catch(e => console.warn('Fallback document fullscreen failed:', e));
                    });
                } else if (!success && fsContainer.requestFullscreen) { // Fallback to fsContainer if documentElement somehow fails
                    fsContainer.requestFullscreen({ navigationUI: "hide" }).catch(err => {
                        console.warn('Element fullscreen with navigationUI: "hide" failed, trying without:', err);
                        fsContainer.requestFullscreen().catch(e => console.warn('Fallback element fullscreen failed:', e));
                    });
                }
                document.body.classList.add('dplayer-custom-fullscreen-mode');
                const playerHeaderOnEnter = document.querySelector('.player-header');
                if (playerHeaderOnEnter) {
                    playerHeaderOnEnter.style.display = 'none';
                }
            } catch (err) {
                console.error('Error setting Tauri window to fullscreen or web fullscreen:', err);
                const elementToFullscreenCatch = document.documentElement;
                // 确保在顶层 catch 中也有回退
                if (elementToFullscreenCatch && typeof elementToFullscreenCatch.requestFullscreen === 'function') {
                     elementToFullscreenCatch.requestFullscreen({ navigationUI: "hide" }).catch(err_fallback => {
                        console.warn('Fallback document fullscreen with navigationUI: "hide" in catch failed, trying without:', err_fallback);
                        elementToFullscreenCatch.requestFullscreen().catch(e => console.warn('Fallback document fullscreen in catch failed:', e));
                    });
                } else if (fsContainer.requestFullscreen) { // Fallback to fsContainer if documentElement somehow fails in catch
                    fsContainer.requestFullscreen({ navigationUI: "hide" }).catch(err_fallback => {
                        console.warn('Fallback element fullscreen with navigationUI: "hide" in catch failed, trying without:', err_fallback);
                        fsContainer.requestFullscreen().catch(e => console.warn('Fallback element fullscreen in catch failed:', e));
                    });
                }
            }
        });
        dp.on('fullscreen_cancel', async () => { 
            try {
                let success = false;
                if (window.__TAURI__ && window.__TAURI__.window) {
                    if (window.__TAURI__.window.appWindow) {
                        await window.__TAURI__.window.appWindow.setFullscreen(false);
                        success = true;
                    } else if (window.__TAURI__.window.getCurrent) {
                        const { getCurrent } = window.__TAURI__.window;
                        await getCurrent().setFullscreen(false);
                        success = true;
                    }
                }
                if (!success && document.exitFullscreen) {
                   document.exitFullscreen().catch(err => console.warn('Document exit fullscreen failed:', err));
                }
                document.body.classList.remove('dplayer-custom-fullscreen-mode');
                const playerHeaderOnExit = document.querySelector('.player-header');
                if (playerHeaderOnExit) {
                    playerHeaderOnExit.style.display = ''; // 恢复默认或CSS类控制的显示
                }
            } catch (err) {
                console.error('Error exiting Tauri window fullscreen:', err);
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(e => console.warn('Fallback document exit fullscreen failed:', e));
                }
            }
        });
    })();
}

class CustomHlsJsLoader extends Hls.DefaultConfig.loader {
    constructor(config) {
        super(config);
        const load = this.load.bind(this);
        this.load = function(context, config, callbacks) {
            if (context.type === 'manifest' || context.type === 'level') {
                const onSuccess = callbacks.onSuccess;
                callbacks.onSuccess = function(response, stats, context) {
                    if (response.data && typeof response.data === 'string') {
                        response.data = filterAdsFromM3U8(response.data, true);
                    }
                    return onSuccess(response, stats, context);
                };
            }
            load(context, config, callbacks);
        };
    }
}

function filterAdsFromM3U8(m3u8Content, strictMode = false) {
    if (!m3u8Content) return '';
    const lines = m3u8Content.split('\n');
    const filteredLines = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.includes('#EXT-X-DISCONTINUITY')) {
            filteredLines.push(line);
        }
    }
    return filteredLines.join('\n');
}
