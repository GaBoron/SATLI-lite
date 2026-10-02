local logger = require("logger")
local millennium = require("millennium")
require("rpc")

return {
    patches = require("achievement_toast_patch"),
    on_load = function()
        millennium.ready()
        logger:info("SATLI lite backend ready")
    end,
    on_frontend_loaded = function() logger:info("SATLI lite Steam frontend attached") end,
    on_unload = function() logger:info("SATLI lite unloaded") end,
}
