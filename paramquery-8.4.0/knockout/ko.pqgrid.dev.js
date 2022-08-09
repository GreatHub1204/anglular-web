/*!
 * ParamQuery grid knockout bindings v4.0.3
 *
 * Copyright (c) 2016-2017 Paramvir Dhindsa (http://paramquery.com)
 * Released under Commercial license
 * http://paramquery.com/pro/license
 *
 */
(function($) {
    "use strict"
    var fn = $.paramquery.pqGrid.prototype;
    fn.totalRows = fn.totalRows || function() {
        var DM = this.options.dataModel,
            data = DM.data,
            dataUf = DM.dataUF || [];
        return data.length + dataUf.length;
    };
    var pko = pq.ko = {
        cBind: function(element, value, context) {
            var self = this,
                options = value(),
                data,
                grid,
                timerKoData = pko.timeFactory.timer(),
                timerExport = pko.timeFactory.timer(),
                CM = options.colModel,
                koM = options.koModel || {},
                bind = pko.readCellTemplates(CM || []) || koM.bind,
                DM = options.dataModel,
                items = DM.data,
                koItem = koM.item,
                koData = typeof items === "function" ? items : null;
            options.refresh = function() {
                bind && self.onRefresh(this);
            };
            self.element = element;
            self.timerItem = pko.timeFactory.timer();
            self.context = context;
            if (koData) {
                data = koData();
                if (!koItem && data[0] && !$.isPlainObject(data[0])) {
                    koItem = data[0].constructor;
                }
                options.dataModel.data = self.importData(data, koItem);
                self.subscribeKoDataChange(koData, koItem, timerKoData);
            }
            self.koItem = koItem;
            grid = pq.grid(element, options);
            self.grid = grid;
            grid.on("sort filter load", self.onSortFilterLoad(self, koData, koItem, timerExport)).on("change", self.onChange(self, koData, koItem, timerExport)).on("refreshRow refreshCell", self.onRefreshRowCell(self, bind));
            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                grid.destroy();
            });
        },
        disposeRow: function(rd) {
            var pq_ko = rd.pq_ko,
                key;
            if (pq_ko) {
                for (key in pq_ko) {
                    pq_ko[key].dispose();
                }
            }
        },
        readCellTemplates: function(CM) {
            var i = 0,
                len = CM.length,
                column, template, present;
            for (; i < len; i++) {
                column = CM[i];
                if (template = column.template) {
                    present = true;
                    column.render = (function(tmpl) {
                        return function(ui) {
                            return tmpl;
                        }
                    })(template);
                }
            }
            return present;
        },
        timeFactory: {
            timer: function() {
                var id;
                return {
                    setTimeout: function(fn) {
                        id && ko.tasks.cancel(id);
                        id = ko.tasks.schedule(fn);
                    }
                };
            }
        }
    }
    pq.ko.cBind.prototype = {
        disposeData: function() {
            var data = this.grid.option('dataModel.data'),
                disposeRow = pko.disposeRow,
                i = 0,
                len = data.length;
            for (; i < len; i++) {
                disposeRow(data[i]);
            }
        },
        exportRow: function(rd, koItem) {
            var item = rd.pq_ko_item,
                pq_ko, obs, key;
            if (item) {
                for (key in item) {
                    item[key](rd[key]);
                }
            } else {
                item = new koItem(rd);
                rd.pq_ko = pq_ko = rd.pq_ko || {};
                for (key in item) {
                    obs = item[key];
                    this.subscribe(obs, rd, key, pq_ko);
                }
            }
            return item;
        },
        exportData: function(koItem) {
            var self = this,
                data = self.grid.options.dataModel.data,
                newData = [],
                item;
            if (koItem) {
                ko.utils.arrayMap(data, function(rd) {
                    item = self.exportRow(rd, koItem);
                    newData.push(item);
                });
                return newData;
            } else {
                return data;
            }
        },
        importArrayChanges: function(changes, koItem) {
            var rd,
                change, status, indx,
                len = changes.length,
                data = this.grid.option('dataModel.data');
            if (len > data.length) {
                return true;
            }
            while (len--) {
                change = changes[len];
                status = change.status;
                indx = change.index;
                if (status == "added") {
                    rd = this.importRow(change.value, koItem);
                    data.splice(indx, 0, rd);
                } else if (status == "deleted") {
                    pko.disposeRow(data[indx]);
                    data.splice(indx, 1);
                }
            }
        },
        importData: function(data, koItem) {
            var newData = [],
                self = this;
            if (koItem) {
                ko.utils.arrayMap(data, function(item) {
                    newData.push(self.importRow(item, koItem));
                });
                return newData;
            } else {
                return data;
            }
        },
        importRow: function(item, koItem) {
            var rd, obs, pq_ko;
            if (koItem) {
                pq_ko = {};
                rd = {
                    pq_ko: pq_ko
                };
                for (var key in item) {
                    obs = item[key];
                    this.subscribe(obs, rd, key, pq_ko);
                    rd[key] = obs();
                }
                rd.pq_ko_item = item;
                return rd;
            } else {
                return item;
            }
        },
        onChange: function(self, koData, koItem, timerEx) {
            return function(evt, ui) {
                if (koData) {
                    var rl = ui.updateList;
                    if (rl.length == 1 && !ui.addList.length && !ui.deleteList.length) {
                        var ro = rl[0],
                            item = ro.rowData.pq_ko_item,
                            newRow = ro.newRow;
                        if (item) {
                            for (var key in newRow) {
                                item[key](newRow[key]);
                            }
                        }
                    } else {
                        self.inChange = true;
                        timerEx.setTimeout(function() {
                            koData(self.exportData(koItem));
                            self.inChange = false;
                        });
                    }
                }
            };
        },
        onRefresh: function(grid) {
            var i = 0,
                ui, rd, $tr,
                $trs = grid.$cont.children().children().children().children(".pq-grid-row:not('.pq-detail-child')"),
                len = $trs.length;
            for (; i < len; i++) {
                $tr = $($trs[i]);
                ui = grid.getRowIndx({
                    $tr: $tr
                });
                rd = grid.getRowData(ui);
                ko.cleanNode($tr[0]);
                this.rowScope($tr, rd, ui.rowIndx);
            }
        },
        onRefreshRowCell: function(self, bind) {
            return function(evt, ui) {
                if (bind) {
                    var $tr = this.getRow(ui);
                    ko.cleanNode($tr[0]);
                    self.rowScope($tr, ui.rowData, ui.rowIndx);
                }
            }
        },
        onSortFilterLoad: function(self, koData, koItem, timerEx) {
            return function(evt) {
                if (koData) {
                    self.inChange = true;
                    timerEx.setTimeout(function() {
                        koData(self.exportData(koItem));
                        self.inChange = false;
                    });
                }
            };
        },
        rowScope: function($tr, rd, ri) {
            var binding = this.context.extend({
                rd: (rd.pq_ko_item || rd),
                ri: ri
            });
            ko.applyBindingsToDescendants(binding, $tr[0]);
        },
        subscribe: function(obs, rd, key, pq_ko) {
            var timerItem = this.timerItem,
                self = this;
            pq_ko[key] = pq_ko[key] || obs.subscribe(function(change) {
                rd[key] = change;
                timerItem.setTimeout(function() {
                    self.grid.refresh({
                        header: false
                    });
                });
            });
        },
        subscribeKoDataChange: function(koData, koItem, timer) {
            var self = this,
                fullImport,
                grid;
            if (!koData) return;
            koData.subscribe(function(changes) {
                if (!self.inChange) {
                    if (!fullImport) {
                        fullImport = !koItem || self.importArrayChanges(changes, koItem);
                        timer.setTimeout(function() {
                            self.grid.refreshView();
                        });
                    }
                }
            }, null, 'arrayChange');
            koData.subscribe(function(arr) {
                if (!self.inChange && fullImport) {
                    if (koData() != arr) {
                        throw ("koData != arr assert failed");
                    }
                    grid = self.grid;
                    timer.setTimeout(function() {
                        koItem && self.disposeData();
                        grid.option('dataModel.data', self.importData(koData(), koItem));
                        grid.refreshView();
                    });
                    fullImport = false;
                }
            });
        }
    }
    ko.bindingHandlers.pqGrid = {
        init: function(element, value, allBindings, vm, context) {
            new pko.cBind(element, value, context);
            return {
                controlsDescendantBindings: true
            };
        }
    };
})(jQuery);