# 本机外部接口 v1

供 SATLI 等同一操作系统用户下的桌面程序导入译本、查询游戏状态。客户端只读写本接口目录，不直接修改 `state.json`、`translations/`、`edits/`，也不调用 Millennium 内部 FFI。插件不接收 BIN/ZIP；客户端须先转换为兼容的翻译 JSON。

## 发现与运行状态

接口位于 `<Millennium>/config/satli-lite/external/v1/`，其中 `<Millennium>` 是 Millennium 安装目录。插件首次运行后创建目录与 `protocol.json`。客户端可以在 Steam 关闭时创建 `inbox/` 投递，但这不能证明插件已安装。

先检查目标 Steam 安装中的 `millennium/plugins/satli-lite.star` 是否存在，再读取 `protocol.json` 的 `plugin_id`、`plugin_version`、整数 `protocol` 和 `operations`。v1 的操作为 `import`、`query_app`；插件版本独立于协议版本，客户端遇到不支持的协议应停止提交。

`runtime.json` 示例：

```json
{
  "protocol": 1,
  "plugin_version": "0.1.2",
  "session_id": "2d6ce1a6-4d27-4a47-b955-cfc8225a6218",
  "backend_running": true,
  "frontend_attached": true,
  "accepting_requests": true,
  "heartbeat_at": 1793145600,
  "heartbeat_timeout_seconds": 15
}
```

版本和时间仅为结构示例。时间均为 Unix 秒。插件加载时处理一批请求，Steam 前端随后自动每两秒驱动一批；无需打开设置页，也无需桌面程序常驻。每批最多接收四个、处理四个请求，繁忙时可能延迟。正常卸载会写入 `backend_running: false`、`accepting_requests: false`；崩溃或强制退出可能留下旧心跳。

心跳缺失、超过 15 秒、时间明显在未来或 `accepting_requests` 为假时，客户端应显示“插件当前不可用／请求等待处理”，保留同一请求等待恢复。文件记录不能独立证明 Steam 进程仍存活，也不能区分前端繁忙、插件未启用和异常退出：客户端应结合本机 Steam 进程检测显示“Steam 未运行”；Steam 正在运行但没有有效心跳时提示检查插件启用状态。不要仅凭旧文件宣称 lite 正在运行或已被停用。

## 文件提交与结果查询

| 路径 | 写入方与用途 |
| --- | --- |
| `inbox/<request_id>.json` | 客户端原子提交的完整请求 |
| `processing/<request_id>.json` | 插件已接收、等待最终归档的原始请求 |
| `requests/<request_id>.json` | 插件完成处理后保留的原始请求，作为持久幂等凭据 |
| `receipts/<request_id>.json` | 插件的接收确认，或本次重复投递的拒绝原因 |
| `results/<request_id>.json` | 插件处理后的最终结果，发布后不修改 |
| `archive/` | 插件保留的重复或不安全投递，不执行 |

1. 生成全局唯一的、小写请求 ID，例如 UUID v4。允许 16–64 个 ASCII 小写字母、数字、短横线，首字符必须是字母或数字。一个 ID 只属于一份请求。
2. 在 `inbox/` 内用不以 `.json` 结尾的临时文件写入 UTF-8 JSON，无 BOM；写完、刷新并关闭文件后，在同一目录重命名为 `<request_id>.json`。目标已存在时不要覆盖。插件忽略其他文件名和子目录。
3. 文件已投递只表示排队。等待 `receipts/<id>.json` 的 `status: "accepted"`，或直接读到最终结果；接收确认可能在处理中断后补写。若回执为 `status: "failed"`，先处理其 `error.code`。
4. 等待 `results/<id>.json`，检查 `protocol`、`request_id`、`ok` 和状态。没有最终结果时继续等待；超时不等于执行失败。读文件时应允许 Windows 删除共享访问，并对暂时的共享冲突、文件未出现或不完整读取重试。
5. 需要刷新游戏状态时，用新 ID 提交 `query_app`；旧查询结果是其 `processed_at` 时刻的快照。

