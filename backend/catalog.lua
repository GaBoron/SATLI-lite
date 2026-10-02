local json = require("cjson")
local storage = require("storage")
local format = require("translation_format")
local network = require("network")
local M = {}
local snapshot

local function validate(value)
    assert(type(value) == "table" and value.version == 2 and type(value.games) == "table", "翻译库不是 Catalog V2")
    local count = 0
    for app_id, game in pairs(value.games) do
        format.app_id(app_id)
        assert(type(game) == "table" and type(game.name) == "string" and type(game.variants) == "table" and game.variants.default, "游戏索引无效")
        assert(type(game.contributors) == "table", "贡献者数据无效")
        local variants = 0
        for variant_id, variant in pairs(game.variants) do
            format.variant_id(variant_id)
            assert(type(variant) == "table" and type(variant.languages) == "table", "译本索引无效")
            assert(type(variant.sha256) == "string" and #variant.sha256 == 64 and variant.sha256:match("^[0-9a-f]+$"), "译本标识无效")
            assert(type(variant.achievements) == "number" and variant.achievements >= 1 and variant.achievements % 1 == 0, "成就数量无效")
            for _, language in ipairs(variant.languages) do format.language(language) end
            if variant.json then
                assert(type(variant.json) == "table" and variant.json.version == 1 and type(variant.json.size) == "number" and variant.json.size > 0 and variant.json.size <= format.MAX_BYTES and variant.json.size % 1 == 0, "JSON 元数据无效")
            end
            variants = variants + 1
        end
        assert(variants >= 1 and variants <= 16, "译本数量无效")
        count = count + 1
    end
    assert(count > 0, "翻译库为空")
    return value
end

function M.get()
    if not snapshot then
        local cached = storage.load("catalog.json", nil)
        if cached then
            cached.catalog = validate(cached.catalog)
            snapshot = cached
        end
    end
    return snapshot
end

function M.refresh(settings)
    local base = network.base(settings.catalog_base)
    local text = network.get(base .. "index-v2.json", format.MAX_BYTES)
    local catalog = validate(json.decode(text))
    local next_snapshot = { catalog = catalog, fetched_at = os.time(), base = base }
    storage.save("catalog.json", next_snapshot)
    snapshot = next_snapshot
    return next_snapshot
end

function M.variant(app_id, variant_id)
    format.app_id(app_id)
    format.variant_id(variant_id)
    local cached = assert(M.get(), "请先刷新翻译库")
    local game = assert(cached.catalog.games[app_id], "翻译库未收录此游戏")
    local variant = assert(game.variants[variant_id], "找不到这个译本版本")
    assert(variant.json and variant.json.version == 1, "数据源尚未提供 JSON，请先发布翻译库更新")
    return game, variant, cached.base
end

function M.download(app_id, variant_id)
    local game, variant, base = M.variant(app_id, variant_id)
    local path = "files/" .. app_id .. "/" .. variant_id .. "/UserGameStatsSchema_" .. app_id .. ".json"
    local text = network.get(base .. path, format.MAX_BYTES)
    return format.decode(text, app_id, variant_id, variant), text, game
end

return M
