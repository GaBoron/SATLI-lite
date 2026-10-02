local json = require("json_codec")
local fs = require("fs")
local storage = require("storage")
local network = require("network")
local package_format = require("update_package")
local version = require("generated_version")
local M = {}
local id = "com.gaboron.satli-lite"
local releases = "https://github.com/GaBoron/SATLI-lite/releases/"
local latest = { current_version = version, available = false }
local candidate

local function semver(value)
    assert(type(value) == "string", "版本号无效")
    local a, b, c = value:match("^(%d+)%.(%d+)%.(%d+)$")
    assert(a and b and c and tostring(tonumber(a)) == a and tostring(tonumber(b)) == b and tostring(tonumber(c)) == c, "版本号必须为 MAJOR.MINOR.PATCH")
    return { tonumber(a), tonumber(b), tonumber(c) }
end

local function newer(first, second)
    local a, b = semver(first), semver(second)
    for index = 1, 3 do if a[index] ~= b[index] then return a[index] > b[index] end end
    return false
end

function M.status() return latest end

function M.check()
    if latest.pending_restart then return latest end
    local text = network.get("https://api.github.com/repos/GaBoron/SATLI-lite/releases/latest", 1024 * 1024, true)
    if not text then
        candidate = nil
        latest = { current_version = version, available = false }
        return latest
    end
    local release = json.decode(text)
    assert(type(release) == "table" and not release.draft and not release.prerelease, "没有正式插件版本")
    local remote_version = tostring(release.tag_name):gsub("^v", "")
    semver(remote_version)
    assert(type(release.html_url) == "string" and release.html_url:sub(1, #releases) == releases, "发布来源无效")
    candidate = nil
    latest = { current_version = version, latest_version = remote_version, available = newer(remote_version, version), release_url = release.html_url }
    if not latest.available then return latest end
    for _, asset in ipairs(release.assets or {}) do
        if asset.name == "update.json" then
            local url = asset.browser_download_url
            assert(type(url) == "string" and url:sub(1, #releases + 9) == releases .. "download/", "更新来源无效")
            candidate = { url = url, version = remote_version }
        end
    end
    assert(candidate, "新版未提供自更新文件 update.json")
    return latest
end

function M.install()
    assert(not latest.pending_restart, "更新已准备，请重启 Steam")
    if not candidate then M.check() end
    assert(candidate and latest.available, "没有可安装的插件更新")
    local manifest = json.decode(network.get(candidate.url, 24 * 1024 * 1024))
    assert(manifest.format == 1 and manifest.id == id and manifest.version == candidate.version and manifest.asset == "satli-lite.star", "插件更新清单不匹配")
    assert(type(manifest.size) == "number" and manifest.size > 0 and manifest.size <= 16 * 1024 * 1024 and manifest.size % 1 == 0, "更新包大小无效")
    local bytes = package_format.decode_base64(manifest.package_base64)
    assert(#bytes == manifest.size, "更新包下载不完整")
    local metadata = package_format.metadata(bytes)
    assert(metadata.id == id and metadata.version == manifest.version, "更新包插件身份或版本不匹配")
    local path = fs.join(os.getenv("MILLENNIUM__PLUGINS_PATH") or fs.join(require("millennium").get_install_path(), "plugins"), "satli-lite.star")
    assert(fs.is_file(path) and not fs.is_symlink(path), "请以 satli-lite.star 文件名安装插件后再自更新")
    local old = assert(storage.read(path, 16 * 1024 * 1024), "无法读取当前插件")
    local old_metadata = package_format.metadata(old)
    assert(old_metadata.id == id and old_metadata.version == version, "安装位置与运行版本不一致，已停止自更新")
    local backup = storage.path("plugin-backups", version .. "-" .. storage.token() .. ".star")
    local staged = storage.path("updates", manifest.version .. "-" .. storage.token() .. ".star")
    storage.write(staged, bytes)
    assert(fs.create_directories(fs.parent_path(backup)) ~= nil)
    assert(fs.rename(path, backup), "无法备份旧插件")
    local success, err = fs.rename(staged, path)
    if not success then
        assert(fs.rename(backup, path), "更新失败，旧插件保留在 plugin-backups 目录")
        error("插件替换失败，已恢复旧版: " .. tostring(err))
    end
    latest.pending_restart, latest.available = true, false
    candidate = nil
    return latest
end

return M
