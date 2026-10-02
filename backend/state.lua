local storage = require("storage")
local format = require("translation_format")
local network = require("network")
local M = {}
local current

function M.get()
    if not current then
        local loaded = storage.load("state.json", { version = 1, settings = {}, apps = {} })
        assert(loaded.version == 1 and type(loaded.settings) == "table" and type(loaded.apps) == "table", "本地状态格式无效；请保留数据并查看日志")
        local defaults = { enabled = true, language = "schinese", auto_translation_updates = false, auto_plugin_updates = true, catalog_base = "" }
        for key, value in pairs(defaults) do if loaded.settings[key] == nil then loaded.settings[key] = value end end
        current = loaded
    end
    return current
end

function M.commit(value)
    storage.save("state.json", value)
    current = value
end

function M.configure(text)
    local json = require("cjson")
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
