local json = require("json_codec")
local format = require("translation_format")
local M = { VERSION = 1, MAX_REQUEST_BYTES = format.MAX_BYTES + 65536 }

function M.fail(code, message)
    error({ code = code, message = message }, 0)
end

function M.check(condition, code, message)
    if not condition then M.fail(code, message) end
end

function M.id(value)
    return type(value) == "string" and #value >= 16 and #value <= 64 and value:match("^[a-z0-9][a-z0-9%-]+$") ~= nil
end

local function fields(value, allowed)
    M.check(type(value) == "table", "INVALID_REQUEST", "请求字段必须是对象")
    for key in pairs(value) do
        M.check(allowed[key], "INVALID_REQUEST", "请求含有未知字段")
    end
end

function M.validate(value, id)
    M.check(type(value) == "table", "INVALID_REQUEST", "请求必须是 JSON 对象")
    M.check(value.protocol == M.VERSION, "UNSUPPORTED_PROTOCOL", "不支持此协议版本")
    fields(value, { protocol = true, request_id = true, client_id = true, operation = true,
        app_id = true, language = true, translation = true, source = true, conflict = true, enabled = true })
    M.check(value.request_id == id and M.id(id), "INVALID_REQUEST", "请求标识必须与文件名一致")
    M.check(type(value.client_id) == "string" and #value.client_id <= 64
        and value.client_id:match("^[a-z0-9][a-z0-9%.%-]*$"), "INVALID_REQUEST", "客户端标识无效")
    M.check(value.operation == "import" or value.operation == "query_app", "INVALID_REQUEST", "不支持此操作")
    M.check(pcall(format.app_id, value.app_id), "INVALID_REQUEST", "App ID 无效")
    if value.operation == "query_app" then
        for _, key in ipairs({ "language", "translation", "source", "conflict", "enabled" }) do
            M.check(value[key] == nil, "INVALID_REQUEST", "查询请求不能含有导入字段")
        end
        return value
    end
    M.check(pcall(format.language, value.language), "INVALID_REQUEST", "目标语言无效")
    M.check(value.enabled == nil or type(value.enabled) == "boolean", "INVALID_REQUEST", "启用状态无效")
    fields(value.source, { kind = true, version = true })
    M.check(value.source.kind == "catalog_json" or value.source.kind == "converted" or value.source.kind == "edited",
        "INVALID_REQUEST", "译本来源无效")
    M.check(value.source.version == nil or (type(value.source.version) == "string" and #value.source.version <= 128),
        "INVALID_REQUEST", "来源版本过长")
    local conflict = value.conflict or { mode = "reject" }
    fields(conflict, { mode = true, expected_revision = true, allow_local_edits = true })
    M.check(conflict.mode == "reject" or conflict.mode == "replace", "INVALID_REQUEST", "冲突策略无效")
    M.check(conflict.allow_local_edits == nil or type(conflict.allow_local_edits) == "boolean", "INVALID_REQUEST", "覆盖授权无效")
    if conflict.mode == "replace" then
        M.check(type(conflict.expected_revision) == "string" and #conflict.expected_revision > 0
            and #conflict.expected_revision <= 128, "INVALID_REQUEST", "覆盖需要当前状态版本")
    else
        M.check(conflict.expected_revision == nil and conflict.allow_local_edits == nil,
            "INVALID_REQUEST", "拒绝覆盖策略不能附带覆盖授权")
    end
    value.conflict = conflict
    M.check(type(value.translation) == "table", "INVALID_TRANSLATION", "译本必须是 JSON 对象")
    local encoded, text = pcall(json.encode, value.translation)
    M.check(encoded, "INVALID_TRANSLATION", "译本无法序列化")
    local valid, document = pcall(format.decode, text)
    M.check(valid, "INVALID_TRANSLATION", "译本格式或大小无效")
    M.check(document.app_id == value.app_id, "APP_ID_MISMATCH", "译本与目标 App ID 不一致")
    M.check(format.contains(document.languages, value.language), "LANGUAGE_UNAVAILABLE", "译本不包含目标语言")
    return value, text
end

function M.app(current, app_id)
    local entry = current.apps[app_id]
    if not entry then return { app_id = app_id, exists = false } end
    return {
        app_id = app_id, exists = true, saved = true, enabled = entry.enabled,
        globally_enabled = current.settings.enabled, effective_enabled = current.settings.enabled and entry.enabled,
        variant_id = entry.variant_id, language = entry.language, source_sha256 = entry.source_sha256,
        json_sha256 = entry.json_sha256,
        local_edits = entry.local_edits, origin = entry.origin or { kind = entry.local_edits and "local" or "community" },
        revision = entry.revision, updated_at = entry.updated_at or entry.installed_at,
    }
end

function M.result(request, current)
    return {
        protocol = M.VERSION, request_id = request.request_id, client_id = request.client_id,
        operation = request.operation, status = "succeeded", ok = true, processed_at = os.time(),
        app = M.app(current, request.app_id),
    }
end

function M.failure(id, error_value)
    local known = type(error_value) == "table" and error_value.code and error_value.message
    return {
        protocol = M.VERSION, request_id = id, status = "failed", ok = false, processed_at = os.time(),
        error = known and error_value or { code = "INTERNAL_ERROR", message = "插件处理失败，请检查日志或使用新请求重试" },
    }
end

return M
