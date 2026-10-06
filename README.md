# SATLI lite

[SATLI](https://github.com/GaBoron/SATLI) 的精简插件版，通过 Millennium 在 Steam 内下载、预览和应用社区成就翻译，无需打开独立程序。

支持选择不同译本和语言、批量下载，以及本地编辑、导入导出和版本恢复。译本来自 [Steam 成就翻译库](https://github.com/GaBoron/steam-achievement-translation-library)。插件只替换成就的显示文字，不改变解锁状态、进度或图标。

## 前置要求

- 已安装并能正常运行的 **Steam 桌面客户端**。
- **Millennium 3.5.0 或更高版本**。尚未安装时，请先按 [Millennium 官方安装指南](https://docs.steambrew.app/users/getting-started/installation) 安装，重新启动 Steam，确认左上角“Steam”菜单中出现“Millennium”入口。
- 下载译本和插件更新时，需要能访问 GitHub；译本下载也可使用兼容的 HTTPS 镜像。已应用的本地译本可离线使用。

若已启用 SATLI 内置的成就显示插件或其他同类插件，请先停用，避免同时替换成就文字。

## 安装

以下步骤以 Windows 为例。SATLI lite 通过文件手动安装，无需在 Millennium 插件商店搜索。

1. 打开 [最新版本下载页](https://github.com/GaBoron/SATLI-lite/releases/latest)，在 **Assets** 中下载 `satli-lite.star`。不要下载 `Source code`；`update.json` 供插件自动更新使用，无需手动安装。
2. 从 Steam 左上角菜单选择“退出”，完全关闭 Steam；只关闭主窗口可能仍在后台运行。
3. 找到包含 `steam.exe` 的 Steam 安装目录，将 `satli-lite.star` 放入其下的 `millennium\plugins` 文件夹，保持文件名不变。例如：

   ```text
   C:\Program Files (x86)\Steam\millennium\plugins\satli-lite.star
   ```

   Steam 安装在其他位置时，请使用实际目录。插件不放在 `steamapps` 游戏目录中，也不需要解压 `.star` 文件。
4. 启动 Steam，打开左上角 **Steam → Millennium → 插件（Plugins）**，启用 **SATLI lite**，再重启 Steam。
5. 在 Millennium 中打开 **SATLI lite** 设置页。能看到“成就翻译”和“管理译本”入口，即可开始使用。

找不到 Steam 安装目录或插件未显示时，参见 [安装与启动问题](docs/usage.md#安装与启动问题)。

## 首次使用

1. 在插件设置页点击“管理译本”；也可打开 Steam 库存中的游戏页面，点击“成就翻译”。
2. 等待列表加载；列表为空时，点击右上角“刷新列表”。默认的“我的库存”只显示已有社区译本或本地译本的游戏，包含尚未安装的游戏。
3. 选择游戏，再选择译本和语言。点击“预览译本”可先查看成就名称与描述。
4. 点击“下载并应用”。完成后回到 Steam 游戏页面查看成就；页面已打开时，可切换到其他游戏再返回。

已下载的游戏使用“应用所选译本”切换版本或语言。仅更改下拉框不会替换当前译本。

## 文档与反馈

- [使用指南](docs/usage.md)：译本管理、批量下载、编辑与备份、自动更新、网络设置和常见问题。
- [插件问题反馈](https://github.com/GaBoron/SATLI-lite/issues/new)：安装、窗口或功能问题。
- [译本问题与翻译请求](docs/usage.md#反馈与翻译请求)：翻译内容错误、过期译本或未收录的游戏。
- [开发说明](docs/development.md)：源码构建、数据格式与模块说明。

## 许可

插件代码采用 [MIT License](LICENSE)。译本中的贡献者内容与第三方游戏内容遵循 [翻译库权利声明](https://github.com/GaBoron/steam-achievement-translation-library/blob/main/LICENSE.md)。
