/*!
 * ParamQuery Select v2.0.0
 * 
 * Copyright (c) 2015-2022 Paramvir Dhindsa (http://paramquery.com)
 * Released under Commercial license
 * http://paramquery.com/pro/license
 *
 */
if( typeof require == "function" ){    var jQuery = require("jquery"),        pq = {};    module.exports = pq;}else{    var pq = window.pq || {};}(function($) {    "use strict";    $.support.touch = 'ontouchend' in document;    var fn = {};    fn.options = function() {        var KC = $.ui.keyCode;        return {            radio: false,            singlePlaceholder: 'Select an option',            checkbox: false,            displayText: '{0} of {1} selected',            maxDisplay: 4,            maxHeight: 300,            maxSelect: 0,            multiplePlaceholder: 'Select options',            selectallText: 'Select All',            closeOnWindowScroll: true,            closeOnWindowResize: true,            itemCls: 'pq-select-item ui-corner-all ui-state-default',            bootstrap: {on: false,                btn: 'btn btn-default',                popupCont: 'panel panel-default',                selectCls: 'label label-info',                itemCls: 'label label-default',                closeIcon: 'glyphicon glyphicon-remove',                searchIcon: 'glyphicon glyphicon-search',                hoverCls: ''            },            position: {                my: 'left top',                at: 'left bottom',                collision: 'flipfit'            },            kcOpen: [KC.DOWN, KC.ENTER, KC.UP],            deselect: true,            hoverCls: 'pq-state-hover',            optionsResizable: {                handles: 'e,s'            },            search: true,            searchRule: 'contain',            _selectCls: 'pq-state-select',            selectCls: 'ui-state-highlight',            width: null,            rowHt: 25,            maxSelectReach: null,            maxSelectExceed: null        };    }();    fn.destroy = function() {        this._super();        for (var key in this) {            delete this[key];        }    };    fn._setOption = function(key, value) {        this._super( key, value);        if(key=="disabled"){            if( value ) this.close();            this.$button[value? 'addClass': 'removeClass']('ui-state-disabled');        }        else if(key=="maxHeight"){            this.$popup.css({maxHeight: value, height: ""});            this.setMenuHt();            this.renderView();        }    };    $.widget('paramquery.pqSelect', fn);    pq.select = function( selector , options ){        var $g = $( selector ).pqSelect( options ),            g = $g.data('paramqueryPqSelect') || $g.data('paramquery-pqSelect');        return g;    };    fn = $.paramquery.pqSelect.prototype;    fn._setButtonWidth = function() {        var $select = this.element;        $select.show();        var o = this.options,            width = o.width ? o.width : $select[0].offsetWidth,            width = ((width*1) == width)? (width+"px"): width;        $select.hide();        this.$button[0].style.width = width;    };    fn._create = function() {        if( !this.element.is("select") ){            throw("pqSelect only for select elements");        }        var that = this,            o = this.options,            bootstrap = o.bootstrap,            bts = bootstrap.on,            $select = this.element,            name = $select.attr('name'),            multiple = $select.attr('multiple'),            EN = that.eventNamespace,            $button = $(                ["<div class='pq-select-button pq-no-capture ",                        (bts? bootstrap.btn: "ui-state-default ui-widget ui-corner-all"),"' ",                    " data-name='",name,"' tabindex='0'>",                (multiple ? "" : "<span class='pq-icon "+(bts?'caret':'ui-icon ui-icon-triangle-1-s')  +"'></span>"),                "<div class='pq-select-text'></div>",                "</div>"].join(""));        if(bts){            o.selectCls += ' '+bootstrap.selectCls;            o.itemCls += ' '+bootstrap.itemCls;        }        this.$button = $button;        this.multiple = multiple ? true : false;        this.selector = '.pq-select-option.ui-state-enable:visible';        this._setButtonWidth();        $select.after($button);        $button.attr("name", name);        $button.addClass($select.attr("class"));        $select.addClass("pq-select");        o.data? (this.data = o.data): this._extractData();        that._createPopup();        that._createMenu();        $button.on({            click: function(evt) {                if(o.disabled) return;                var $parent = $(this).parent('.pq-select-item'),                        indx = parseInt($parent.attr("data-id"));                that.select(indx, false);                that.setText();                that.setSelectAllState();                that.focus();                that.triggerChange();                return false;            }        }, '.pq-item-close');        $button.on({            click: function(evt) {                if(o.disabled) return;                that.toggle();                return false;            },            focus: function(evt) {                if(o.disabled) return;                $(this).addClass('ui-state-hover');            },            blur: function(evt) {                $(this).removeClass('ui-state-hover');            },            mousedown: function(evt) {                if(o.disabled) return;                $(this).addClass('ui-state-active');            },            mouseup: function(evt) {                if(o.disabled) return;                $(this).removeClass('ui-state-active');            },            keydown: function(evt) {                if(o.disabled) return;                var keyCode = evt.keyCode,                        kcOpen = o.kcOpen,                        KC = $.ui.keyCode;                if ($.inArray(keyCode, kcOpen) !== -1) {                    that.open();                }                else if (keyCode === KC.ESCAPE) {                    that.close();                }                else if (keyCode === KC.SPACE) {                    that.toggle();                }            }        });        that.setText();        that.setSelectAllState();        $(window)            .on("resize"+EN, that.onWindowResize.bind(that))            .on("scroll"+EN, that.onWindowScroll.bind(that));    };    fn.onWindowResize = function(evt){        var oE = evt.originalEvent;        if( !(oE && oE.type == "mousemove") && this.options.closeOnWindowResize)            this.close();    };    fn.onWindowScroll = function(){        if(this.options.closeOnWindowScroll && !this._preventClose )            this.close();    };    fn.focus = function() {        var that = this, $s = that.$search;        if ( !$.support.touch ) {            if ( $s[0] )                $s.focus();            else                that.$popup                    .focus();            that._highlight();        }    };    fn.getOption = function(indxV){        return $("#" + this.getOptionId(indxV));    };    fn.getOptionId = function(indxV){        return "pq-option-"+this.uuid+"-"+indxV;    };    fn._move = function(next, paging, homeEnd) {        var self = this,            optionIndxV = self.optionIndxV,            indx = optionIndxV == null? -1: optionIndxV,            o = self.options,            $menu = self.$menu,            menu = $menu[0],            menuHt = menu.offsetHeight,            dataV = self.dataV,            dataLen = dataV.length,            rowHt = o.rowHt, newIndx,            i,            rv = function(i) {                return !dataV[i].disabled && !dataV[i].pq_title;            },            rpp = Math.floor( (menuHt - 17) / rowHt );        if( homeEnd )            newIndx = next? dataLen - 1: 0;        else if(paging)            newIndx = next? indx + rpp: indx - rpp;        else if(next)            for(i = indx + 1; i < dataLen; i++ ){                if( rv(i) ){                    newIndx = i;                    break;                }            }        else            for( i = indx - 1; i >= 0; i-- ){                if( rv(i) ){                    newIndx = i;                    break;                }            }        if(newIndx < 0) newIndx = 0;        if( newIndx >= dataLen ) newIndx = dataLen -1;        self.focusOption(newIndx);    };    fn.focusOption = function(indexV) {        var self = this,            o = self.options,            rowHt = o.rowHt,            top = indexV * rowHt,            bottom = top + rowHt,            $menu = self.$menu, menu = $menu[0],            topMenu = menu.scrollTop,            scrollTop, $next,            menuHt = menu.offsetHeight,            bottomMenu = topMenu + menuHt,            fn = function(){                    self._highlight(indexV);            };        if(top < topMenu)            scrollTop = top;        else if (bottom > bottomMenu)            scrollTop = bottom - menuHt;        if(scrollTop != null){            $menu.one("scroll", function(){                fn();            })            menu.scrollTop = scrollTop;        }        else{            fn();        }    }    fn._onkeydown = function(evt) {        var keyCode = evt.keyCode,            self = this,            ret,            optionIndxV = self.optionIndxV,            KC = $.ui.keyCode;        if (keyCode === KC.DOWN || keyCode === KC.UP) {            self._move(keyCode === KC.DOWN);            ret = false;        }        else if (keyCode === KC.PAGE_DOWN || keyCode === KC.PAGE_UP) {            self._move(keyCode == KC.PAGE_DOWN, true );            ret = false;        }        else if(keyCode == KC.HOME || keyCode == KC.END){            self._move(keyCode == KC.END, false, true );            ret = false;        }        else if (keyCode === KC.TAB) {            self.close();            ret = false;        }        else if (keyCode === KC.ESCAPE) {            self.close();        }        else if (keyCode === KC.ENTER) {            if ( optionIndxV != null ) {                self.getOption( optionIndxV ).trigger('label_changed');                ret = false;            }        }        return ret;    };    fn.search = function(val) {        var data = this.data,                searchRule = this.options.searchRule,                contain = searchRule === 'contain';        for (var i = 0, len = data.length; i < len; i++) {            var rowData = data[i],                    text = (rowData.text+"").toUpperCase(),                    indx = text.indexOf(val);            rowData.searchIndx = null;            if (indx === -1) {                rowData.hidden = true;            }            else if (contain === false && indx > 0) {                rowData.hidden = true;            }            else {                rowData.hidden = false;                rowData.searchIndx = indx;            }        }    };    fn._onkeyupsearch = function(evt) {        var $input = $(evt.target),            self = this,            val = $.trim($input.val()).toUpperCase();        if((val || self.searchText) && val != self.searchText){            self.searchText = val;            self.search(val);            self._createMenu();            self.renderView();            self.positionPopup();            self.setSelectAllState();        }    };    fn.onChange = function(indxV) {        var that = this,            rd = that.dataV[ indxV ],            indx = rd.pq_indx,            checked = !rd.selected,            o = that.options,            multiple = that.multiple,            maxSelect = o.maxSelect,            selIndx = that.selectIndx;        if (multiple) {            if (checked) {                if (maxSelect && selIndx.length >= maxSelect) {                    that._trigger('maxSelectExceed', null, {                        option: that.$options[indx]                    });                    that.focus();                    return false;                }            }        }        else if (selIndx.length) {            var prevIndx = selIndx[0];            if (indx === prevIndx) {                return false;            }            if (checked) {                that.select(prevIndx, false);            }        }        that.select(indx, checked);        that.setText();        that.setSelectAllState();        if (multiple) {            if (maxSelect && selIndx.length >= maxSelect) {                if (that._trigger('maxSelectReach', null, {                    option: that.$options[indx]                }) !== false) {                    that.close();                }            }            else {                that.focus();            }        }        else {            that.close();        }        that.triggerChange();    };    fn.setSelectAllState = function() {        var $chk = this.$popup.find(".pq-select-all input"),            chk = $chk[ 0 ];        if ( chk ) {            var                data = this.dataV,                enabled = 0,                selected = 0,                allSelected,                rowData,                i = 0, len = data.length;            for (; i < len; i++) {                rowData = data[i];                if ( !rowData.disabled && !rowData.pq_title ) {                    enabled++;                    if ( rowData.selected )                        selected++;                }            }            allSelected = (enabled === selected );            $chk.prop('checked', allSelected);            chk.indeterminate = allSelected? false: (selected > 0);        }    };    fn.getInstance = function() {        return {select: this};    };    fn.select = function(indx, add) {        var that = this,                selIndx = that.selectIndx,                o = that.options,                rowData = that.data[indx],                $options = that.$options,                $option = $options? $($options[indx]): $() ,                $label = that.getOption( rowData.pq_indxV ),                indx2,                $input = $label.find("input");        $label[add ? 'addClass' : 'removeClass'](o._selectCls + ' ' +o.selectCls);        $input.prop('checked', add);        rowData.selected = add;        if (that.multiple) {            indx2 = selIndx.indexOf(indx);            if (add) {                if(indx2 == -1)                    selIndx.push(indx);            }            else {                if(indx2 > -1)                    selIndx.splice(indx2, 1);            }            $option.prop('selected', add);        }        else {            if (add) {                if(selIndx.length){                    this.data[selIndx[0]].selected=false;                }                selIndx[0] = indx;                $option.prop('selected', add);            }            else {                that.selectIndx = [0];                this.data[0].selected = true;                ( $options? $( $options[0]): $()).prop('selected', true);            }        }    };    fn.triggerChange = function() {        this._trigger('change');        this.element.trigger('change');    };    fn._extractData = function() {        var data = this.data = [],                $select = this.element,                $options = $select.find('option,optgroup'),                grouping = false,                disabled_group = false,                text,                optgroup;        this.$options = $select.find('option');        for (var i = 0, len = $options.length; i < len; i++) {            var option = $options[i],                    $option = $(option);            if (option.nodeName.toLowerCase() == 'optgroup') {                optgroup = $option.attr('label');                grouping = true;                disabled_group = $option.prop('disabled');            }            else{                var selected = $option.prop('selected'),                    disabled = $option.prop('disabled');                if(!disabled && grouping){                    disabled = disabled_group;                }                text = $option.text();                data.push({selected: selected, disabled: disabled, text: text, optgroup: optgroup });            }        }        this.grouping = grouping;    };    fn.exportData = function(){        return JSON.stringify(this.data, null, 2);    };    fn.refresh = function() {        this.search("");        this._setButtonWidth();        this._createPopup();        this._createMenu();        this.setText();        this.setSelectAllState();    };    fn.refreshData = function() {        this._extractData();        this.refresh();    };    fn._createPopup = function() {        var that = this,                o = this.options,                bootstrap = o.bootstrap,                bts = bootstrap.on,                multiple = that.multiple,                searchHTML = "",                headerHTML = "";        if (multiple && o.selectallText && !o.maxSelect) {            headerHTML = ["<label class='pq-select-all ui-widget-header ui-corner-all'>",                "<span class='ui-icon ui-icon-close ", (bts? bootstrap.closeIcon: '') ,"'></span>",                "<input type='checkbox' >",                o.selectallText,                "</label>"].join('');        }        if (o.search) {            searchHTML = ["<div class='pq-select-search-div ui-corner-all'>",                "<span class='ui-icon ui-icon-search ", (bts? bootstrap.searchIcon: '') ,"' />",                "<div class='pq-select-search-div1'>",                "<input type='text' class='pq-select-search-input' autocomplete='off' />",                "</div>",                "</div>"].join("");        }        var $popupCont = $(["<div class='pq-select-popup-cont ",(bts? bootstrap.popupCont: '') ,"'>",            "<div class='pq-select-popup ui-widget-content ui-corner-all' tabindex='-1'>",            headerHTML,            searchHTML,            "<div class='pq-select-menu'><div style='margin:0;padding:0;' ></div></div>",            "</div><div class='pq-select-shadow-fix'></div></div>"].join('')),            $popup = $popupCont.children(".pq-select-popup");        that.$menu = $popup.find('.pq-select-menu')            .on("scroll", that.onScroll.bind(that))            .on("mousemove", that.onMouseMove.bind(that));        $popupCont.css({"font-family": this.$button.css("font-family"),            "font-size": this.$button.css("font-size")});        $popup.css("maxHeight", o.maxHeight)            .on({                keydown: function(evt) {                    return that._onkeydown(evt);                }            })            .on({                mouseenter: function(evt) {                    that._highlight( that.getIndxV( this.id ));                },                label_changed: function(evt) {                    var                        id = this.id;                    if (id) {                        return that.onChange(that.getIndxV( id ));                    }                }            }, '.pq-select-option.ui-state-enable');        $popup.find('.ui-icon-close').on({            click: function(evt) {                that.close();                return false;            }        });        if((multiple && o.checkbox) || (!multiple && o.radio)){            $popup.on({                click: function(){                    $(this).closest('label').trigger('label_changed');                }            },'label.pq-select-option.ui-state-enable input');        }        else{            $popup.on({                click: function() {                    $(this).trigger('label_changed');                }            }, 'label.pq-select-option.ui-state-enable');        }        if (that.$popupCont) {            that.$popupCont.remove();        }        that.$popupCont = $popupCont;        $popup.resizable($.extend(true, {            stop: that.onResized.bind(that)        }, o.optionsResizable ));        that.$popup = $popup;        that.$search = $popup.find(".pq-select-search-input").on({            keyup: function(evt) {                return that._onkeyupsearch(evt);            }        });        that.$selectAll = $popup.find('.pq-select-all').on({            change: that.onSelectAll.bind(that)        }, 'input');        $(document.body).append($popupCont);    };    fn.onSelectAll = function(evt) {        var $input = $(evt.target),            that = this,            checked = $input.prop('checked') ? true : false,            data = that.dataV, rowData, i = 0,            $options = that.$options;        for (; i < data.length; i++) {            rowData = data[i];            if (!rowData.disabled && rowData.selected !== checked) {                rowData.selected = checked;                $($options[rowData.pq_indx]).prop('selected', checked);            }        }        that._createMenu();        that.renderView();        that.setText();        that.focus();        that.triggerChange();    }    fn.onResized = function(evt, ui) {        this.width = ui.size.width;        this.option("maxHeight", ui.size.height);    }    fn.getIndxV = function(id){        return id.split("-")[3] * 1;    }    fn.getIndx = function(id){        return this.dataV[ this.getIndxV(id) ].pq_indx;    }    fn._createMenu = function() {        var that = this,            data = that.data,            rowHt = that.options.rowHt,            selectIndx = that.selectIndx = [],            dataV = that.dataV = [],            indxV = 0,            optgroup, poptgroup,            $cont = that.$menu.children();        data.forEach(function(rd, indx){            rd.pq_indx = indx;            optgroup = rd.optgroup;            if(!(indx == 0 && rd.text == "")){                if ( rd.selected ) {                    selectIndx.push(indx);                }                if (poptgroup !== optgroup && !rd.hidden) {                    dataV[ indxV++ ] = {                        pq_title: true,                        text: optgroup                    }                    poptgroup = optgroup;                }                if ( !rd.hidden ){                    rd.pq_indxV = indxV;                    dataV[ indxV++ ] = rd;                }            }        })        that._initV = that._finalV = null;        $cont.html("");        $cont.height(dataV.length * rowHt);        that.setMenuHt();    };    fn.onMouseMove = function() {        this.preventClose();    };    fn.preventClose = function () {        var self = this;        self._preventClose = true;        clearTimeout(self.mmtimerID);        self.mmtimerID = setTimeout(function() {            self._preventClose = false;        },2000);    }    fn.getViewPortIndx = function(){        var menu = this.$menu[0],            rowHt = this.options.rowHt,            scrollTop = menu.scrollTop, initV = Math.floor( scrollTop/rowHt),            finalV = Math.floor( (scrollTop + menu.offsetHeight)/rowHt);        return [initV, finalV];    }    fn.renderView = function(){        var that = this,            uuid = that.uuid,            arr = that.getViewPortIndx(),            initV = arr[0], finalV = arr[1],            _initV = that._initV, _finalV = that._finalV,            _initVDefined = (_initV != null),            o = that.options,            searchLen = o.search ? (that.searchText || "").length : 0,            selectCls = ' ' + o._selectCls + ' '+ o.selectCls + ' ',            multiple = that.multiple,            type = multiple ? (o.checkbox ? 'type="checkbox"' : "") : (o.radio ? 'type="radio"' : ""),            li = [],            textCls = type ? "pq-left-input" : (that.grouping ? "pq-left-group" : ""),            disabled, disabledCls,            searchIndx,            rowHt = o.rowHt,            style = function(i) {                return "style='position:absolute;top:"+ (i * rowHt) +"px;width:100%;left:0;height:" +  rowHt                    + "px;overflow:hidden;'";            },            i,            rowData, $cont,            data = that.dataV;        if(_initVDefined)            for ( i = _initV; i <= _finalV; i++) {                if( i < initV || i > finalV ){                    that.getOption( i ).remove();                }            }        for ( i = initV; i <= finalV; i++) {            rowData = data[i];            if(rowData){                var disabled = rowData.disabled,                    selected = rowData.selected,                    text = rowData.text;                if (_initVDefined && i >= _initV && i<=_finalV) {                    continue;                }                if (rowData.pq_title) {                    li.push(                        "<label ", style(i) ," class='pq-select-optgroup'",                        " id='", that.getOptionId(i) , "'>",                        "<span>", text, "</span>",                        "</label>"                    );                }                else{                    var checkedAttr = selected ? ' checked="checked" ' : "",                        checkedCls = selected ? selectCls : "",                        disabledAttr = disabled ? ' disabled="disabled" ' : "",                        disabledCls = disabled ? "ui-state-disabled" : "ui-state-enable";                    if (searchLen) {                        searchIndx = rowData.searchIndx;                        text = text.substr(0, searchIndx) +                            "<span class='pq-select-search-highlight'>" +                            text.substr(searchIndx, searchLen) + "</span>" +                            text.substr(searchIndx + searchLen, text.length);                    }                    li.push(                        "<label ", style(i) ," class='pq-select-option ", checkedCls, disabledCls, "'",                        " id='", that.getOptionId(i) , "'>",                        type ? ("<input name='pq-select-input-" + uuid + "' " + type + " " + checkedAttr + disabledAttr + " >") : "",                        "<span class='", textCls, "'>", text, "</span>",                        "</label>"                    );                }            }        }        that._initV = initV;        that._finalV = finalV;        $cont = that.$menu.children();        $cont.append(li.join(""));    }    fn.onScroll = function(){        this.renderView();        this.preventClose();    };    fn._highlight = function(indexV) {        var self = this,            hoverCls = self.options.hoverCls,            initV = self._initV, finalV = self._finalV,            bw = function(indx) {                return indx != null && indx >= initV && indx <= finalV;            },            optionIndxV = self.optionIndxV,            indexV = bw(indexV)? indexV: (bw(optionIndxV)? optionIndxV: null),            $label = (indexV != null)? self.getOption(indexV): self.$menu.find(".pq-select-option.ui-state-enable:visible:first"),            label = $label[0];        if ( label ) {            indexV = self.getIndxV(label.id);            if (optionIndxV != null) {                self.getOption( optionIndxV ).removeClass(hoverCls);            }            $label.addClass(hoverCls);            self.optionIndxV = indexV;            self._trigger('focused', {label: label, rowIndx: indexV});        }    };    fn._setPopupWidth = function() {        this.$popupCont.width(this.width || this.$button[0].offsetWidth);    };    fn.positionPopup = function() {        var o = this.options,            $button = this.$button,            position = $.extend({ of: $button }, o.position),            $popupCont = this.$popupCont;        this._setPopupWidth();        $popupCont.position(position);    };    fn.isOpen = function() {        if (this.$popupCont && this.$popupCont.css("display")=="block") {            return true;        }        return false;    };    fn.setMenuHt = function() {        var that = this,            o = that.options,            rowHt = o.rowHt,            htTop = that.$popup.find(".pq-select-search-div").outerHeight(true) + that.$selectAll.outerHeight(true),            noRows = that.dataV.length,            menuHt = noRows * rowHt,            totalHt = Math.min( menuHt + htTop, o.maxHeight),            htFinal = totalHt - htTop;        that.$menu.css('height', htFinal +'px');    }    fn.open = function() {        var that = this,            $popupCont = that.$popupCont;        if (that.isOpen()) {            return false;        }        $popupCont.show();        that.positionPopup();        that.setMenuHt();        that.renderView();        $(document).on('mousedown' + that.eventNamespace, function(evt) {            var $target = $(evt.target);            if (!$target.closest(that.$popupCont)[0] && !$target.closest(that.$button)[0] ) {                that.close();            }        });        that.focus();    };    fn.setText = function() {        var that = this,            $button = that.$button,            $selectText = $button.find('.pq-select-text'),            $select = that.element,            o = that.options,            deselect = o.deselect,            data = that.data,            clsItem = o.itemCls,            bootstrap = o.bootstrap,            closeIcon = (bootstrap.on? bootstrap.closeIcon:'ui-icon ui-icon-close'),            tmpl = function(indx) {                if (deselect) {                    return ["<span class='", clsItem, "' data-id = '", indx, "'>",                        "<span class='pq-item-close ",closeIcon,"'></span>",                        "<span class='pq-select-item-text'>", data[indx].text, "</span>",                        "</span>"].join("");                }                else {                    return data[indx].text;                }            },            selectIndx = that.selectIndx,            text;        if (that.multiple) {            $button.addClass('pq-select-multiple');            var selLen = selectIndx.length,                    maxDisplay = o.maxDisplay,                    total = data.length;            if (selLen > 0) {                if (selLen <= maxDisplay) {                    var arr = [];                    for (var i = 0; i < selLen; i++) {                        var indx = selectIndx[i];                        arr.push(tmpl(indx));                    }                    if (deselect) {                        text = arr.join("");                    }                    else {                        text = arr.join(", ");                    }                }                else {                    text = o.displayText;                    text = text.replace("{0}", selectIndx.length);                    text = text.replace("{1}", total);                }            }            else {                text = $select.attr('data-placeholder');                if (!text) {                    text = o.multiplePlaceholder;                }            }        }        else {            $button.addClass('pq-select-single');            $selectText.css("maxWidth", $button.width() - 16);            var indx = selectIndx[0],                text = ( indx != null? data[indx].text: "");            if (text != null && text !== "") {                text = tmpl(indx);            }            else {                text = $select.attr('data-placeholder');                if (!text) {                    text = o.singlePlaceholder;                }            }        }        $selectText.html(text);        if (!that.multiple) {            $selectText.find(".pq-select-item-text")                    .css({"maxWidth": $button.width() - 35});        }        setTimeout(function(){            if(that.uuid)                that.positionPopup();        })    };    fn.close = function(obj) {        if (this.isOpen()) {            obj = obj || {};            if (obj.focus !== false) {                this.$button.focus();            }            this.$popupCont.hide();        }        $(document).off(this.eventNamespace);    };    fn.toggle = function() {        if (this.isOpen()) {            this.close();        }        else {            this.open();        }    };    fn.disable = function() {        this.option({disabled: true});    };    fn.enable = function() {        this.option({disabled: false});    };    fn._destroy = function() {        this.$popupCont.remove();        this.$button.remove();        this.element.removeClass("pq-select").show();        var EN = this.eventNamespace;        $(document).off(EN);        $(window).off(EN);    };})(jQuery);