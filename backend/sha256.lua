-- SHA-256 over raw downloaded bytes. Uses LuaJIT's 32-bit bit operations.
local bit = require("bit")
local band, bxor, bnot, rshift, ror = bit.band, bit.bxor, bit.bnot, bit.rshift, bit.ror
local K = {
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
}
local function word(value)
    return string.char(band(rshift(value, 24), 255), band(rshift(value, 16), 255),
        band(rshift(value, 8), 255), band(value, 255))
end

return function(text)
    local bytes = #text
    text = text .. "\128" .. string.rep("\0", (55 - bytes) % 64)
        .. word(math.floor(bytes / 536870912)) .. word((bytes * 8) % 4294967296)
    local h = { 0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19 }
    local w = {}
    for offset = 1, #text, 64 do
        for index = 1, 16 do
            local a,b,c,d = text:byte(offset + (index - 1) * 4, offset + (index - 1) * 4 + 3)
            w[index] = bit.tobit(a * 16777216 + b * 65536 + c * 256 + d)
        end
        for index = 17, 64 do
            local x, y = w[index - 15], w[index - 2]
            w[index] = bit.tobit(w[index - 16] + bxor(ror(x,7),ror(x,18),rshift(x,3))
                + w[index - 7] + bxor(ror(y,17),ror(y,19),rshift(y,10)))
        end
        local a,b,c,d,e,f,g,j = unpack(h)
        for index = 1, 64 do
            local t1 = bit.tobit(j + bxor(ror(e,6),ror(e,11),ror(e,25))
                + bxor(band(e,f),band(bnot(e),g)) + K[index] + w[index])
            local t2 = bit.tobit(bxor(ror(a,2),ror(a,13),ror(a,22)) + bxor(band(a,b),band(a,c),band(b,c)))
            j,g,f,e,d,c,b,a = g,f,e,bit.tobit(d+t1),c,b,a,bit.tobit(t1+t2)
        end
        local round = { a,b,c,d,e,f,g,j }
        for index = 1, 8 do h[index] = bit.tobit(h[index] + round[index]) end
    end
    local result = {}
    for index = 1, 8 do result[index] = bit.tohex(h[index]) end
    return table.concat(result)
end
