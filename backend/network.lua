local http = require("http")
local M = {}
local github = "https://raw.githubusercontent.com/GaBoron/steam-achievement-translation-library/main/"

function M.base(value)
    if not value or value == "" then return github end
    assert(type(value) == "string" and #value <= 2048 and value:match("^https://[%w%.%-]+[:%d]*/[%w%./_~@%-]*$"), "镜像须为无凭据、无查询参数的 HTTPS 目录地址")
    assert(not value:find("/%.%./", 1, false), "镜像地址无效")
    return value:sub(-1) == "/" and value or value .. "/"
end

function M.get(url, maximum, allow_missing)
    local response = http.get(url, {
        timeout = 25, follow_redirects = true, verify_ssl = true,
        user_agent = "SATLI-lite", headers = { ["Accept"] = "application/json" },
    })
    assert(response, "网络请求失败，请检查 Millennium 的网络与代理设置")
    if allow_missing and response.status == 404 then return nil end
    assert(response.status == 200, "下载失败（HTTP " .. tostring(response.status) .. "）")
    assert(type(response.body) == "string" and #response.body > 0 and #response.body <= maximum, "下载内容大小无效")
    return response.body
end

return M
