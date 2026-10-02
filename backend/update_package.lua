-- Parse metadata only. Never execute the Lua shim contained in a downloaded package.
local bit = require("bit")
local M = {}
local alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

function M.decode_base64(text)
    assert(type(text) == "string" and #text % 4 == 0 and not text:find("[^A-Za-z0-9+/=]"), "更新包编码无效")
    local bytes = {}
    for index = 1, #text, 4 do
        local group = text:sub(index, index + 3)
        assert(not group:sub(1, 2):find("=", 1, true), "更新包编码无效")
        if group:find("=", 1, true) then assert(index + 3 == #text and (group:sub(3) == "==" or group:sub(4) == "="), "更新包填充无效") end
        local value = 0
        for char_index = 1, 4 do
            local char = group:sub(char_index, char_index)
            local position = char == "=" and 1 or alphabet:find(char, 1, true)
            assert(position, "更新包编码无效")
            value = value * 64 + position - 1
        end
        bytes[#bytes + 1] = string.char(math.floor(value / 65536) % 256)
        if group:sub(3, 3) ~= "=" then bytes[#bytes + 1] = string.char(math.floor(value / 256) % 256) end
        if group:sub(4, 4) ~= "=" then bytes[#bytes + 1] = string.char(value % 256) end
    end
    return table.concat(bytes)
end

local function u32(text, at)
    assert(at >= 1 and at + 3 <= #text, "更新包截断")
    local a, b, c, d = text:byte(at, at + 3)
    return a + b * 256 + c * 65536 + d * 16777216
end

local function u64(text, at)
    local low, high = u32(text, at), u32(text, at + 4)
    assert(high == 0, "更新包偏移无效")
    return low
end

local function fnv_step(state, byte)
    local value = bit.bxor(state, byte)
    if value < 0 then value = value + 4294967296 end
    local low, high = value % 65536, math.floor(value / 65536)
    local product = low * 403
    return product % 65536 + ((high * 403 + low * 256 + math.floor(product / 65536)) % 65536) * 65536
end

local function decode_section(raw, flags, metadata)
    if bit.band(flags, 64) ~= 0 then
        local bytes = {}
        for index = 1, #raw do bytes[index] = string.char(bit.bxor(raw:byte(index), 0x4D, (index - 1) % 256)) end
        raw = table.concat(bytes)
    end
    local chunks, pos, rolling, block = {}, 1, 0xA7C3E91F, 0
    while pos <= #raw do
        local count = math.min(64, #raw - pos - 11)
        assert(count > 0 and pos + count + 11 <= #raw, "更新包校验块截断")
        local chunk = raw:sub(pos, pos + count - 1)
        local xor = 0
        for index = 1, #chunk do xor = bit.bxor(xor, chunk:byte(index)) end
        local expected = rolling
        for shift = 0, 3 do expected = fnv_step(expected, math.floor(xor / 256 ^ shift) % 256) end
        assert(u32(raw, pos + count) == xor and u32(raw, pos + count + 4) == expected and u32(raw, pos + count + 8) == block, "更新包章节校验失败")
        rolling, block = expected, block + 1
        chunks[#chunks + 1] = chunk
        pos = pos + count + 12
    end
    local decoded = table.concat(chunks)
    if metadata and bit.band(flags, 128) ~= 0 then
        assert(type(MILLENNIUM_DECOMPRESS) == "function", "Millennium 不支持此更新包压缩格式")
        assert(u32(decoded, 1) <= 1024 * 1024, "更新包元数据过大")
        decoded = MILLENNIUM_DECOMPRESS(decoded)
    end
    return decoded
end

local function metadata_map(text)
    local pos = 2
    local count = text:byte(1)
    if count == 0xDE then
        assert(#text >= 3, "更新包元数据截断")
        count, pos = text:byte(2) * 256 + text:byte(3), 4
    else
        assert(count and count >= 0x80 and count <= 0x8F, "更新包元数据不是 MessagePack 对象")
        count = count - 0x80
    end
    assert(count > 0 and count <= 32, "更新包元数据字段过多")
    local function read_string()
        local tag = text:byte(pos)
        assert(tag, "更新包元数据截断")
        pos = pos + 1
        local length
        if tag >= 0xA0 and tag <= 0xBF then length = tag - 0xA0
        elseif tag == 0xD9 or tag == 0xDA or tag == 0xDB then
            length = 0
            local size = tag == 0xD9 and 1 or (tag == 0xDA and 2 or 4)
            assert(pos + size - 1 <= #text, "更新包元数据截断")
            for _ = 1, size do length = length * 256 + text:byte(pos); pos = pos + 1 end
        else error("更新包元数据字段不是字符串") end
        assert(length <= 4096 and pos + length - 1 <= #text, "更新包元数据字段大小无效")
        local value = text:sub(pos, pos + length - 1)
        pos = pos + length
        return value
    end
    local result = {}
    for _ = 1, count do
        local key = read_string()
        assert(not result[key], "更新包元数据字段重复")
        result[key] = read_string()
    end
    assert(pos == #text + 1, "更新包元数据包含额外数据")
    return result
end

function M.metadata(bytes)
    assert(type(bytes) == "string" and #bytes >= 16 and #bytes <= 16 * 1024 * 1024, "更新包大小无效")
    local shim_length = u32(bytes, 1)
    assert(shim_length > 0 and shim_length <= 4 * 1024 * 1024, "更新包头无效")
    local header = 5 + shim_length
    assert(bytes:sub(header, header + 3) == "STAR", "不是 Millennium STAR 插件")
    assert(bytes:byte(header + 4) == 2, "不支持的 STAR 包格式")
    local count = bytes:byte(header + 6)
    assert(count and count > 0 and count <= 32 and header + 12 + count * 256 <= #bytes, "更新包章节表无效")
    local metadata
    for index = 0, count - 1 do
        local entry = header + 12 + index * 256
        local offset, length = u64(bytes, entry + 8), u64(bytes, entry + 16)
        local start = header + offset
        assert(length > 0 and start >= header + 12 + count * 256 and start + length - 1 <= #bytes, "更新包章节范围无效")
        local is_metadata = bytes:byte(entry) == 1
        local decoded = decode_section(bytes:sub(start, start + length - 1), bytes:byte(entry + 1), is_metadata)
        if is_metadata then assert(not metadata, "更新包元数据重复"); metadata = metadata_map(decoded) end
    end
    assert(metadata, "更新包缺少插件元数据")
    return metadata
end

return M
