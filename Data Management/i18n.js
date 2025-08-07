// i18n configuration
const i18next = {
    _language: 'en',
    _resources: {},
    _callbacks: [],
    
    init: function(options, callback) {
        this._language = options.lng || 'en';
        this._resources = options.resources || {};
        
        if (typeof callback === 'function') {
            callback();
        }
    },
    
    changeLanguage: function(lng, callback) {
        this._language = lng;
        
        if (typeof callback === 'function') {
            callback();
        }
    },
    
    t: function(key, options) {
        const keys = key.split('.');
        let value = this._resources[this._language]?.translation;
        
        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) return key;
        }
        
        if (typeof value === 'string' && options) {
            return value.replace(/\{\{(\w+)\}\}/g, (match, p1) => {
                return options[p1] || match;
            });
        }
        
        return value || key;
    },
    
    on: function(event, callback) {
        if (event === 'initialized') {
            this._callbacks.push(callback);
        }
    }
};