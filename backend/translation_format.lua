local json = require("cjson")
local M = { MAX_BYTES = 32 * 1024 * 1024 }

function M.app_id(value)
    assert(type(value) == "string" and value:match("^[1-9]%d*$") and #value <= 10, "App ID 无效")
    return value
end

function M.variant_id(value)
    assert(type(value) == "string" and value:match("^[a-z0-9][a-z0-9%-]*$") and #value <= 64, "译本版本 ID 无效")
    return value
end

function M.language(value)
    assert(type(value) == "string" and value:match("^[a-z][a-z0-9_]+$") and #value <= 32, "语言无效")
    return value
end

function M.contains(languages, language)
    for _, item in ipairs(languages) do if item == language then return true end end
    return false
end

function M.decode(text, app_id, variant_id, metadata)
    assert(type(text) == "string" and #text > 0 and #text <= M.MAX_BYTES, "JSON 文件大小无效")
    local value = json.decode(text)
    assert(type(value) == "table" and value.version == 1, "不支持的翻译 JSON 格式")
    M.app_id(value.app_id)
    M.variant_id(value.variant_id)
    assert(not app_id or value.app_id == app_id, "下载文件的 App ID 不匹配")
    assert(not variant_id or value.variant_id == variant_id, "下载文件的译本版本不匹配")
    assert(type(value.source_sha256) == "string" and #value.source_sha256 == 64 and value.source_sha256:match("^[0-9a-f]+$"), "源文件标识无效")
    assert(type(value.languages) == "table" and #value.languages > 0 and #value.languages <= 64, "语言列表无效")
    local seen_languages = {}
    for _, language in ipairs(value.languages) do
        M.language(language)
        assert(not seen_languages[language], "语言重复")
        seen_languages[language] = true
    end
    assert(type(value.achievements) == "table", "成就列表无效")
    local count = 0
    for api_name, achievement in pairs(value.achievements) do
        assert(type(api_name) == "string" and #api_name > 0 and #api_name <= 512 and not api_name:find("%c"), "成就 API name 无效")
        assert(type(achievement) == "table" and type(achievement.translations) == "table", "成就翻译无效")
        for _, language in ipairs(value.languages) do
            local text_value = achievement.translations[language]
            assert(type(text_value) == "table" and type(text_value.name) == "string" and type(text_value.description) == "string", "成就文本字段无效")
            assert(#text_value.name <= 16384 and #text_value.description <= 65536, "成就文本过长")
        end
        count = count + 1
    end
    assert(count > 0 and count <= 100000, "成就数量无效")
    if metadata then
        assert(metadata.json and metadata.json.version == 1, "数据源尚未提供 JSON，请先发布翻译库更新")
        assert(#text == metadata.json.size, "下载大小与索引不一致，请刷新翻译库重试")
        assert(value.source_sha256 == metadata.sha256, "译本已变化，请刷新翻译库重试")
        assert(count == metadata.achievements, "成就数量与索引不一致")
        assert(#value.languages == #metadata.languages, "语言与索引不一致")
        for _, language in ipairs(metadata.languages) do assert(seen_languages[language], "语言与索引不一致") end
    end
    return value
end

return M
