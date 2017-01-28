local application = require "mjolnir.application"
local hotkey = require "mjolnir.hotkey"
local window = require "mjolnir.window"
local fnutils = require "mjolnir.fnutils"
local hints = require "mjolnir.th.hints"

hotkey.bind({"cmd", "alt"}, "l", function() 
    os.execute("pmset displaysleepnow")
end)

hotkey.bind({"cmd", "alt"},"t", hints.windowHints)

hotkey.bind({"cmd", "alt"}, "right", function()
    local win = window.focusedwindow()
    local wf = win:frame()
    local screen = win:screen()
    local sf = screen:frame()

    wf.h = sf.h
    wf.y = sf.y
    
    wf.w = sf.w / 2
    wf.x = sf.x + sf.w / 2

    win:setframe(wf)
end)

hotkey.bind({"cmd", "alt"}, "left", function()
    local win = window.focusedwindow()
    local wf = win:frame()
    local screen = win:screen()
    local sf = screen:frame()

    wf.h = sf.h
    wf.y = sf.y
    
    wf.w = sf.w / 2
    wf.x = sf.x

    win:setframe(wf)
end)

-- maximize window
hotkey.bind({"cmd", "alt"}, "up", function()
    local win = window.focusedwindow()
    local wf = win:frame()
    local screen = win:screen()
    local sf = screen:frame()
    local maxratio = 0.9975

    wf.h = sf.h
    wf.y = sf.y
    
    wf.w = maxratio * sf.w
    wf.x = sf.x + (1.0 - maxratio) * sf.w 

    win:setframe(wf)
end)

-- cycle between corners
hotkey.bind({"cmd", "alt"}, "down", function()
    local win = window.focusedwindow()
    local wf = win:frame()
    local screen = win:screen()
    local sf = screen:frame()
    
    local scx = sf.x + sf.w / 2
    local scy = sf.y + sf.h / 2
    
    local wcx = wf.x + wf.w / 2
    local wcy = wf.y + wf.h / 2

    wf.w = sf.w / 2
    wf.h = sf.h / 2
    
    -- upper right corner
    if (wcx > scx) and (wcy <= scy) then
        wf.x = sf.x + sf.w / 2
        wf.y = sf.y + sf.h / 2
    
    -- lower right corner
    elseif (wcx > scx) and (wcy > scy) then
        wf.x = sf.x
        wf.y = sf.y + sf.h / 2 
    
    -- lower left corner
    elseif (wcx < scx) and (wcy > scy) then
        wf.x = sf.x
        wf.y = sf.y
    
    -- upper left corner
    else
        wf.x = sf.x + sf.w / 2
        wf.y = sf.y
    end

    win:setframe(wf)
end)


