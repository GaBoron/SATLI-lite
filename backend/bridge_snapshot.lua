local json = require("json_codec")
local storage = require("storage")
local format = require("translation_format")
local M = {}

function M.build(current, document, reserve_capacity)
    local apps = {}
    if current.settings.enabled or reserve_capacity then
        for app_id, entry in pairs(current.apps) do
            if entry.enabled then
                local value = document(entry)
                local original = value
                if entry.original_file and entry.original_file ~= entry.file then
                    local original_entry = storage.clone(entry)
                    original_entry.file = entry.original_file
                    original = document(original_entry)
                end
                local achievements = {}
                for api_name, achievement in pairs(value.achievements) do
                    local sources = json.array()
                    for _, source in pairs((original.achievements[api_name] or achievement).translations) do table.insert(sources, source) end
                    for _, source in pairs(achievement.translations) do table.insert(sources, source) end
                    achievements[api_name] = { translations = { satli = achievement.translations[entry.language] }, sources = sources }
                end
                apps[app_id] = { achievements = achievements }
            end
        end
    end
    local text = json.encode({ version = 1, generated_at = tostring(os.time()), apps = apps })
    assert(#text <= format.MAX_BYTES, "启用译本总量超过 32 MiB，请停用部分游戏")
    return text
end

return M