重复投递必须使用**完全相同的字节**，包括 JSON 空白和字段顺序。相同 ID、相同字节返回原有结果，不再次导入或增加历史；相同 ID、不同字节会在接收回执中返回 `REQUEST_ID_REUSED`，保留原有最终结果。不要把旧结果误认为新内容的执行结果。最终失败后修改内容或再次尝试执行，应使用新 ID；无结果的请求仍应沿用原 ID。

请求、成功回执和最终结果持久保留，不依赖客户端存活。成功导入的事务回执与译本状态同次保存；结果文件发布失败或插件崩溃后，下次运行先补写回执，不重复覆盖。不要清理 `processing/`、`requests/`、`results/` 或插件私有事务记录，否则无法保证旧 ID 的幂等性。`archive/` 中已结束的重复投递可由用户按需移入回收站；插件不自动清理文件。

## 导入请求

```json
{
  "protocol": 1,
  "request_id": "2ee67cc9-cc1e-46bd-b22a-1acd08f6a4da",
  "client_id": "satli-desktop",
  "operation": "import",
  "app_id": "570",
  "language": "schinese",
  "enabled": true,
  "source": { "kind": "converted", "version": "desktop-export-1" },
  "conflict": { "mode": "reject" },
  "translation": {
    "version": 1,
    "app_id": "570",
    "variant_id": "default",
    "source_sha256": "0000000000000000000000000000000000000000000000000000000000000000",
    "languages": ["english", "schinese"],
    "achievements": {
      "ACH_FIRST": {
        "translations": {
          "english": { "name": "First step", "description": "Finish a match." },
          "schinese": { "name": "第一步", "description": "完成一场比赛。" }
        }
      }
    }
  }
}
```

示例中的哈希仅为字段占位。实际译本遵循 `translation_format.lua` 的格式：App ID 为不超过十位的非零起始十进制字符串，`variant_id` 为不超过 64 字符的小写字母、数字与短横线标识，`languages` 含目标语言，每个成就在列出的全部语言中都有字符串名称和描述。成就以 API name 为键，不能用显示名称代替。

`source_sha256` 是 64 位小写十六进制的来源标识。直接提交已校验的社区 JSON 时，保留 JSON 的哈希和译本标识；有原始 BIN 时使用该 BIN 原始字节的 SHA-256。没有 BIN 的编辑或转换数据，客户端可对去掉 `source_sha256` 后的译本 JSON 计算 SHA-256：对象键递归按字符顺序排列、数组顺序保留、UTF-8、非 ASCII 字符不转义、无 BOM、无多余空白，`version` 为整数。客户端应保持同一转换规则，以便标识可复现。lite 检查哈希格式，不下载或重建 BIN 验证其真实性；这不是来源认证。

`client_id` 最长 64 字符，使用小写字母、数字、点、短横线，首字符为字母或数字。`source.kind` 必须是 `catalog_json`、`converted` 或 `edited`；可选的 `source.version` 最长 128 UTF-8 字节，用于记录客户端来源版本。上述信息只作来源记录，不授予权限。

导入会记录 `origin.kind: "external"` 及客户端、来源种类、版本、请求 ID。无论数据是否来自社区，均设为 `local_edits: true`，避免被社区自动更新覆盖。用户仍可在 lite 中手动切换译本、编辑或恢复。原有社区下载使用 `origin.kind: "community"`，UI 导入为 `import`，编辑为 `local_edit`；旧状态可能仅能区分 `community` 和 `local`。

`enabled` 默认 `true`，只控制此游戏，不打开插件的全局显示开关。翻译 JSON 序列化后最多 32 MiB，整个请求最多 32 MiB + 64 KiB；同时仍受已启用译本总快照 32 MiB 的限制。不要把大 JSON 通过内部 RPC 提交。

### 覆盖授权

默认 `conflict.mode: "reject"` 拒绝覆盖任何已有译本，包括此前由同一客户端导入的内容。先查询游戏状态，让用户确认覆盖，再用新 ID 提交：

```json
{
  "mode": "replace",
  "expected_revision": "查询结果中的 app.revision",
  "allow_local_edits": true
}
```

