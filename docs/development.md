# 开发说明

## 模块

遵循 [Millennium 官方插件配置](https://docs.steambrew.app/plugins/structure/config)，使用 Lua 后端、TypeScript/React 前端及 WebKit preload。`frontend/index.tsx` 和 `backend/main.lua` 只负责组装与生命周期。

| 模块 | 职责 |
| --- | --- |
| `backend/catalog.lua`、`network.lua`、`translation_format.lua` | 下载 V2 索引与 JSON，验证身份、大小、成就数和语言 |
| `backend/translations.lua`、`state.lua`、`storage.lua` | 管理启用状态、缓存、本地编辑和历史恢复；写入前验证并备份 |
| `backend/bridge_snapshot.lua` | 将已启用译本投影为显示覆盖快照，并在提交前检查总量 |
| `backend/json_codec.lua`、`vendor/lunajson/` | 随包提供纯 Lua JSON 编解码，保留空数组、空对象和 null；数组长度随编辑变化 |
| `backend/steam_library.lua`、`steam_vdf.lua`、`shared/steam_library_types.ts` | 只读扫描各 Steam 库的安装清单，解析文本 KeyValues，报告未读目录与清单；共享安装状态结构 |
| `backend/updater.lua`、`update_package.lua` | 限定 GitHub 发布来源，验证 STAR 章节与 MessagePack 元数据，备份旧包并替换 |
| `scripts/lua_build.mjs` | 在生成目录准备 Lua 的 UTF-8 字节转义，避免 Starlight 压缩中文字符串时产生乱码 |
| `frontend/plugin_runtime.ts` | 串行协调操作，发布 UI 状态，调度自动更新 |
| `frontend/library_context.ts` | 识别当前库存页并注入管理入口 |
| `frontend/translation_modal.tsx`、`translation_modal.css` | 适配 Steam 内嵌与弹出模态窗口的尺寸、边界和单实例生命周期；统一关闭回调 |
| `frontend/steam_library.ts` | 读取社区 App ID 的 Steam 库存归属，筛选默认语言的批量下载目标 |
| `frontend/translation_panel.tsx`、`game_browser.tsx`、`translation_details.tsx` | 组装 Steam 内的游戏列表与译本详情，隔离选择和异步预览状态 |
| `frontend/translation_choices.ts`、`translation_files.tsx` | 译本与语言选项、缺失选项回退、本地导入与导出 |
| `frontend/ui_controls.tsx`、`styles.css`、`game_browser.css`、`translation_workspace.css`、`translation_preview.css`、`settings.css` | 共用控件与 Steam 深色桌面样式；游戏列表样式与工作区布局分离，统一控件尺寸、操作层级和焦点反馈；尊重减少动画设置 |
| `frontend/stylesheet.ts` | 主文档样式挂载及随设置页、管理面板渲染的样式组件，覆盖不同窗口和 portal |
| `frontend/settings_content.tsx`、`settings_layout.tsx`、`settings_sections.tsx` | 组装设置页；分区标题与横向设置行；翻译、插件更新及镜像配置 |
| `frontend/status_message.tsx` | 将可读操作消息与技术位置分开呈现，错误详情可展开 |
| `frontend/translation_preview.tsx`、`batch_translations.tsx` | 成就对照与编辑、可停止的批量操作 |
| `shared/display_override.ts`、`achievement_record.ts` | API name 对应的文本变换与整页精确 DOM 覆盖 |
| `frontend/achievement_payload.ts`、`achievement_cache.ts`、`steam_api_override.ts` | 适配 Steam 响应、库存缓存与回调 |
| `webview/preload.ts`、`backend/achievement_toast_patch.lua` | 网页加载与成就通知记录的入口 |

显示模块源自 SATLI 的 `satli-display-bridge`。此处改为插件自身下载与持久化译本，不依赖桌面 SATLI 写入桥接文件。前端通过 Starlight 生成的 FFI 调用后端；返回值为 JSON 字符串，不使用已弃用的 `callServerMethod`。

JSON 模块采用 [Lunajson](https://github.com/grafi-tt/lunajson/tree/e3a9666eb1275741e887e29926b144f8daee3bef) 的 decoder 与 encoder，MIT 许可声明随源码打包。不依赖宿主的原生 JSON 模块或额外 DLL。日志使用英文工作流标识，界面文案仍为中文，日志不包含翻译正文或用户输入。

## 翻译数据

读取 `index-v2.json`，推导 `files/<app_id>/<variant_id>/UserGameStatsSchema_<app_id>.json`。`variant.json` 声明 JSON 的格式与字节数，`variant.sha256` 仍表示源 BIN；JSON 中的 `source_sha256` 用于匹配来源与发现译本更新。

配套 JSON 包含格式版本、App ID、版本 ID、源 BIN 标识、语言列表，以及按 API name 索引的 `translations`。格式由翻译库的 `workflow-scripts/translation_json.py` 生成，并纳入刷新、投稿、重命名及仓库检查。插件不会解析 BIN，也不从英文显示文本猜测成就 ID。

显示入口及字段变换与 SATLI 的 `satli-display-bridge` 对齐：自己的成就、好友成就、会话历史、原生应用详情缓存、实时应用详情、加载后的 `achievements`/`achievementmap` 缓存、GameSessions 分组通知，以及 protobuf 成就通知记录补丁。DOM 回退与 SATLI 一样扫描整个文档的文本、`aria-label` 和 `title`，只接受精确匹配且无歧义的源字符串；仅跳过标记为 `data-satli-lite` 的插件界面，保留原文对照和用户编辑。结构化变换仅修改既有文本字段，不改变非文本字段。Steam 的缓存及通知接口可能随客户端更新变化。

管理界面使用 Steam 自身的模态窗口，挂载到插件入口 `window` 所属的模态管理器，不切换到 `findSP()` 返回的其他渲染目标。目标尺寸为 1120×780；宿主采用弹出窗口时，显式传入按屏幕工作区缩减的尺寸，容器以视口尺寸填满客户区域。只使用有限且至少为 320×240 的屏幕尺寸；Millennium 插件上下文返回 1×1 等异常值时，回退到目标窗口尺寸。内嵌窗口以视口尺寸减去外侧边距，保留空白关闭区域。外层尺寸不依赖父级的百分比高度。宿主容器、内容及表单统一使用完整尺寸和 border-box，仅为本插件覆盖 Steam 默认内边距、内层宽度限制和顶部装饰条。弹出窗口可拖动管理界面的标题区域。关闭按钮、Esc、点击空白及宿主关闭都释放同一个会话，关闭可重复调用；不传入会被 Steam 在关闭通知中再次调用的原始 `closeModal`。卸载插件时关闭当前会话。

宽窗口使用游戏列表与详情两栏；窄窗口先显示完整列表，选择游戏后进入详情，返回时保留搜索、筛选与所选译本。标题、搜索、列表和底部操作占用固定的紧凑区域，剩余空间供当前列表或详情独立滚动。社区译本、我的库存与已下载为互斥的列表范围，已安装筛选独立生效。顶部“刷新列表”是统一刷新入口，重新读取安装清单、库存归属与社区索引；网络失败不妨碍先更新本机清单，索引错误仍显示在底部状态中。译本选项包括 Catalog V2 中的所有版本和已安装的本地版本；各版本单独提供语言、说明、来源与更新状态。异步预览在游戏或译本切换后丢弃过期结果。界面共用搜索、按钮、开关及操作状态控件，样式由版本生成脚本合并到同一个包内字符串，不请求外部字体或 UI 库。主文档挂载样式供库存按钮使用；设置页与管理面板还各自渲染 `PanelStylesheet`，让样式跟随实际所在的文档或 portal，并随组件卸载移除。

“我的库存”读取 Steam `appStore.GetAppOverviewByAppID()` 的 `visible_in_game_list` 标记，与 Steam 的库存列表归属一致，包含未安装的游戏。插件全局中没有 `appStore` 时，通过 Millennium 的 `findModuleExport()` 取得同一个库存数据源。默认只列出翻译库已收录或已有本地译本的库存游戏；未收录的其他应用不会加入列表。“社区译本”仍可浏览社区翻译库。“只看已安装”独立使用 `millennium.steam_path()`、`steamapps/libraryfolders.vdf` 和各库中的 `appmanifest_*.acf`，支持多个库目录，避免依赖当前窗口缓存是否已加载安装状态。清单解析只处理文本 KeyValues，不读取成就 BIN，也不修改 Steam 文件。目录或清单未能读取时报告列表可能不完整。

“识别库存游戏”以库存归属与翻译库的交集为目标，批量输入只填入提供 JSON 且支持默认语言的默认译本；结果分别显示收录数和可下载数。库存归属读取失败时提示重试，不将未收录的本机应用加入批量任务。库存归属在打开管理界面、识别库存及成功完成操作时重新读取，不新增持续轮询。

设置页保留 Millennium 的标题与返回入口。仅在侧栏包含本插件设置时，通过作用域选择器扩展其宽度至最多 1000px，并为窄窗口保留边距；离开页面后恢复宿主宽度。页面采用分区标题与设置内容的横向布局，宽度不足时改为纵向排列。译本管理是顶部主入口，下载与启用数量突出数字；窄窗口使用全宽管理按钮。翻译库来源默认折叠，摘要显示 GitHub 或自定义镜像，展开后编辑并保存。批量下载与 App ID 输入相邻；检查更新、镜像保存及批量辅助操作使用次级按钮，发布说明与反馈使用链接。错误显示可读说明，Lua 位置和多行技术信息默认折叠，不改变后端原始错误或操作流程。

## 本地保存

数据目录为 `<Millennium>/config/satli-lite/`：

- `state.json` 保存设置、启用状态及各游戏当前文件引用；`catalog.json` 保存最后成功获取的索引。
- `translations/<app_id>/<variant_id>/` 保存下载文件；`edits/<app_id>/` 保存编辑或导入内容。
- `history/` 保存写入前的文件；每个游戏保留最近十二次状态引用供 UI 回滚。
- `plugin-backups/` 保存自更新前的插件；`updates/` 为更新准备区。

状态写入采用同目录临时文件与重命名，失败时恢复备份。译本操作串行进行；缓存文件在状态提交前写入，失败不会改变当前选择。停用译本会保留文件。当前没有自动清理历史文件的操作。

后台读取仅在快照变化时重新组合译本，前端有防重入和卸载保护。输入 JSON 与显示快照分别限制为 32 MiB，自更新包限制为 16 MiB。界面可停止批量任务的后续下载，已开始的单项请求会完成或超时。

## 插件发布与自更新

运行 `npm run build` 后，在本项目的正式 GitHub Release 中提供同一构建的两个文件：

- `satli-lite.star`，用于手动安装。
- `update.json`，包含格式、插件 ID、三段版本、STAR 大小和 Base64 包体，用于自更新；采用文本传输避免 Lua HTTP RPC 损坏二进制字节。

Release 标签使用 `vMAJOR.MINOR.PATCH`，须与包内及清单版本一致。自更新只查询 `GaBoron/SATLI-lite` 的最新正式 Release，拒绝草稿、预发布、其他来源、插件身份或版本错配、截断及章节校验失败的包。下载包中的 Lua shim 不会在验证期间执行。STAR 的签名策略最终由 Millennium 处理；本项目本地构建为未签名包。

最新 Release 查询返回 HTTP 404 时视为暂无可用更新；其他 HTTP 错误仍显示失败。

安装位置必须为 `<Millennium>/plugins/satli-lite.star`。更新前核对现有包的身份和运行版本，保留旧包，再替换文件；替换失败则恢复旧包。插件不会重启 Steam。源码开发模式不能在未安装 STAR 时执行自更新。

## 检查与实际验收

`npm run typecheck` 检查主前端与 WebKit 类型，`npm run build` 打包并校验全部 STAR 章节。临时模拟环境可以验证 JSON 接受与拒绝、下载与状态变更、编辑与恢复、DOM 文本与属性、API 数据字段保持、文件写入失败及自更新回滚。不要保留持久测试目录。

构建在 `.generated/backend/` 准备 Lua 源码，并生成忽略于 Git 的 `.millennium-build.toml`，只在字符串字面量中转义非 ASCII 字符。维护和类型生成仍使用 `backend/` 原始源码；打包后的中文提示保持 UTF-8。

类型、打包和模拟检查不代表实际 Steam 验收。实际客户端应检查库存页切换、已有缓存、成就侧栏、解锁通知、活动、内嵌网页、离线启动、停用及 Steam 重启；库存按钮失败时可从 Millennium 设置进入同一管理界面。覆盖层与 Big Picture 的目标附加由实际 Millennium 环境决定。
