/*
 *
 * jQuery Linked Selects Plugin
 * 2016-03-02
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
        };


    $.linkedSelect = {
        options: {
            attrTarget: 'data-select-target',
            attrService: 'data-select-service',
            attrFilter: 'data-select-service-asfilter',
            method: 'POST',
            onBeforeSend: function(service, data, serviceUri, options, base) {},
            onBeforeFill: function(source, target, options) {},
            onAfterFill: function(target, source, options) {}
        },
        extension: {
            service: {
                _default: 'ajax',
                variable: function(service, data) {

                    // var base = this;

                    if ( !isExists(service) ) {
                        return false;
                    }

                    var p = $.Deferred();

                    p.resolve({
                        result: true,
                        items: isExists.lastValue
                    });

                    return p;
                },
                ajax: function(service, data) {

                    // var base = this;

                    service = service.split('|');

                    var serviceUrl = service[0].trim() || location.href,
                        serviceMethod = service[1] || 'POST';

                    return $.ajax({
                        url: serviceUrl,
                        type: serviceMethod,
                        dataType: 'json',
                        data: data
                    });
                }
            },
            filter: {
                _default: 'all',
                filter1: function(filter) {

                    var self = $.linkedSelect,
                        filterFn = false;

                    if ( /^[0-9a-z_]+$/i.test(filter) ) {
                        filterFn = function(item, index) {
                            return item[filter] === this.value || self.castData(this.value) === self.castData(item[filter]);
                        };
                    }

                    return filterFn;
                },
                expressions: function(filter) {

                    return new Function('item', 'index', 'return ' + filter);
                },
                all: function(filter) {

                    return function() { return true; };
                }
            }
        },
        getExtension: function(extensionType, data) {

            data = data || null;

            var base = this,
                extensions = base.extension[extensionType],
                extData = null,
                ext, fn,
                dataSend;

            for ( ext in extensions ) {
                if ( extensions.hasOwnProperty(ext) && ext !== extensions._default ) {
                    if ( $.isFunction(fn = extensions[ext])
                            && (dataSend = applyData(ext, data))
                            && (extData = fn.apply(base, dataSend || data)) ) {
                        return extData;
                    }
                }
            }

            dataSend = applyData(extensions._default, data);

            return extensions[extensions._default].apply(base, dataSend) || extData;


            function applyData(ext, data) {

                var dataSend = [data[0], $.extend(true, {}, data[1])];

                var fns = base.settings[extensionType] || null;

                fns && $.isFunction(fns.onBeforeSend) && fns.onBeforeSend(ext, dataSend[1], dataSend[0], $.extend(true, {}, base.settings), base);

                return dataSend || data;
            }
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
        getData: function(items, value, filter, extraData) {

            var base = this;

            filter = filter || false;

            if ( !filter ) {
                return items;
            }

            var results = items,
                filterFn = base.getFilter(value, filter, extraData);

            if ( filterFn ) {
                results = results.filter(filterFn);
            }

            return results;
        },
        getFilter: function(value, filter, extraData) {

            var base = this,
                filterData = base.getExtension('filter', [filter]);

            if ( !!filterData ) {
                filterData.value = base.castData(value);
                filterData.filter = filter;
                filterData.extraData = extraData || null;
                filterData = $.proxy(filterData, filterData);
            }

            return filterData;
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
        getServiceData: function(serviceUri, data) {

            return this.getExtension('service', [serviceUri, data]);
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

        init: function(opts) {

            var base = $.linkedSelect;

            base.settings = $.extend({}, base.options, opts);

            $('[' + base.settings.attrTarget + ']').linkedSelect();
        }
    };
    $.fn.linkedSelect = function() {

        var PLUGIN_NAME = 'bbLinkedSelect',
            base = $.linkedSelect,
            options = base.settings;

        base.reset(this);

        return this.not(PLUGIN_NAME + '-init').each(function() {

            $(this).on('change', function(e) {

                var $select = $(this),
                    selectInfo = base.getSelectInfo($select),
                    filter = $select.attr(options.attrFilter) || false,
                    value = selectInfo.value;

                if ( !filter || filter.trim() === '' ) {
                    filter = false;
                }

                var extraData = {
                    source: this,
                    target: selectInfo.$target,
                    service: selectInfo.service
                };

                if ( filter && $select.data(PLUGIN_NAME + '_filter') ) {
                    var items = base.getData($select.data(PLUGIN_NAME + '_filter'), value, filter, extraData);
                    base.fillData($select, selectInfo.$target, items);
                } else {
                    base.getServiceData(selectInfo.service, {
                        field: $select.attr('name'),
                        target: selectInfo.targetName,
                        value: value
                    }, options.method).done(function(data) {
                        if ( data.result ) {
                            var items = data.items;
                            if ( filter ) {
                                $select.data(PLUGIN_NAME + '_filter', items);
                                items = base.getData(items, value, filter, extraData);
                            }
                            base.fillData($select, selectInfo.$target, items);
                        }
                    });
                }
            }).addClass(PLUGIN_NAME + '-init');
        });
    };
}));
