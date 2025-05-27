## 📺 项目简介

LibreTV-App 是一个免费的在线视频搜索与观看平台。本项目是经典 [LibreTV](https://github.com/LibreSpark/LibreTV) 项目的重构版本，使用 [Tauri 2.0](https://tauri.app/) 框架开发，实现了跨平台支持（Windows, macOS, Linux, Android, iOS）。

与原版 LibreTV 相比，LibreTV-App 具有以下主要特点：
- **跨平台原生应用**：基于 Tauri 2.0 构建，提供接近原生的性能和体验。直接安装即可使用，无需像原版 LibreTV 那样部署 Web 服务端。
- **移动端深度优化**：UI 界面特别为移动设备优化适配，提升小屏幕用户体验。
- **增强的浏览与筛选**：首页采用瀑布流布局展示热门内容，并提供高级类型筛选功能，助您快速发现喜爱内容。


<details>
  <summary>点击查看项目截图 (桌面端与移动端)</summary>

  <p><strong>桌面端截图：</strong></p>
  
  ![](https://oss.keyrotate.com/public/images/ba3b8db9-fe4b-41ab-9974-0bad5a42ecd2.jpg)
  
  ![](https://oss.keyrotate.com/public/images/18801ecd-ebbc-4965-a76e-d7f8540012b4.jpg)

  <p><strong>移动端截图：</strong></p>
  
  ![991748248831_.pic_hd](https://oss.keyrotate.com/public/images/b5ea4c07-5e4f-473a-a8f7-36b04995e13c.jpg)
  
  ![1001748248832_.pic](https://oss.keyrotate.com/public/images/f4250a56-f740-4b61-8f16-43da5872bc79.jpg)
  
</details>



## 🚀 如何获取与运行

LibreTV-App 作为跨平台应用，您可以直接从项目的 Releases 页面下载适用于您操作系统的安装包。

安装后即可直接运行，无需额外配置或部署服务器。

## ⚙️ 编译与开发

如果您希望从源代码编译本项目，或者参与开发贡献，请参考详细的 [构建指南 (BUILDING.md)](BUILDING.md)。

## 🔧 自定义配置

### 密码保护 (可选)

LibreTV-App 应用本身支持通过设置密码来保护访问。此功能通常在应用内的设置中配置。

### API兼容性

LibreTV-App 支持标准的苹果 CMS V10 API 格式。添加自定义 API 时需遵循以下格式：
- 搜索接口: `https://example.com/api.php/provide/vod/?ac=videolist&wd=关键词`
- 详情接口: `https://example.com/api.php/provide/vod/?ac=detail&ids=视频ID`

**添加 CMS 源**:
1. 在设置面板中选择"自定义接口"
2. 接口地址只需填写到域名部分: `https://example.com`（不要包含`/api.php/provide/vod`部分）

## ⚠️ 免责声明

LibreTV-App (基于原 LibreTV 项目) 仅作为视频搜索工具，不存储、上传或分发任何视频内容。所有视频均来自第三方 API 接口提供的搜索结果。如有侵权内容，请联系相应的内容提供方。

本项目开发者不对使用本项目产生的任何后果负责。使用本项目时，您必须遵守当地的法律法规。
