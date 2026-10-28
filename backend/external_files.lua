local fs = require("fs")
local utils = require("utils")
local storage = require("storage")
local json = require("json_codec")
local protocol = require("external_protocol")
local M = {}
local directories = { "inbox", "processing", "requests", "results", "receipts", "archive" }

function M.root()
    return storage.path("external", "v1")
end

local function directory(path, create, expected)
    protocol.check(not fs.is_symlink(path), "UNSAFE_PATH", "接口目录不能是符号链接")
    if create then
        protocol.check(fs.create_directories(path) ~= nil, "STORAGE_ERROR", "无法建立接口目录")
    end
    protocol.check(fs.is_directory(path), "STORAGE_ERROR", "接口目录不可用")
    local canonical = fs.canonical(path)
    protocol.check(canonical, "STORAGE_ERROR", "无法解析接口目录")
    if package.config:sub(1, 1) == "\\" then
        canonical, expected = canonical:lower(), expected:lower()
    end
    protocol.check(canonical == expected, "UNSAFE_PATH", "接口目录不能重定向到其他路径")
end

function M.check(create)
    local base = fs.canonical(storage.root())
    protocol.check(base, "STORAGE_ERROR", "无法解析数据目录")
    directory(storage.path("external"), create, fs.join(base, "external"))
    directory(M.root(), create, fs.join(base, "external", "v1"))
    for _, name in ipairs(directories) do
        directory(fs.join(M.root(), name), create, fs.join(base, "external", "v1", name))
    end
end

local function path(section, id)
    protocol.check(protocol.id(id), "INVALID_REQUEST", "请求标识无效")
    return fs.join(M.root(), section, id .. ".json")
end

local function regular(filename)
    protocol.check(not fs.is_symlink(filename), "UNSAFE_PATH", "接口文件不能是符号链接")
    protocol.check(fs.is_file(filename), "STORAGE_ERROR", "接口文件不可读")
end

function M.read(section, id)
    local filename = path(section, id)
    regular(filename)
    local size = fs.file_size(filename)
    protocol.check(size, "STORAGE_ERROR", "无法读取接口文件大小")
    protocol.check(size <= protocol.MAX_REQUEST_BYTES, "REQUEST_TOO_LARGE", "请求超过大小限制")
    local ok, text = pcall(storage.read, filename, protocol.MAX_REQUEST_BYTES)
    protocol.check(ok and text, "STORAGE_ERROR", "无法读取接口文件")
    return text
end

function M.exists(section, id)
    local filename = path(section, id)
    if not fs.exists(filename) and not fs.is_symlink(filename) then return false end
    regular(filename)
    return true
end

-- Native fs.rename uses std::filesystem::rename. Publish closed files by a
-- same-directory rename; a sharing violation leaves the prior reply intact.
function M.publish(section, id, value)
    M.check(false)
    local filename = section and path(section, id) or fs.join(M.root(), id .. ".json")
    if fs.exists(filename) or fs.is_symlink(filename) then regular(filename) end
    local temporary = filename .. ".partial-" .. utils.uuid()
    protocol.check(not fs.exists(temporary) and not fs.is_symlink(temporary), "UNSAFE_PATH", "临时文件已存在")
    local file = io.open(temporary, "wb")
    protocol.check(file, "STORAGE_ERROR", "无法写入接口文件")
    local wrote = file:write(json.encode(value))
    local closed = file:close()
    protocol.check(wrote and closed, "STORAGE_ERROR", "接口文件写入不完整")
    protocol.check(fs.rename(temporary, filename), "STORAGE_ERROR", "无法原子发布接口文件，请重试读取")
end

function M.list(section)
    M.check(false)
    local entries = fs.list(fs.join(M.root(), section))
    protocol.check(type(entries) == "table", "STORAGE_ERROR", "无法读取请求目录")
    local ids = {}
    for _, entry in ipairs(entries) do
        local id = entry.name:match("^([a-z0-9%-]+)%.json$")
        if protocol.id(id) and (entry.is_file or entry.is_symlink) then ids[#ids + 1] = id end
    end
    table.sort(ids)
    return ids
end

function M.claim(id)
    regular(path("inbox", id))
    protocol.check(not M.exists("requests", id) and not M.exists("processing", id), "REQUEST_ID_REUSED", "请求已存在")
    protocol.check(fs.rename(path("inbox", id), path("processing", id)), "STORAGE_ERROR", "无法接收请求")
end

function M.complete(id)
    protocol.check(not M.exists("requests", id), "REQUEST_ID_REUSED", "请求凭据已存在")
    protocol.check(fs.rename(path("processing", id), path("requests", id)), "STORAGE_ERROR", "无法保留请求凭据")
end

function M.archive(id)
    local destination = fs.join(M.root(), "archive", id .. "-" .. utils.uuid() .. ".json")
    protocol.check(fs.rename(path("inbox", id), destination), "STORAGE_ERROR", "无法归档重复请求")
end

return M
