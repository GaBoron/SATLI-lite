local json = require("json_codec")
local sha256 = require("sha256")
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

local function text_length(text)
    local index, count = 1, 0
    while index <= #text do
        local first = text:byte(index)
        local length = first < 128 and 1 or (first >= 194 and first <= 223 and 2
            or (first >= 224 and first <= 239 and 3 or (first >= 240 and first <= 244 and 4)))
        assert(length and index + length - 1 <= #text, "文本不是有效 UTF-8")
        local second = text:byte(index + 1)
        if length > 1 then
            assert(not (first == 224 and second < 160) and not (first == 237 and second >= 160)
                and not (first == 240 and second < 144) and not (first == 244 and second >= 144), "文本不是有效 UTF-8")
            for offset = 1, length - 1 do
                local continuation = text:byte(index + offset)
                assert(continuation >= 128 and continuation <= 191, "文本不是有效 UTF-8")
            end
        end
        count, index = count + 1, index + length
    end
    return count
end

function M.decode(text, app_id, variant_id, metadata)
    assert(type(text) == "string" and #text > 0 and #text <= M.MAX_BYTES, "JSON 文件大小无效")
    local value = json.decode(text)
    assert(type(value) == "table" and (value.version == 1 or value.version == 2), "不支持的翻译 JSON 格式")
    M.app_id(value.app_id)
    M.variant_id(value.variant_id)
    assert(not app_id or value.app_id == app_id, "下载文件的 App ID 不匹配")
    assert(not variant_id or value.variant_id == variant_id, "下载文件的译本版本不匹配")
    if value.version == 1 then
        assert(type(value.source_sha256) == "string" and #value.source_sha256 == 64 and value.source_sha256:match("^[0-9a-f]+$"), "源文件标识无效")
    else
        local fields = { version = true, app_id = true, variant_id = true, languages = true, achievements = true }
        for key in pairs(value) do assert(fields[key], "格式 2 含未知字段") end
    end
    assert(type(value.languages) == "table" and #value.languages > 0 and #value.languages <= 64, "语言列表无效")
    local seen_languages = {}
    for _, language in ipairs(value.languages) do
        M.language(language)
        assert(not seen_languages[language], "语言重复")
        seen_languages[language] = true
    end
    if value.version == 2 then
        local previous = ""
        for _, language in ipairs(value.languages) do
            assert(language > previous, "语言须按字母序排列")
            previous = language
        end
    end
    assert(type(value.achievements) == "table", "成就列表无效")
    local count = 0
    for api_name, achievement in pairs(value.achievements) do
        assert(type(api_name) == "string" and #api_name > 0 and text_length(api_name) <= 512 and not api_name:find("%c"), "成就 API name 无效")
        assert(type(achievement) == "table" and type(achievement.translations) == "table", "成就翻译无效")
        for _, language in ipairs(value.languages) do
            local text_value = achievement.translations[language]
            assert(type(text_value) == "table" and type(text_value.name) == "string" and type(text_value.description) == "string", "成就文本字段无效")
            assert(not text_value.name:find("\0", 1, true) and not text_value.description:find("\0", 1, true), "成就文本含 NUL")
            if value.version == 2 then
                assert(text_length(text_value.name) <= 65536 and text_length(text_value.description) <= 65536, "成就文本过长")
            else
                assert(#text_value.name <= 16384 and #text_value.description <= 65536, "成就文本过长")
            end
        end
        if value.version == 2 then
            for language in pairs(achievement.translations) do assert(seen_languages[language], "含未声明语言") end
            for _, field in ipairs({ "name", "description" }) do
                local populated = 0
                for _, language in ipairs(value.languages) do
                    if achievement.translations[language][field]:find("%S") then populated = populated + 1 end
                end
                assert(populated == 0 or populated == #value.languages, "译文语言覆盖不完整")
            end
        end
        count = count + 1
    end
    assert(count > 0 and count <= (value.version == 2 and 10000 or 100000), "成就数量无效")
    if metadata then
        assert(metadata.json and metadata.json.version == value.version, "JSON 版本与目录不一致")
        assert(#text == metadata.json.size, "下载大小与索引不一致，请刷新翻译库重试")
        if value.version == 1 then
            assert(value.source_sha256 == metadata.sha256, "译本已变化，请刷新翻译库重试")
        else
            assert(sha256(text) == metadata.json.sha256, "JSON 内容校验失败，请刷新翻译库重试")
        end
        assert(count == metadata.achievements, "成就数量与索引不一致")
        assert(#value.languages == #metadata.languages, "语言与索引不一致")
        for _, language in ipairs(metadata.languages) do assert(seen_languages[language], "语言与索引不一致") end
    end
    return value
end

function M.identity(value, text)
    return value.version == 1 and value.source_sha256 or sha256(text)
end

function M.variant_identity(variant)
    return variant.format == "json" and variant.json.sha256 or variant.sha256
end

return M