这段对象放在导入请求的 `conflict` 字段中。已有 `local_edits` 时，必须在用户明确确认后设 `allow_local_edits: true`；仅覆盖社区内容可以省略该字段。`revision` 是不透明的比较标识，游戏内容、语言、启用状态、恢复等变化会使其失效；旧版状态首次加载生成的标识也可能随重启变化。`STALE_REVISION` 要求重新查询并重新确认，不能自动升级授权重试。

导入复用现有格式校验、保存、激活、容量检查和最多 12 条历史记录；覆盖不会改变首次译本基线。失败不提交新状态，写入但未被引用的缓存可能保留供排查。

## 查询与状态含义

```json
{
  "protocol": 1,
  "request_id": "7c225f65-5358-4825-9fd7-f9eb450b9839",
  "client_id": "satli-desktop",
  "operation": "query_app",
  "app_id": "570"
}
```

导入和查询成功均返回 `protocol`、`request_id`、`client_id`、`operation`、`status: "succeeded"`、`ok: true`、`processed_at`，以及 `app`。不存在的游戏为 `{ "app_id": "570", "exists": false }`；存在时额外提供：

| 字段 | 含义 |
| --- | --- |
| `saved`、`exists` | 插件状态中已保存此游戏的译本 |
| `enabled` | 此游戏的开关 |
| `globally_enabled`、`effective_enabled` | 全局开关、全局与游戏开关均启用 |
| `variant_id`、`language`、`source_sha256` | 当前译本、选定语言与来源标识 |
| `local_edits`、`origin` | 更新保护及来源记录 |
| `revision`、`updated_at` | 覆盖比较标识与最后一次游戏状态提交时间 |

`succeeded` 表示插件已经完成该操作，`effective_enabled` 表示配置允许显示。两者都不是页面渲染确认；实际显示还依赖 Steam 前端、页面与缓存。读取当前心跳确认插件运行，再在 Steam 中验收名称和描述，不能仅凭文件投递成功显示“Steam 已生效”。导入后的结果不会因用户后来切换译本而改变，当前状态必须另发查询。

## 错误、兼容性与边界

错误回执或结果包含 `status: "failed"`、`ok: false`、`error: { "code": "…", "message": "…" }` 和 `processed_at`。客户端依赖错误码，提示语可以变化。

| 错误码 | 处理方式 |
| --- | --- |
| `UNSUPPORTED_PROTOCOL` | 停止提交，升级兼容的客户端或插件 |
| `INVALID_JSON`、`INVALID_REQUEST` | 修正 JSON、字段或文件名与请求 ID |
| `INVALID_TRANSLATION`、`APP_ID_MISMATCH`、`LANGUAGE_UNAVAILABLE` | 修正转换数据和目标语言 |
| `CONFLICT`、`LOCAL_EDITS_CONFLICT` | 查询状态，让用户决定是否授权覆盖 |
| `STALE_REVISION` | 重新查询并取得新的覆盖确认 |
| `REQUEST_ID_REUSED` | 原结果保留；新内容使用新 ID |
| `REQUEST_TOO_LARGE` | 减少单次请求体积 |
| `UNSAFE_PATH` | 使用接口内的普通目录和文件，去除符号链接 |
| `STORAGE_ERROR` | 检查权限、磁盘及文件共享冲突；保留未完成请求等待恢复 |
| `APPLY_FAILED` | 未提交新状态；检查容量、译本缓存及存储后用新 ID 重试 |
| `INTERNAL_ERROR` | 保留原数据，检查插件日志；先查询是否已有最终结果 |

如果错误出现在接收阶段，查看 `receipts/`；已接收请求的最终错误在 `results/`。基础目录不可用、磁盘写满等情况也可能无法写出错误文件，此时心跳会过期，客户端不能推断请求从未执行。

接口不接受网络连接、任意文件路径或 shell 指令。插件拒绝接口目录及输入输出文件中的符号链接，限制名称、字段、体积和每批数量；所有发布都使用同目录关闭后重命名。请求以文件系统权限作为本机同用户的信任边界，`client_id` 是声明而非认证，不防御同一用户下的恶意进程或检查后的路径替换竞态。不要将目录放在跨用户共享位置或向其他账户开放写权限。

v1 严格拒绝未知请求字段和操作。扩展字段或不兼容语义需要另行协商协议版本；不应通过试写 lite 私有状态绕过兼容性检查。
