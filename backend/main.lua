local logger = require("logger")
local millennium = require("millennium")
local external = require("external_requests")
require("rpc")

local function external_call(operation)
    local ok = pcall(operation)
    if not ok then logger:warn("SATLI lite external interface unavailable") end
end

return {
    patches = require("achievement_toast_patch"),
    on_load = function()
        external_call(external.start)
        millennium.ready()
        logger:info("SATLI lite backend ready")
    end,
    on_frontend_loaded = function()
        external_call(external.attach)
        logger:info("SATLI lite Steam frontend attached")
    end,
    on_unload = function()
        external_call(external.stop)
        logger:info("SATLI lite unloaded")
    end,
}
