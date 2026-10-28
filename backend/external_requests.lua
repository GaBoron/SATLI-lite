local json = require("json_codec")
local utils = require("utils")
local logger = require("logger")
local state = require("state")
local translations = require("translations")
local protocol = require("external_protocol")
local files = require("external_files")
local version = require("generated_version")
local M = {}
local running, frontend_attached = false, false
local session = utils.uuid()
local MAX_BATCH = 4

local function runtime(accepting)
    files.publish(nil, "runtime", {
        protocol = protocol.VERSION, plugin_version = version, session_id = session,
        backend_running = running, frontend_attached = frontend_attached,
        accepting_requests = accepting, heartbeat_at = os.time(), heartbeat_timeout_seconds = 15,
    })
end

local function recover()
    local receipt = state.get().external_receipt
    if receipt and not files.exists("results", receipt.request_id) then
        files.publish("results", receipt.request_id, receipt)
    end
end

local function execute(request, text)
    local current = state.get()
    if request.operation == "query_app" then return protocol.result(request, current) end
    local previous = current.apps[request.app_id]
    local conflict = request.conflict
    if conflict.mode == "reject" then
        protocol.check(not previous, "CONFLICT", "已有此游戏的译本，请查询状态并确认覆盖")
    else
        protocol.check(previous and previous.revision == conflict.expected_revision,
            "STALE_REVISION", "译本状态已变化，请重新查询并确认覆盖")
        protocol.check(not previous.local_edits or conflict.allow_local_edits == true,
            "LOCAL_EDITS_CONFLICT", "覆盖本地修改需要明确授权")
    end
    local ok, next_state = pcall(translations.import, text, request.language, {
        enabled = request.enabled,
        origin = { kind = "external", client_id = request.client_id, source_kind = request.source.kind,
            version = request.source.version, request_id = request.request_id },
        before_save = function(value) value.external_receipt = protocol.result(request, value) end,
    })
    protocol.check(ok, "APPLY_FAILED", "无法保存或应用译本，原状态保留；请检查容量与存储后用新请求重试")
    return next_state.external_receipt
end

local function process(id)
    if not files.exists("receipts", id) then
        files.publish("receipts", id, { protocol = protocol.VERSION, request_id = id,
            status = "accepted", replayed = false, received_at = os.time() })
    end
    local ok, result = pcall(function()
        local raw = files.read("processing", id)
        local decoded, value = pcall(json.decode, raw)
        protocol.check(decoded, "INVALID_JSON", "请求不是有效的 JSON")
        local request, text = protocol.validate(value, id)
        return execute(request, text)
    end)
    if not ok then
        logger:warn("external request failed")
        result = protocol.failure(id, result)
    end
    -- A failed publication propagates and blocks later imports until recover()
    -- has persisted the successful receipt from state.json after a restart.
    files.publish("results", id, result)
    return ok and result.operation == "import"
end

local function receive(id)
    local ok, error_value = pcall(function()
        local original = files.exists("requests", id) and "requests" or (files.exists("processing", id) and "processing")
        if original then
            local same = files.read(original, id) == files.read("inbox", id)
            protocol.check(same, "REQUEST_ID_REUSED", "此请求标识已绑定其他内容，请使用新的标识")
            files.publish("receipts", id, { protocol = protocol.VERSION, request_id = id,
                status = "accepted", replayed = true, received_at = os.time() })
            files.archive(id)
        else
            files.claim(id)
            files.publish("receipts", id, { protocol = protocol.VERSION, request_id = id,
                status = "accepted", replayed = false, received_at = os.time() })
        end
    end)
    if not ok then
        files.publish("receipts", id, protocol.failure(id, error_value))
        -- Preserve conflicting, oversized and linked input without following it.
        -- A storage failure remains in the inbox for the next poll instead.
        if type(error_value) == "table" and error_value.code ~= "STORAGE_ERROR" then files.archive(id) end
    end
end

function M.poll()
    if not running then return { changed = false } end
    files.check(false)
    recover()
    local received = 0
    for _, id in ipairs(files.list("inbox")) do
        receive(id)
        received = received + 1
        if received >= MAX_BATCH then break end
    end
    local changed = false
    -- Completed requests are retained for replay checks without scanning their
    -- ever-growing directory on every heartbeat.
    local pending = files.list("processing")
    local processed = 0
    for _, id in ipairs(pending) do
        if not files.exists("results", id) then
            changed = process(id) or changed
        end
        files.complete(id)
        processed = processed + 1
        if processed >= MAX_BATCH then break end
    end
    runtime(true)
    return { changed = changed, revision = session .. ":" .. state.generation() }
end

function M.start()
    files.check(true)
    files.publish(nil, "protocol", {
        protocol = protocol.VERSION, plugin_id = "com.gaboron.satli-lite", plugin_version = version,
        operations = json.array({ "import", "query_app" }), max_request_bytes = protocol.MAX_REQUEST_BYTES,
        max_translation_bytes = 32 * 1024 * 1024, max_batch = MAX_BATCH,
        conflict_policy = "reject-or-compare-and-replace", same_user_only = true,
    })
    running = true
    return M.poll()
end

function M.attach()
    frontend_attached = true
    if running then runtime(true) end
end

function M.stop()
    running, frontend_attached = false, false
    runtime(false)
end

return M
