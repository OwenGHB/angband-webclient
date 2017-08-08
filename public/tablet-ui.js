var TU = function(socket) {
    return {
        config_keys: {
            tu_key_esc:            '\u001b',
            tu_key_enter:          '\r'
        },
        
        config_shortcuts: {
            tu_sc_1:  { name: "", sequence: "" },
            tu_sc_2:  { name: "", sequence: "" },
            tu_sc_3:  { name: "", sequence: "" },
            tu_sc_4:  { name: "", sequence: "" },
            tu_sc_5:  { name: "", sequence: "" },
            tu_sc_6:  { name: "", sequence: "" },
            tu_sc_7:  { name: "", sequence: "" },
            tu_sc_8:  { name: "", sequence: "" },
            tu_sc_9:  { name: "", sequence: "" },
            tu_sc_10: { name: "", sequence: "" },
            tu_sc_11: { name: "", sequence: "" },
            tu_sc_12: { name: "", sequence: "" },
            tu_sc_13: { name: "", sequence: "" },
            tu_sc_14: { name: "", sequence: "" },
            tu_sc_15: { name: "", sequence: "" },
        },
        
        config_specials: {
            tu_special_key_1:  { symbol: '`', sequence: '`' },
            tu_special_key_2:  { symbol: '~', sequence: '~' },
            tu_special_key_3:  { symbol: '-', sequence: '-' },
            tu_special_key_4:  { symbol: '_', sequence: '_' },
            tu_special_key_5:  { symbol: '{', sequence: '{' },
            tu_special_key_6:  { symbol: '}', sequence: '}' },
            tu_special_key_7:  { symbol: '[', sequence: '[' },
            tu_special_key_8:  { symbol: ']', sequence: ']' },
            tu_special_key_9:  { symbol: ';', sequence: ';' },
            tu_special_key_10: { symbol: ':', sequence: ':' },
            tu_special_key_11: { symbol: "'", sequence: "'" },
            tu_special_key_12: { symbol: '"', sequence: '"' },
            tu_special_key_13: { symbol: '<', sequence: '<' },
            tu_special_key_14: { symbol: '>', sequence: '>' },
            tu_special_key_15: { symbol: ',', sequence: ',' },
            tu_special_key_16: { symbol: '.', sequence: '.' },
            tu_special_key_17: { symbol: '?', sequence: '?' },
            tu_special_key_18: { symbol: '/', sequence: '/' },
            tu_special_key_19: { symbol: '\\',sequence: '\\' },
            tu_special_key_20: { symbol: '|', sequence: '|' },
            
            tu_special_key_21: { symbol: 'PgUp', sequence: '\u001b[5~' },
            tu_special_key_22: { symbol: 'PgDn', sequence: '\u001b[6~' },
        },
        
        config_quick: {
            tu_quick_1:  { name: 'equipm', sequence: 'e' },
            tu_quick_2:  { name: 'invent', sequence: 'i' },
            tu_quick_3:  { name: 'wear', sequence: 'w' },
            tu_quick_4:  { name: 'takeoff', sequence: 't' },
            tu_quick_5:  { name: 'monstrs', sequence: '[' },
            tu_quick_6:  { name: 'objects', sequence: ']' },
            tu_quick_7:  { name: 'char', sequence: 'C' },
            tu_quick_8:  { name: '*', sequence: '*' },
             
            tu_quick_9:  { name: 'rod', sequence: 'z' },
            tu_quick_10: { name: 'wand', sequence: 'a' },
            tu_quick_11: { name: 'staff', sequence: 'u' },
            tu_quick_12: { name: 'throw', sequence: 'f' },
            
            tu_quick_13: { name: 'run', sequence: '.' },
            tu_quick_14: { name: 'center', sequence: '\u0016' },
        },
        
        // EVENT_TYPE: 'touch',
        EVENT_TYPE: 'click', // for debugging
        edit_mode: false,
        isCaps: false,
        specialKeyboard: false,
        socket: socket,
        
        initArrowKeys: function() {
            var arrows = ['1','2','3','4','5','6','7','8','9'];
            var self = this;
            arrows.map(function(key) {
                // $("#tu-arrows-"+key).click(function(e) { fireKey(key); });
                $("#tu-arrows-" + key).on(self.EVENT_TYPE, function(e) { 
                    e.preventDefault();
                    self.fireKey(key); 
                });
            });
        },
        
        initLowercaseKeys: function(isCaps) {
            console.log("tablet ui: initializing keyboard keys, caps", isCaps);
            var keys = "0123456789abcdefghijklmnopqrstuvwxyz";
            var ids = keys;
            if(isCaps) keys = "!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            var self = this;
            for(var i=0; i<keys.length; i++) {
                $("#tu-key-" + ids[i]).text(keys[i]);
                $("#tu-key-" + ids[i]).off(self.EVENT_TYPE)
                $("#tu-key-" + ids[i]).on(self.EVENT_TYPE, function(i) { 
                    return function() {
                        self.fireKey(keys[i]); 
                    };
                }(i));
            }
        },
        
        initExtraKeys: function() {
            var self = this;
            var keys = Object.keys(this.config_keys);
            for(var i=0; i<keys.length; i++) {
                var s = this.config_keys[keys[i]], k = keys[i];
                $("#" + k).on(this. EVENT_TYPE, function(s,k) { return function() { self.fireKey(s); }}(s,k));
            }
        }, 
        
        initSpecialKeyboardKeys: function() {
            var self = this;
            var keys = Object.keys(this.config_specials);
            for(var i=0; i<keys.length; i++) {
                var s = this.config_specials[keys[i]].sequence, 
                    n = this.config_specials[keys[i]].symbol, 
                    k = keys[i];
                $("#" + k).text(n);
                $("#" + k).off(self.EVENT_TYPE)
                $("#" + k).on(self.EVENT_TYPE, function(i,s,n,k) { 
                    return function() {
                        self.fireKey(s); 
                    };
                }(i,s,n,k));
            }
        },
        
        initQuickKeys: function() {
            var self = this;
            var keys = Object.keys(this.config_quick);
            for(var i=0; i<keys.length; i++) {
                var s = this.config_quick[keys[i]].sequence, 
                    n = this.config_quick[keys[i]].name, 
                    k = keys[i];
                $("#" + k).text(n);
                $("#" + k).off(self.EVENT_TYPE)
                $("#" + k).on(self.EVENT_TYPE, function(i,s,n,k) { 
                    return function() {
                        self.fireKey(s); 
                    };
                }(i,s,n,k));
            }
        },
        
        initShortcutKeys: function() {
            var self = this;
            var keys = Object.keys(this.config_shortcuts);
            for(var i=0; i<keys.length; i++) {
                var s = this.config_shortcuts[keys[i]].sequence, 
                    n = this.config_shortcuts[keys[i]].name, 
                    k = keys[i];
                $("#" + k).off(this.EVENT_TYPE);
                if(n === "") {
                    $("#" + k).text("---");
                }
                else {
                    $("#" + k).on(this.EVENT_TYPE, function(s,k) { 
                        return function() {
                            self.fireKey(s); 
                        };
                    }(s,k));
                    $("#" + k).text(n);
                }
            }
        },
        
        initShortcutEditKeys: function() {
            var self = this;
            var keys = Object.keys(this.config_shortcuts);
            for(var i=0; i<keys.length; i++) {
                var s = this.config_shortcuts[keys[i]].sequence, 
                    n = this.config_shortcuts[keys[i]].name,
                    k = keys[i];
                $("#" + k).off(this.EVENT_TYPE);
                $("#" + k).on(this.EVENT_TYPE, function(s,k) { 
                    return function() {
                        self.editShortcut(s,k); 
                    };
                }(s,k));
            }
        },
        
        toggleShortcutEditMode: function() {
            if(this.edit_mode) {
                $("#tu-skills button").removeClass("edit-mode");
                this.initShortcutKeys();
            }
            else {
                $("#tu-skills button").addClass("edit-mode");
                this.initShortcutEditKeys();
            }
            this.edit_mode = !this.edit_mode;
        },
        
        toggleCaps: function() {
            this.specialKeyboard = false;
            $("#tu-keyboard-specials").addClass("hidden");
            $("#tu-keyboard").removeClass("hidden");
            this.isCaps = !this.isCaps;
            this.initLowercaseKeys(this.isCaps);
        },
        
        toggleSpecialKeyboardKeys: function() {
            this.specialKeyboard = !this.specialKeyboard;
            if(this.specialKeyboard) {
                $("#tu-keyboard-specials").removeClass("hidden");
                $("#tu-keyboard").addClass("hidden");
            }
            else {
                $("#tu-keyboard-specials").addClass("hidden");
                $("#tu-keyboard").removeClass("hidden");
            }
        },
        
        editShortcut: function(original_sequence, original_key) {
            var name = prompt("Name it (4 chars max)", this.config_shortcuts[original_key].name);
            var seq = prompt("Sequence", original_sequence);
            $("#" + original_key).text(name);
            this.config_shortcuts[original_key] = { name: name, sequence: seq };
            this.saveShortcuts();
        },
        
        fireKey: function(key) {
            if(!this.socket)
                return console.error("no socket");
            if(!key)
                return console.error("no key", key);
                console.log("key:", key);
            this.socket.send(JSON.stringify({
        		eventtype:'gameinput',
        		content: key
        	}));
        },
        
        saveShortcuts: function() {
            if(window.localStorage) {
                window.localStorage.setItem("aw_tu_shortcuts", JSON.stringify(this.config_shortcuts));
            }
        },
        
        loadShortcuts: function() {
            if(window.localStorage) {
                var s = window.localStorage.getItem("aw_tu_shortcuts");
                if(s) {
                    this.config_shortcuts = JSON.parse(s);
                }
            }
        },
        
        
        unhideControlTab: function() {
            $("#btn-tabletui").removeClass("hidden");
        },
        
        
        init: function() {
            console.log("initializing tablet ui");
            this.unhideControlTab();
            this.loadShortcuts();
            this.initArrowKeys();
            this.initLowercaseKeys(this.isCaps);
            this.initExtraKeys();
            this.initQuickKeys();
            this.initShortcutKeys();
            this.initSpecialKeyboardKeys();
            
            var self = this;
            $("#tu-edit-mode").on(this.EVENT_TYPE, self.toggleShortcutEditMode.bind(self));
            $("#tu_key_caps").on(this.EVENT_TYPE, self.toggleCaps.bind(self));
            $("#tu_key_special").on(this.EVENT_TYPE, self.toggleSpecialKeyboardKeys.bind(self));
            $("#tu-save-quit").on(this.EVENT_TYPE, function() { self.fireKey("\u0018");});
            $("#tu-key-dot").on(this.EVENT_TYPE, function() { self.fireKey(".");});
            $("#tu_key_space").on(this.EVENT_TYPE, function() { self.fireKey(" ");});
            
            $('#tu-arrows button').bind('touchend', function(e) {
                e.preventDefault();
                $(this).click();
            });
        }
        
    };
};