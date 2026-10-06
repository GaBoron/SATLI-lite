# SATLI lite

[SATLI](https://github.com/GaBoron/SATLI) 的 Millennium 插件版，在 Steam 库存中获取和应用社区成就翻译。管理、预览和设置都在 Steam 内完成。

## 使用

需要 Millennium 3.5.0 或更高版本。插件按官方 Starlight 结构开发，可手动安装，不依赖 Millennium 插件商店。

1. 从本项目的构建产物或 [GitHub Releases](https://github.com/GaBoron/SATLI-lite/releases) 获取 `satli-lite.star`。
2. 将文件放入 `<Millennium>/plugins/satli-lite.star`，在 Millennium 中启用 SATLI lite，然后重启 Steam。
3. 打开库存游戏页，点击“成就翻译”；也可以从 Millennium 的 SATLI lite 设置页打开“管理译本”。
4. 管理界面默认显示“我的库存”中已有译本的游戏，包含尚未安装的游戏。也可浏览全部社区译本或已下载的本地译本，选择译本与语言，预览后点击“下载并应用”。已下载的游戏可切换译本、停用翻译或恢复上一版。

库存按钮依赖 Steam 当前页面结构。按钮未出现时，可使用插件设置页入口；实际 Steam 中的按钮、成就通知、覆盖层及内嵌网页覆盖仍需验收。

## 功能

- 按游戏名或 App ID 搜索，筛选我的库存、已下载译本，或只看已安装的游戏。
- 选择不同译本与语言，预览成就名称、描述和英文参考；展示贡献者和来源链接。
- 识别库存中已被翻译库收录的游戏，包含未安装的游戏；批量下载默认语言译本，更新已下载译本，并支持停止后续下载。
- 缓存译本供离线使用，启用或停用显示替换，恢复上一版。
- 编辑单项成就，导入或导出翻译 JSON；本地编辑不会被自动译本更新覆盖。
- 从本项目 GitHub 正式 Release 自动更新插件，保留旧包，重启 Steam 后生效。
- 使用 GitHub 或自定义 HTTPS 翻译库镜像；网络代理沿用 Millennium 设置。

显示替换范围与 SATLI 内置 Millennium 插件一致：自己的成就、好友成就、游戏会话历史、应用详情、库存成就与活动缓存，以及桌面、游戏内和 Big Picture 成就通知。活动页与 Steam 内嵌网页还使用整页精确文本覆盖，不依赖成就区域的类名。插件的预览与编辑界面不参与替换。

它只替换显示文本，保留解锁状态、进度和图标。停用后，已呈现的部分成就卡片可能需要切换页面才能重新显示原文。

本插件使用翻译库自动生成的 JSON，不读写本机成就 BIN。完整 BIN/ZIP 制作与投稿仍可使用 SATLI 或 [Steam Achievement Localizer Skill](https://github.com/GaBoron/steam-achievement-localizer-skill)。

## 数据源与更新

默认使用 [Steam 成就翻译库](https://github.com/GaBoron/steam-achievement-translation-library) 的 Catalog V2。每个版本需包含 `json` 元数据及 `UserGameStatsSchema_<app_id>.json` 配套文件。尚未发布 JSON 的数据源会显示提示，插件不会改用 BIN。

自动检查在启动后及每六小时运行。社区译本自动更新默认关闭；插件自动更新默认开启，可在设置中更改。自更新只接受本项目的正式 GitHub Release，需要其提供本项目构建生成的 `update.json`。

## 构建

使用 Node.js 20 或更高版本，在仓库根目录运行：

```powershell
npm ci
npm run typecheck
npm run build
```

产物为 `dist/satli-lite.star` 和 `dist/update.json`。版本以 `millennium.toml` 为唯一来源。构建会生成前后端版本常量，并执行 Starlight 包校验。

开发结构、数据保存位置、发布资产及验证边界见 [开发说明](docs/development.md)。

## 隐私与许可

本地设置、译本、编辑历史及旧插件包保存在 `<Millennium>/config/satli-lite/`。网络请求用于翻译库及插件更新；游戏列表在本机读取。日志交由 Millennium 管理，只记录工作流起止与错误，不记录成就文本、凭据或反馈内容。翻译请愿与报告入口只打开表单，由用户提交。

代码采用 [MIT License](LICENSE)。显示覆盖模块改编自 SATLI；译本中的贡献者自有部分与第三方游戏内容遵循 [翻译库权利声明](https://github.com/GaBoron/steam-achievement-translation-library/blob/main/LICENSE.md)。
