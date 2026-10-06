# 开发说明

安装和日常操作见 [README](../README.md) 与 [使用指南](usage.md)。

## 构建

安装 Node.js 和 npm，在仓库根目录运行：

```powershell
npm ci
npm run typecheck
npm run build
```

`typecheck` 检查主前端和 WebKit 的 TypeScript 类型；`build` 调用 Starlight 打包并校验 STAR，产物是 `dist/satli-lite.star` 和 `dist/update.json`。

Lua 打包前会在 `.generated/backend/` 中转义非 ASCII 字符串，以避开 Starlight 的中文字符串压缩问题。修改 Lua 源码仍在 `backend/` 中进行。

## 代码与数据

- `backend/`：Lua 后端，处理译本下载、本地保存、安装清单和插件更新。
- `frontend/`：Steam 主界面中的译本管理和成就数据覆盖。
- `webview/`：Steam WebKit 页面中的成就文本覆盖。
- `shared/`：TypeScript 数据类型和共用的成就文本变换。
- `scripts/`：版本与样式生成、构建打包。

译本使用 Catalog V2 的 `index-v2.json`，配套文件路径为 `files/<app_id>/<variant_id>/UserGameStatsSchema_<app_id>.json`。插件读取 JSON，成就以 API name 为键；格式检查见 `backend/translation_format.lua`。索引的 `variant.sha256` 须与 JSON 的 `source_sha256` 一致，插件用它判断译本更新。

本地数据位于 `<Millennium>/config/satli-lite/`。`state.json` 保存设置和译本文件引用，下载文件在 `translations/`，编辑和导入内容在 `edits/`。`original_file` 保留首次应用的文件，可能属于另一个译本，读取时不能用当前的 `variant_id` 校验。旧文件还可能被状态中的历史记录引用，改动存储逻辑时要考虑这些引用。

库存归属由前端读取 Steam `appStore.GetAppOverviewByAppID()` 的 `visible_in_game_list`；已安装筛选由后端读取 `steamapps/libraryfolders.vdf` 和各库的 `appmanifest_*.acf`。安装清单不能代替库存归属。

## 发布与自更新

版本来自 `millennium.toml`，使用 `MAJOR.MINOR.PATCH`，前后端版本常量由脚本生成。发布时，将同一次构建的 `satli-lite.star` 和 `update.json` 上传到 `GaBoron/SATLI-lite` 的正式 Release，标签使用与包内版本相同的 `vMAJOR.MINOR.PATCH`。`update.json` 内含 Base64 编码的 STAR 包，保留构建脚本生成的内容。

自更新要求插件目录中的 `satli-lite.star` 与运行版本一致。目录优先取 `MILLENNIUM__PLUGINS_PATH`，否则使用 `<Millennium>/plugins/`；测试自更新时需要安装对应的 STAR 包。

## 在 Steam 中检查

构建不能验证 Steam 的接口、缓存和窗口行为。显示覆盖改动要在真实 Steam / Millennium 中检查已有缓存、页面切换、成就通知、WebKit 页面和停用后的原文恢复；界面改动要检查内嵌和弹出窗口。存储或自更新改动还要检查 Steam 重启后的数据读取与新版加载。
