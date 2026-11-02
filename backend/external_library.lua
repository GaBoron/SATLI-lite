local fs = require("fs")
local storage = require("storage")
local json = require("json_codec")
local protocol = require("external_protocol")
local version = require("generated_version")
local utils = require("utils")
local M = {}
local completed, pending

local function safe_root()
    local base = assert(fs.canonical(storage.root()))
    for _, location in ipairs({ { storage.path("external"), fs.join(base, "external") },
        { storage.path("external", "v2"), fs.join(base, "external", "v2") } }) do
        local path = location[1]
        assert(not fs.is_symlink(path), "公开译文目录不能是链接")
        assert(fs.create_directories(path) ~= nil)
        local actual, expected = fs.canonical(path), location[2]
        if package.config:sub(1, 1) == "\\" then actual, expected = actual:lower(), expected:lower() end
        assert(actual == expected, "公开译文目录不能重定向")
    end
    return storage.path("external", "v2")
end

local function publish(name, value)
    local path = fs.join(safe_root(), name)
    assert(not fs.is_symlink(path), "公开译文文件不能是链接")
    local temporary = path .. ".partial-" .. utils.uuid()
    assert(not fs.exists(temporary) and not fs.is_symlink(temporary))
    local file = assert(io.open(temporary, "wb"))
    local wrote = file:write(json.encode(value))
    local closed = file:close()
    assert(wrote and closed and fs.rename(temporary, path), "无法发布公开译文快照")
end

-- Publish immutable translation files first and the complete index last. Work is
-- bounded per heartbeat; a failed optional snapshot never blocks v1 requests.
function M.poll(current, generation, export)
    if completed == generation then return end
    if not pending or pending.generation ~= generation then
        local ids = {}
        for id in pairs(current.apps) do ids[#ids + 1] = id end
        table.sort(ids)
        pending = { generation = generation, ids = ids, position = 1, apps = json.array() }
    end
    for _ = 1, 4 do
        local id = pending.ids[pending.position]
        if not id then break end
        local app = protocol.app(current, id)
        app.name = current.apps[id].name or ("Steam 游戏 " .. id)
        local ok = pcall(function()
            assert(type(app.revision) == "string" and app.revision:match("^[a-zA-Z0-9%-]+$") and #app.revision <= 128)
            local name = id .. "-" .. app.revision .. ".json"
            local path = fs.join(safe_root(), name)
            assert(not fs.is_symlink(path))
            if not fs.exists(path) then publish(name, export(id)) end
            app.translation_file = name
        end)
        if not ok then app.read_error = true end
        pending.apps[#pending.apps + 1] = app
        pending.position = pending.position + 1
    end
    if pending.position > #pending.ids then
        publish("library.json", { protocol = 2, plugin_id = "com.gaboron.satli-lite", plugin_version = version,
            generated_at = os.time(), apps = pending.apps })
        completed, pending = generation, nil
    end
end

return M
