local fs = require("fs")
local millennium = require("millennium")
local json = require("cjson")
local M = {}
local sequence = 0
local root

function M.root()
    if not root then
        root = fs.join(millennium.get_install_path(), "config", "satli-lite")
        local ok, err = fs.create_directories(root)
        assert(ok ~= nil, "无法建立 SATLI lite 数据目录: " .. tostring(err))
    end
    return root
end

function M.path(...)
    return fs.join(M.root(), ...)
end

function M.token()
    sequence = sequence + 1
    return tostring(os.time()) .. "-" .. tostring(sequence)
end

function M.read(path, limit)
    local file = io.open(path, "rb")
    if not file then return nil end
    local size = file:seek("end")
    if not size or size > (limit or 32 * 1024 * 1024) then
        file:close()
        error("本地数据超过大小限制")
    end
    file:seek("set", 0)
    local text = file:read("*a")
    file:close()
    return text
end

function M.load(name, fallback)
    local text = M.read(M.path(name))
    if not text then return fallback end
    -- Preserve damaged files and report their error instead of overwriting state.
    return json.decode(text)
end

function M.write(path, text)
    assert(type(text) == "string", "文件内容无效")
    local ok, err = fs.create_directories(fs.parent_path(path))
    assert(ok ~= nil, tostring(err))
    local temporary = path .. ".pending-" .. M.token()
    local file = assert(io.open(temporary, "wb"), "无法写入 SATLI lite 数据")
    local wrote, write_error = file:write(text)
    local closed, close_error = file:close()
    assert(wrote and closed, tostring(write_error or close_error))
    local backup
    if fs.exists(path) then
        backup = M.path("history", M.token() .. "-" .. fs.filename(path))
        assert(fs.create_directories(fs.parent_path(backup)) ~= nil)
        assert(fs.rename(path, backup), "无法备份已有数据")
    end
    local renamed, rename_error = fs.rename(temporary, path)
    if not renamed then
        if backup then assert(fs.rename(backup, path), "数据写入失败，备份保留在历史目录") end
        error("数据写入失败: " .. tostring(rename_error))
    end
end

function M.save(name, value)
    M.write(M.path(name), json.encode(value))
end

function M.clone(value)
    return json.decode(json.encode(value))
end

return M
