-- Keep JSON independent of native modules and preserve array/object identity.
local decode = require("vendor.lunajson.decoder")()
local encode = require("vendor.lunajson.encoder")()
local M = { null = function() end }
-- Keep the notice in a runtime value so release minification retains it.
M.license = [[
The MIT License (MIT)

Copyright (c) 2015-2017 Shunsuke Shimizu (grafi)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
]]
local array_meta = {
    __index = function(value, key)
        -- Lunajson reads [0] for array length. Compute it after insert/remove.
        if key == 0 then return #value end
    end,
}

function M.array(value)
    return setmetatable(value or {}, array_meta)
end

local function tag_arrays(value)
    if type(value) ~= "table" then return value end
    if rawget(value, 0) ~= nil then
        value[0] = nil
        M.array(value)
    end
    for _, child in pairs(value) do tag_arrays(child) end
    return value
end

function M.decode(text)
    return tag_arrays(decode(text, nil, M.null, true))
end

function M.encode(value)
    return encode(value == nil and M.null or value, M.null)
end

return M
