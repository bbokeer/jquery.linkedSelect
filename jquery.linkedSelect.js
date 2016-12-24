/*
 *
 * jQuery Linked Selects Plugin
 * 2016-12-24
 *
 * Copyright 2016 Bogac Bokeer
 * Licensed under the MIT license
 *
 */
!(function(root, factory) {
    'use strict';

    if ( typeof define === 'function' && define.amd ) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if ( typeof exports === 'object' ) {
        // Node/CommonJS
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals
        factory(root.jQuery);
    }
}(this, function($) {
    'use strict';

    var PLUGIN_NAME = 'bbLinkedSelect';

    var isExists = (function() {

            var _$ = function(what, typed, ns) {

                if ( !what || typeof what !== 'string' ) {
                    return null;
                }

                typed = typed || null;
                ns = ns || window;
                what = what.split('.');

                var exists = false,
                    prop, subns;

                while ( what.length > 1 && (typeof ns === 'object') ) {
                    subns = what.shift();
                    prop = what;
                    ns = ns[subns];
                }

                if ( typeof ns === 'object' ) {
                    what = what.shift();
                    prop = what;
                    what = ns[what];
                    exists = typed ? typeof what === typed : typeof what !== 'undefined';
                }

                _$.lastKey = exists ? {
                    o: ns,
                    prop: prop
                } : null;
                _$.lastValue = exists ? what : null;

                return exists;
            };

            _$.lastKey = null;
            _$.lastValue = null;
            _$.setLastKey = function(value) {

                var ns, prop,
                    r;

                if ( _$.lastKey && (ns = _$.lastKey.o) && (prop = _$.lastKey.prop) ) {
                    r = ns[prop] = value;
                }

                return r;
            };

            return _$;
        }()),
        isInteger = function(value) {
            return Number(value) === value && value % 1 === 0;
        },
        isFloat =function(value) {
            return value === +value && value !== (value | 0);
        },
        isString = function(variable) {
            return $.type(variable) === 'string';
        },
        hasOwn = function(obj, key) {
            return Object.prototype.hasOwnProperty.call(obj, key);
        };


    $.linkedSelect = {
        options: {
            attrTarget: 'data-select-target',
            attrService: 'data-select-service',
            attrFilter: 'data-select-service-asfilter',
            attrMap: 'data-select-map',
            method: 'POST',
            onBeforeSend: function(/* service, data, serviceUri, options, base */) {},
            onBeforeFill: function(/* source, target, options */) {},
            onAfterFill: function(/* target, source, options */) {}
        },
        extension: {
            service: {
                _default: 'ajax',
                variable: function(service) {

                    // var base = this;

                    if ( !isExists(service.name) ) {
                        return false;
                    }

                    var p = $.Deferred();

                    p.resolve({
                        result: true,
                        items: isExists.lastValue
                    });

                    return p;
                },
                ajax: function(service) {

                    var reqInfo = service.name.split('|');

                    var serviceUrl = reqInfo[0].trim() || location.href,
                        serviceMethod = reqInfo[1] || 'POST';

                    return $.ajax({
                        url: serviceUrl,
                        type: serviceMethod,
                        dataType: 'json',
                        data: service.data
                    });
                }
            },
            filter: {
                _default: 'all',
                filter1: function(filter) {

                    filter = filter.name;

                    var self = $.linkedSelect,
                        filterFn = false;

                    if ( filter && /^[0-9a-z_]+$/i.test(filter) ) {
                        filterFn = function(item, index) {
                            return item[filter] === this.value || self.castData(this.value) === self.castData(item[filter]);
                        };
                    }

                    return filterFn;
                },
                expressions: function(filter) {

                    return filter.name ? new Function('item', 'index', 'return ' + filter.name) : false;
                },
                all: function(filter) {

                    return function() { return true; };
                }
            },
            map: {
                _default: 'asIs',
                asIs: function(value) {
                    return value;
                }
            }
        },
        applyData: function(ext, extInfo) {

            var base = this,
                dataSend = $.extend(true, {}, extInfo),
                fns = base.settings[extInfo.type] || null;

            if ( dataSend.named ) {
                dataSend.callName = dataSend.name;
                dataSend.name = dataSend.named;
            }

            fns && $.isFunction(fns.onBeforeSend) && fns.onBeforeSend(ext, dataSend.data, dataSend.name, $.extend(true, {}, base.settings), base);

            return dataSend || extInfo;
        },
        getExtData: function(ext, extensions, extInfo) {

            var base = this,
                fn, dataSend, extData;

            if ( $.isFunction(fn = extensions[ext] ) ) {
                if ( !extInfo.raw ) {
                    dataSend = base.applyData(ext, extInfo);
                    if ( extData = fn.call(base, dataSend || extInfo) ) {
                        return extData;
                    }
                } else {
                    return fn;
                }
            }

            return null;
        },
        getExtension: function(extensionType, extInfo) {

            extInfo = extInfo || null;

            var base = this,
                extensions = base.extension[extensionType],
                named = (extInfo && extInfo.name && extInfo.name[0] === '@') ? extInfo.name.substr(1) : false,
                extData = null,
                ext;

            extInfo.type = extensionType;
            extInfo.named = named;

            // Named Filter, starts with an '@'
            if ( named ) {
                if ( extData = base.getExtData(named, extensions, extInfo) ) {
                    return extData;
                }
            }

            if ( extensionType === 'map' && !named ) {
                return null;
            }

            for ( ext in extensions ) {
                if ( hasOwn(extensions, ext) && ext !== '_default' && ext !== extensions._default ) {
                    if ( extData = base.getExtData(ext, extensions, extInfo) ) {
                        return extData;
                    }
                }
            }

            var dataSend = base.applyData(extensions._default, extInfo);

            return extensions[extensions._default].call(base, dataSend) || extData;
        },
        addFilter: function(name, fn) {

            return $.linkedSelect.extension.filter[name] = fn;
        },
        addMap: function(name, fn) {

            return $.linkedSelect.extension.map[name] = fn;
        },
        add: function(types) {

            var base = this,
                extensions = base.extension,
                extensionType;

            for ( extensionType in types ) {
                if ( hasOwn(extensions, extensionType) && hasOwn(types, extensionType) ) {
                    for ( name in types[extensionType] ) {
                        if ( hasOwn(types[extensionType], name) ) {
                            extensions[extensionType][name] = types[extensionType][name]
                        }
                    }
                }
            }

            return base.extension;
        },
        castData: function(value) {

            if ( typeof value === 'undefined' ) {
                return undefined;
            }

            if ( isString(value) ) {
                if ( value.toLowerCase() === 'true' ) {
                    return true;
                }
                if ( value.toLowerCase() === 'false' ) {
                    return false;
                }
            }

            if ( isFloat(value) ) {
                return parseFloat(value);
            }

            if ( isInteger(value) ) {
                return parseInt(value, 10);
            }

            return value;
        },
        getServiceData: function(serviceUri, data) {

            return this.getExtension('service', {
                name: serviceUri,
                data: data
            });
        },
        getFilter: function(value, filter, extraData) {

            var base = this,
                filterData = base.getExtension('filter', {
                    name: filter
                });

            if ( !!filterData ) {
                filterData.value = base.castData(value);
                filterData.filter = filter;
                filterData.extraData = extraData || null;
                filterData = $.proxy(filterData, extraData.source[0]);
            }

            return filterData;
        },
        getData: function(items, value, valueData, extraData) {

            valueData = valueData || null;

            if ( !valueData ) {
                return items;
            }

            var base = this;

            var results = items,
                filterFn = base.getFilter(value, valueData.filter, extraData),
                mapFn = base.getExtension('map', {
                    name: valueData.map,
                    raw: true
                });

            if ( filterFn ) {
                results = results.filter(filterFn);
            }

            if ( mapFn ) {
                results = results.map(mapFn);
            }

            return results;
        },
        getSelectInfo: function($select) {

            if ( !$select ) {
                return null;
            }

            var info = {
                targetName: $select.attr(this.settings.attrTarget),
                service: $select.attr(this.settings.attrService) ? $select.attr(this.settings.attrService) : false,
                value: $select.val(),
                $target: null
            };

            info.$target = $('select[name=' + info.targetName + ']');

            return info;
        },
        addOption: function(select, text, value, selected) {

            value = value || '';
            selected = selected || false;

            var option = document.createElement('option');
            option.text = text;
            option.value = value;

            if ( !!selected ) {
                option.selected = true;
            }

            select.appendChild(option);

            return option;
        },
        emptySelect: function($select, defaultOption, loop) {

            if ( !$select || !$select.length ) {
                return $select;
            }

            var base = this;

            defaultOption = defaultOption || false;
            loop = loop || false;

            var idx = defaultOption ? 0 : 1;

            if ( $select.find('option').length <= idx ) {
                return $select;
            }

            while ( $select.find('option').length > idx ) {
                $select.find('option').eq(1).off().remove();
            }

            if ( $.isPlainObject(defaultOption) ) {
                this.addOption($select[0], defaultOption.text, defaultOption.value);
            }

            base.settings && $.isFunction(base.settings.onAfterFill) && base.settings.onAfterFill.call(null, $select);

            if ( loop && $select && $select.length ) {
                base.emptySelect(base.getSelectInfo($select).$target, false, loop);
            }

            return $select;
        },
        fillData: function($select, $target, items) {

            var base = this,
                options = base.settings;

            options && $.isFunction(options.onBeforeFill) && options.onBeforeFill.call(null, $select, $target, items);

            base.emptySelect($target, false);

            if ( $select ) {
                items && $.each(items, function() {
                    base.addOption($target[0], this.text, this.value, this.selected);
                });

                options && $.isFunction(options.onAfterFill) && options.onAfterFill.call(null, $target, $select, items);
            }

            base.emptySelect(base.getSelectInfo($target).$target, false, true);
        },
        reset: function(selects) {

            var base = this,
                targets = {},
                targetName,
                isValueOption = function() {
                    return !!this.value && this.value.trim() !== '';
                };

            selects.each(function() {
                targetName = base.getSelectInfo($(this)).targetName;
                targets[targetName] = $('select[name=' + targetName + ']');
            });

            $.each(targets, function(target) {

                var options = $(this).find('option');

                if ( options.length < 2 && !options.filter(isValueOption).length ) {
                    base.emptySelect($(this), false);
                }
            });

            targets = null;
        },

        isExists: isExists,
        isInteger: isInteger,
        isFloat: isFloat,
        isString: isString,

        itemInit: function(select) {

            var base = this,
                options = base.settings;

            var $select = $(select),
                selectInfo = base.getSelectInfo($select),
                filter = $select.attr(options.attrFilter) || false,
                map = $select.attr(options.attrMap) || false,
                value = selectInfo.value;

            var extraData = {
                source: $select,
                target: selectInfo.$target,
                service: selectInfo.service
            };

            var valueData = ( !filter && !map ) ? null : {
                filter: filter || false,
                map: map || false
            };

            // TODO: Use delegation
            $select.on('change', function(e) {

                if ( valueData && $select.data(PLUGIN_NAME + '_filter') ) {
                    var items = base.getData($select.data(PLUGIN_NAME + '_filter'), value, valueData, extraData);
                    base.fillData($select, selectInfo.$target, items);
                } else {
                    base.getServiceData(selectInfo.service, {
                        field: $select.attr('name'),
                        target: selectInfo.targetName,
                        value: value
                    }, options.method).done(function(data) {
                        if ( data.result ) {
                            var items = data.items;
                            if ( valueData ) {
                                $select.data(PLUGIN_NAME + '_filter', items);
                                items = base.getData(items, value, valueData, extraData);
                            }
                            base.fillData($select, selectInfo.$target, items);
                        }
                    });
                }
            }).addClass(PLUGIN_NAME + '-init');
        },

        setOptions: function(options) {

            var base = $.linkedSelect;

            base.settings = $.extend({}, base.options, options);

            return base.settings;
        },
        init: function(opts) {

            var base = $.linkedSelect;

            base.setOptions(opts);

            $('[' + base.settings.attrTarget + ']').linkedSelect();
        }
    };
    $.fn.linkedSelect = function() {

        var base = $.linkedSelect;

        base.reset(this);

        return this.not('.' + PLUGIN_NAME + '-init').each(function() {

            base.itemInit(this);
        });
    };
}));
