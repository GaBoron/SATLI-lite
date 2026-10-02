local json = require("cjson")
local logger = require("logger")
local state = require("state")
local catalog = require("catalog")
local translations = require("translations")
local updater = require("updater")

local function response(workflow, operation)
    logger:info(workflow .. " start")
    local success, result = pcall(operation)
    if success then
        logger:info(workflow .. " complete")
        return json.encode({ ok = true, data = result })
    end
    -- Validation messages contain no achievement text, credentials or network URL.
    logger:error(workflow .. " failed")
    return json.encode({ ok = false, error = tostring(result) })
end

---@ffi
---@return string
function getState()
    return response("read state", function() return { state = state.get(), catalog = catalog.get(), update = updater.status() } end)
end

---@ffi
---@return string
function refreshCatalog()
    return response("refresh catalog", function() return catalog.refresh(state.get().settings) end)
end

---@ffi
---@param app_id string
---@param variant_id string
---@return string
function previewTranslation(app_id, variant_id)
    return response("preview translation", function() return translations.preview(app_id, variant_id) end)
end

---@ffi
---@param app_id string
---@param variant_id string
---@param language string
---@return string
function installTranslation(app_id, variant_id, language)
    return response("apply translation ", function() return translations.install(app_id, variant_id, language) end)
end

---@ffi
---@param app_id string
---@param enabled boolean
---@return string
function toggleTranslation(app_id, enabled)
    return response("toggle translation ", function() return translations.toggle(app_id, enabled) end)
end

---@ffi
---@param app_id string
---@return string
function restoreTranslation(app_id)
    return response("restore previous translation ", function() return translations.restore(app_id) end)
end

---@ffi
---@param text string
---@return string
function configure(text)
    return response("save settings", function() return state.configure(text) end)
end

---@ffi
---@param text string
---@param language string
---@return string
function importTranslation(text, language)
    return response("import translation", function() return translations.import(text, language) end)
end

---@ffi
---@param app_id string
---@return string
function exportTranslation(app_id)
    return response("export translation ", function() return translations.export(app_id) end)
end

---@ffi
---@param app_id string
---@param api_name string
---@param name string
---@param description string
---@return string
function editTranslation(app_id, api_name, name, description)
    return response("edit translation ", function() return translations.edit(app_id, api_name, name, description) end)
end

---@ffi
---@return string
function checkPluginUpdate()
    return response("check plugin update", updater.check)
end

---@ffi
---@return string
function installPluginUpdate()
    return response("install plugin update", updater.install)
end

---@ffi
---@return string
function getBridgeSnapshot()
    return translations.bridge()
end
