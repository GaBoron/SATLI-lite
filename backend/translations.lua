local json = require("json_codec")
local fs = require("fs")
local storage = require("storage")
local state = require("state")
local format = require("translation_format")
local catalog = require("catalog")
local bridge = require("bridge_snapshot")
local M = {}
local bridge_identity
local bridge_text
local bridge_token
local bridge_chunks
local BRIDGE_DIRECT_BYTES = 1024 * 1024
local BRIDGE_CHUNK_BYTES = 512 * 1024

local function document(entry)
    assert(type(entry.file) == "string" and entry.file:match("^[a-z0-9/%-]+%.json$") and not entry.file:find("..", 1, true), "本地译本路径无效")
    assert(entry.file:match("^translations/") or entry.file:match("^edits/"), "本地译本路径不在缓存中")
    return format.decode(assert(storage.read(storage.path(entry.file)), "译本缓存不存在"), entry.app_id, entry.variant_id)
end

local function cache(value, text)
    local relative = "translations/" .. value.app_id .. "/" .. value.variant_id .. "/" .. value.source_sha256 .. ".json"
    local path = storage.path(relative)
    if not fs.exists(path) or storage.read(path) ~= text then storage.write(path, text) end
    return relative
end

local function commit(next_state, before_save)
    -- Validate capacity before changing the active state, including while globally disabled.
    bridge.build(next_state, document, true)
    state.commit(next_state, before_save)
end

local function activate(value, file, language, game, options)
    options = options or {}
    format.language(language)
    assert(format.contains(value.languages, language), "此译本不包含所选语言")
    local next_state = storage.clone(state.get())
    local previous = next_state.apps[value.app_id]
    local history = previous and previous.history or json.array()
    if previous then
        local previous_copy = storage.clone(previous)
        previous_copy.history = nil
        table.insert(history, 1, previous_copy)
        while #history > 12 do table.remove(history) end
    end
    next_state.apps[value.app_id] = {
        app_id = value.app_id, variant_id = value.variant_id, language = language,
        enabled = options.enabled == nil or options.enabled, source_sha256 = value.source_sha256, file = file,
        original_file = previous and previous.original_file or file,
        name = game and game.name or (previous and previous.name or value.app_id),
        contributors = game and game.contributors or (previous and previous.contributors),
        installed_at = os.time(), local_edits = options.local_edits or false, history = history,
        origin = options.origin or { kind = "community" },
    }
    commit(next_state, options.before_save)
    return next_state
end

function M.preview(app_id, variant_id)
    local game, variant = catalog.variant(app_id, variant_id)
    local file = "translations/" .. app_id .. "/" .. variant_id .. "/" .. variant.sha256 .. ".json"
    local text = storage.read(storage.path(file))
    if text then return format.decode(text, app_id, variant_id, variant) end
    local value, downloaded = catalog.download(app_id, variant_id)
    cache(value, downloaded)
    return value, game
end

function M.install(app_id, variant_id, language)
    local game, variant = catalog.variant(app_id, variant_id)
    local value = M.preview(app_id, variant_id)
    local file = "translations/" .. app_id .. "/" .. variant_id .. "/" .. variant.sha256 .. ".json"
    return activate(value, file, language, game)
end

function M.toggle(app_id, enabled)
    format.app_id(app_id)
    assert(type(enabled) == "boolean", "开关无效")
    local next_state = storage.clone(state.get())
    local entry = assert(next_state.apps[app_id], "尚未下载此游戏的译本")
    entry.enabled = enabled
    commit(next_state)
    return next_state
end

function M.restore(app_id)
    format.app_id(app_id)
    local next_state = storage.clone(state.get())
    local entry = assert(next_state.apps[app_id], "尚未下载译本")
    assert(entry.history and #entry.history > 0, "没有可恢复的上一版")
    local history = entry.history
    local previous = table.remove(history, 1)
    document(previous)
    previous.history = history
    next_state.apps[app_id] = previous
    commit(next_state)
    return next_state
end

function M.import(text, language, options)
    local value = format.decode(text)
    options = options or {}
    options.local_edits = true
    options.origin = options.origin or { kind = "import" }
    local relative = "edits/" .. value.app_id .. "/" .. storage.token() .. ".json"
    storage.write(storage.path(relative), text)
    local snapshot = catalog.get()
    local game = snapshot and snapshot.catalog.games[value.app_id]
    return activate(value, relative, language, game, options)
end

function M.export(app_id)
    format.app_id(app_id)
    return document(assert(state.get().apps[app_id], "尚未下载译本"))
end

function M.edit(app_id, api_name, name, description)
    format.app_id(app_id)
    assert(type(api_name) == "string" and type(name) == "string" and type(description) == "string", "编辑内容无效")
    assert(#name <= 16384 and #description <= 65536, "编辑内容过长")
    local current = assert(state.get().apps[app_id], "尚未下载译本")
    local value = document(current)
    local achievement = assert(value.achievements[api_name], "找不到此成就")
    achievement.translations[current.language] = { name = name, description = description }
    local text = json.encode(value)
    format.decode(text)
    local relative = "edits/" .. app_id .. "/" .. storage.token() .. ".json"
    storage.write(storage.path(relative), text)
    local game = { name = current.name, contributors = current.contributors }
    return activate(value, relative, current.language, game, {
        local_edits = true, enabled = current.enabled, origin = { kind = "local_edit" },
    })
end

function M.bridge()
    local current = state.get()
    local identity = json.encode(current)
    if bridge_identity == identity then return bridge_text end
    local text = bridge.build(current, document)
    bridge_identity, bridge_text = identity, text
    bridge_token = storage.token()
    bridge_chunks = nil
    return text
end

-- FFI replies must fit Millennium's 8 MiB limit, including JSON escaping.
-- Keep small snapshots compatible with direct readers and chunk larger ones.
function M.bridge_transport()
    local text = M.bridge()
    if #text <= BRIDGE_DIRECT_BYTES then return text end
    if not bridge_chunks then
        bridge_chunks = {}
        local first = 1
        while first <= #text do
            local last = math.min(first + BRIDGE_CHUNK_BYTES - 1, #text)
            -- Lua indexes bytes; the next reply must start at a UTF-8 boundary.
            while last < #text do
                local next_byte = text:byte(last + 1)
                if next_byte < 128 or next_byte >= 192 then break end
                last = last - 1
            end
            table.insert(bridge_chunks, text:sub(first, last))
            first = last + 1
        end
    end
    return json.encode({
        transport = "satli-bridge-chunks-v1", token = bridge_token,
        count = #bridge_chunks, bytes = #text,
    })
end

function M.bridge_chunk(token, index)
    -- Recheck state before every reply so a reader cannot mix snapshot versions.
    M.bridge()
    assert(type(token) == "string" and token == bridge_token, "翻译数据已变化，请重试")
    assert(type(index) == "number" and index % 1 == 0 and bridge_chunks and bridge_chunks[index], "翻译数据分块无效")
    return bridge_chunks[index]
end

return M
