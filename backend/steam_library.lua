local fs = require("fs")
local millennium = require("millennium")
local logger = require("logger")
local json = require("json_codec")
local vdf = require("steam_vdf")
local M = {}

function M.scan()
    local steam = millennium.steam_path()
    assert(type(steam) == "string" and fs.is_directory(fs.join(steam, "steamapps")), "无法定位 Steam 的安装清单")
    local libraries, seen = {}, {}
    local function add_library(path)
        if type(path) ~= "string" or path == "" then return end
        path = fs.canonical(path) or fs.absolute(path) or path
        local key = package.config:sub(1, 1) == "\\" and path:lower() or path
        if not seen[key] then seen[key] = true; libraries[#libraries + 1] = path end
    end
    add_library(steam)
    local library_metadata_unreadable = false
    local metadata = fs.join(steam, "steamapps", "libraryfolders.vdf")
    if fs.exists(metadata) then
        local ok, data = pcall(vdf.read, metadata)
        local folders = ok and (data.libraryfolders or data.LibraryFolders)
        if type(folders) == "table" then
            for key, entry in pairs(folders) do
                if key:match("^%d+$") then add_library(type(entry) == "table" and entry.path or entry) end
            end
        else library_metadata_unreadable = true end
    end
    local apps, scanned, unavailable, unreadable = {}, 0, 0, 0
    for _, library in ipairs(libraries) do
        local directory = fs.join(library, "steamapps")
        local ok, entries = pcall(fs.list, directory)
        if ok and type(entries) == "table" then
            scanned = scanned + 1
            for _, entry in ipairs(entries) do
                local id = entry.is_file and entry.name:lower():match("^appmanifest_([1-9]%d*)%.acf$")
                if id then
                    local name = "App " .. id
                    local parsed, data = pcall(vdf.read, fs.join(directory, entry.name))
                    local manifest = parsed and (data.AppState or data.appstate)
                    if type(manifest) == "table" and (manifest.appid == nil or manifest.appid == id) then
                        if type(manifest.name) == "string" and manifest.name:match("%S") then name = manifest.name end
                    else unreadable = unreadable + 1 end
                    if not apps[id] or name ~= "App " .. id then apps[id] = { app_id = id, name = name } end
                end
            end
        else unavailable = unavailable + 1 end
    end
    assert(scanned > 0, "无法读取 Steam 库目录，请检查目录访问权限")
    local result = json.array()
    for _, app in pairs(apps) do result[#result + 1] = app end
    table.sort(result, function(left, right) return tonumber(left.app_id) < tonumber(right.app_id) end)
    logger:info("scan installed games complete apps=" .. #result .. " libraries=" .. scanned .. " unavailable=" .. unavailable .. " unreadable=" .. unreadable)
    return {
        apps = result, library_count = #libraries, scanned_libraries = scanned,
        unavailable_libraries = unavailable, unreadable_manifests = unreadable,
        library_metadata_unreadable = library_metadata_unreadable,
    }
end

return M
