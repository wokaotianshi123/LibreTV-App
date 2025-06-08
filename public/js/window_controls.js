// 窗口控制按钮功能
// 仅在Tauri桌面应用中显示和启用窗口控制按钮

// 检测是否在Tauri环境中运行
function isTauriApp() {
    try {
        return window.__TAURI__ !== undefined;
    } catch (e) {
        return false;
    }
}

// 初始化窗口控制按钮
function initWindowControls() {
    // 仅在Tauri环境中显示窗口控制按钮
    if (!isTauriApp()) {
        console.log("非Tauri环境，不显示窗口控制按钮");
        return;
    }

    console.log("Tauri环境，初始化窗口控制按钮");
    const windowControls = document.getElementById('window-controls');
    if (windowControls) {
        windowControls.style.display = 'flex';
    }

    try {
        // 获取Tauri窗口对象
        const appWindow = window.__TAURI__.window.getCurrent();

        // 最小化按钮
        const minimizeBtn = document.getElementById('minimize-btn');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', async () => {
                try {
                    await appWindow.minimize();
                } catch (e) {
                    console.error("最小化窗口失败:", e);
                }
            });
        }

        // 最大化/还原按钮
        const maximizeBtn = document.getElementById('maximize-btn');
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', async () => {
                try {
                    const isMaximized = await appWindow.isMaximized();
                    if (isMaximized) {
                        await appWindow.unmaximize();
                        // 更新图标为最大化图标
                        maximizeBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            </svg>
                        `;
                    } else {
                        await appWindow.maximize();
                        // 更新图标为还原图标
                        maximizeBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                                <line x1="3" y1="9" x2="21" y2="9"></line>
                            </svg>
                        `;
                    }
                } catch (e) {
                    console.error("切换最大化状态失败:", e);
                }
            });

            // 初始检查窗口状态并设置正确的图标
            try {
                appWindow.isMaximized().then(isMaximized => {
                    if (isMaximized) {
                        maximizeBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                                <line x1="3" y1="9" x2="21" y2="9"></line>
                            </svg>
                        `;
                    }
                }).catch(e => {
                    console.error("检查窗口最大化状态失败:", e);
                });
            } catch (e) {
                console.error("初始化最大化按钮状态失败:", e);
            }
        }

        // 关闭按钮
        const closeBtn = document.getElementById('close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', async () => {
                try {
                    await appWindow.close();
                } catch (e) {
                    console.error("关闭窗口失败:", e);
                }
            });
        }
    } catch (e) {
        console.error("初始化窗口控制按钮失败:", e);
    }
}

// 在DOM加载完成后初始化窗口控制按钮
document.addEventListener('DOMContentLoaded', initWindowControls);