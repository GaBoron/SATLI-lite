-- Text KeyValues only: Steam library metadata and app manifests, never BIN schemas.
local M = {}

function M.parse(text)
    text = text:gsub("^\239\187\191", "")
    local position = 1
    local function token()
        while position <= #text do
            local character = text:sub(position, position)
            if character:match("%s") then position = position + 1
            elseif text:sub(position, position + 1) == "//" then
                position = (text:find("\n", position + 2, true) or #text) + 1
            else break end
        end
        if position > #text then return nil end
        local character = text:sub(position, position)
        position = position + 1
        if character == "{" or character == "}" then return character, "brace" end
        if character ~= '"' then
            local start = position - 1
            position = text:find('[%s{}"]', position) or (#text + 1)
            return text:sub(start, position - 1), "string"
        end
        local pieces = {}
        while position <= #text do
            local start = position
            position = text:find('["\\]', position) or (#text + 1)
            pieces[#pieces + 1] = text:sub(start, position - 1)
            local ending = text:sub(position, position)
            position = position + 1
            if ending == '"' then return table.concat(pieces), "string" end
            assert(ending == "\\" and position <= #text, "Steam 清单的字符串未结束")
            local escaped = text:sub(position, position)
            local escapes = { n = "\n", r = "\r", t = "\t", ['"'] = '"', ["\\"] = "\\" }
            pieces[#pieces + 1] = escapes[escaped] or ("\\" .. escaped)
            position = position + 1
        end
        error("Steam 清单的字符串未结束")
    end
    local object
    object = function(depth)
        assert(depth <= 32, "Steam 清单的嵌套过深")
        local result = {}
        while true do
            local key, kind = token()
            if not key then assert(depth == 0, "Steam 清单缺少结束括号"); return result end
            if key == "}" and kind == "brace" then assert(depth > 0, "Steam 清单的括号无效"); return result end
            assert(kind == "string", "Steam 清单的字段无效")
            local value, value_kind = token()
            assert(value ~= nil, "Steam 清单缺少字段值")
            if value == "{" and value_kind == "brace" then result[key] = object(depth + 1)
            else assert(value_kind == "string", "Steam 清单的字段值无效"); result[key] = value end
        end
    end
    return object(0)
end

function M.read(path)
    local file = assert(io.open(path, "rb"), "无法读取 Steam 清单")
    local text = file:read(2 * 1024 * 1024 + 1)
    file:close()
    assert(type(text) == "string" and #text <= 2 * 1024 * 1024, "Steam 清单超过大小限制")
    return M.parse(text)
end

return M
