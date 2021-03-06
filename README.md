# jQuery Linked Selects Plugin
Chained Select (Dropdown)

*updated 2016-12-24*

## init
```js

    var options = {
        attrTarget: 'data-select-target',
        attrService: 'data-select-service',
        attrFilter: 'data-select-service-asfilter',
        method: 'POST',
        onBeforeFill: function($source, $target, data) {
            $source;    // Source select element (jQuery Object)
            $target;    // $Target select element (jQuery Object)
            data;       // Filtered Service Data
        },
        onAfterFill: function(target, source, data) {
            $target;    // $Target select element (jQuery Object)
            $source;    // $Source select element (jQuery Object)
            data;       // Filtered Service Data
        },
        service: {
            onBeforeSend: function(service, data, serviceUri, options, base) {
                service;        // Service Name (Ex. 'ajax')
                data;           // data to be sent
                serviceUri;     // Service Url
                options;        // Plugin options (Read Only)
                base;           // Plugin Object
            }
        }
    };

    $.linkedSelect.init(options);
```

## Samples

### Sample 1
```html
<select class="form-control" name="select-1"
        data-select-target="select-2"
        data-select-service="data/linked-select-filter.json|GET"
        data-select-service-asfilter="item.minVersion < this.value">
    <option value="">Please select</option>
    <option value="1.1">Please select 1.1</option>
    <option value="1.2">Please select 1.2</option>
    <option value="1.3">Please select 1.3</option>
</select>
```

```javascript
$.linkedSelect.init({
    service: {
        onBeforeSend: function(service, data, serviceUri, options, base) {
            if ( service === 'ajax' ) {
                data.requestTime = Date.now();
            }
        }
    }
});
```

### Sample 2
```html
<select class="form-control" name="select-4"
        data-select-target="select-5"
        data-select-service="data/linked-select-filter.json|GET"
        data-select-service-asfilter="category">
    <option value="">Please select</option>
    <option value="1.1">Please select 1.1</option>
    <option value="1.2">Please select 1.2</option>
    <option value="1.3">Please select 1.3</option>
</select>
```

### Sample 3
```html
<select class="form-control" name="select-10"
        data-select-target="select-11"
        data-select-service="datas.level1">
    <option value="">Please select</option>
    <option value="1.1">Please select 1.1</option>
    <option value="1.2">Please select 1.2</option>
    <option value="1.3">Please select 1.3</option>
</select>
```

### Sample 4 (Mapping)

with named filter *(@test)* & map *(@test)*

```html
<select class="form-control" name="select-14"
        data-select-target="select-15"
        data-select-service="data/linked-select-map.json|GET"
        data-select-service-asfilter="@test"
        data-select-map="@test">
    <option value="">Please select</option>
    <option value="1.1">Please select 1.1</option>
    <option value="1.2">Please select 1.2</option>
    <option value="1.3">Please select 1.3</option>
</select>
```

```javascript
$.linkedSelect.add({
    filter: {
        'test': function(filter) {
            return function filterTest(value, index, sourceData) {

                var isValid = (value.id.split('.')[1] | 0) % 2;

                return isValid;
            };
        }
    },
    map: {
        'test': function mapTest(value) {
            return {
                text: value.title,
                value: value.id
            };
        }
    }
});
```

---
*Copyright 2016 Bogac Bokeer &middot; Licensed under the MIT license*
