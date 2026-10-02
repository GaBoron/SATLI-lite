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

local function commit(next_state)
    -- Validate capacity before changing the active state, including while globally disabled.
    bridge.build(next_state, document, true)
    state.commit(next_state)
end

local function activate(value, file, language, game, local_edits, enabled)
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
        enabled = enabled == nil or enabled, source_sha256 = value.source_sha256, file = file,
        original_file = previous and previous.original_file or file,
        name = game and game.name or (previous and previous.name or value.app_id),
        contributors = game and game.contributors or (previous and previous.contributors),
        installed_at = os.time(), local_edits = local_edits or false, history = history,
    }
    commit(next_state)
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
    return activate(value, file, language, game, false)
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

function M.import(text, language)
    local value = format.decode(text)
    local relative = "edits/" .. value.app_id .. "/" .. storage.token() .. ".json"
    storage.write(storage.path(relative), text)
    local snapshot = catalog.get()
    local game = snapshot and snapshot.catalog.games[value.app_id]
    return activate(value, relative, language, game, true)
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
    return activate(value, relative, current.language, game, true, current.enabled)
end

function M.bridge()
    local current = state.get()
    local identity = json.encode(current)
    if bridge_identity == identity then return bridge_text end
    local text = bridge.build(current, document)
    bridge_identity, bridge_text = identity, text
    return text
end

return M
