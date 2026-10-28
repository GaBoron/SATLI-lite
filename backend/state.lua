local storage = require("storage")
local format = require("translation_format")
local network = require("network")
local json = require("json_codec")
local utils = require("utils")
local M = {}
local current
local generation = 0

local function same_value(first, second)
    if type(first) ~= "table" or type(second) ~= "table" then return first == second end
    for key, value in pairs(first) do
        if not same_value(value, second[key]) then return false end
    end
    for key in pairs(second) do if first[key] == nil then return false end end
    return true
end

function M.get()
    if not current then
        local loaded = storage.load("state.json", { version = 1, settings = {}, apps = {} })
        assert(loaded.version == 1 and type(loaded.settings) == "table" and type(loaded.apps) == "table", "本地状态格式无效；请保留数据并查看日志")
        local defaults = { enabled = true, language = "schinese", auto_translation_updates = false, auto_plugin_updates = true, catalog_base = "" }
        for key, value in pairs(defaults) do if loaded.settings[key] == nil then loaded.settings[key] = value end end
        for _, entry in pairs(loaded.apps) do entry.revision = entry.revision or utils.uuid() end
        current = loaded
    end
    return current
end

-- The callback can record a receipt in the same durable commit as its changes.
function M.commit(value, before_save)
    local previous = M.get()
    for app_id, entry in pairs(value.apps) do
        if not same_value(entry, previous.apps[app_id]) then
            entry.revision, entry.updated_at = utils.uuid(), os.time()
        end
    end
    if before_save then before_save(value) end
    storage.save("state.json", value)
    current = value
    generation = generation + 1
end

function M.generation() return generation end

function M.configure(text)
    local changes = json.decode(text)
    assert(type(changes) == "table", "设置无效")
    local next_state = storage.clone(M.get())
    for key, value in pairs(changes) do
        if key == "language" then format.language(value)
        elseif key == "catalog_base" then network.base(value)
        elseif key == "enabled" or key == "auto_translation_updates" or key == "auto_plugin_updates" then assert(type(value) == "boolean", "开关值无效")
        else error("未知设置") end
        next_state.settings[key] = value
    end
    M.commit(next_state)
    return next_state
end

return M
