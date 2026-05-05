# iPhone 直接使用说明

结论：iPhone 不能像 Android APK 那样直接安装一个未签名文件。苹果手机能直接用的现实方案是网页/PWA。

## 能做到的方式

把 `dist/` 部署成一个网页链接。同学用 iPhone Safari 打开链接即可刷题，不需要安装 Node.js，不需要配置环境，不需要和电脑在同一个网络。

第一次打开需要有网络。打开成功后可以添加到主屏幕，之后可以离线使用。

## 你要做的步骤

1. 在项目根目录构建：

```bash
npm run build
```

2. 把 `dist/` 文件夹上传到 Netlify、Vercel 或 GitHub Pages。
3. 把生成的网址发给同学。

## 同学 iPhone 上的步骤

1. 用 Safari 打开你发的网址。
2. 等首页正常显示。
3. 点击 Safari 底部分享按钮。
4. 选择“添加到主屏幕”。
5. 以后从桌面图标打开即可刷题。

## 不能做到的方式

不能发一个普通文件让 iPhone 像安装 APK 一样直接安装。iOS 原生安装包必须是签名后的 IPA，并且通常需要 App Store、TestFlight、企业签名或 Apple Developer 账号。
