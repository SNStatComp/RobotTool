/*jslint browser: true*/
/* global $, define, require*/
/*
 * Copyright 2013 Statistics Netherlands
 *
 * Licensed under the EUPL, Version 1.1 or – as soon they
 * will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * http://ec.europa.eu/idabc/eupl
 *
 * Unless required by applicable law or agreed to in
 * writing, software distributed under the Licence is
 * distributed on an "AS IS" basis,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied.
 * See the Licence for the specific language governing
 * permissions and limitations under the Licence.
 */

define([
  "app/chart",
  "app/utils",
  "i18next"
], function(Chart, utils, i18next) {

  var contextOriginal,
    contextTmin1,
    lastsel,
    showDiffContext = true;

  function localsetSidebar() {
      require("app/init").setSidebar();
    };

    /**
     * Detect differences between two strings and mark these differences
     * @param  {String} v1
     * @param  {String} v2
     * @return {String}    v1 with marked differences between v1 and v2
     */
  function computeDiff(v1, v2) {
    var str1 = v1.split("<hr>"),
      str2 = v2.split("<hr>"),
      str3,
      res = [],
      maxLength = Math.max(str1.length, str2.length);
    str1.length = maxLength;
    str2.length = maxLength;
    for (var i = 0; i < str1.length; i++) {
      if (str1[i] == undefined) {
        str1[i] = '';
      }
      if (str2[i] == undefined) {
        str2[i] = '';
      }

      str3 = diffString(str1[i], str2[i]);
      str3 = str3.replace(/<\/del><del>/g, '');
      str3 = str3.replace(/<\/ins><ins>/g, '');
      res.push(str3);
    }
    return (res.join('<hr>'));
  }

  /**
   * Update the Source grid and Sidebar
   * @param  {String} message Message shown to the user
   * @return {void}
   */
  function updateSource(message) {
    var dialogProgress = $('#dialogProgress');
    dialogProgress.children('#processBar').progressbar("destroy");
    dialogProgress.children('#stepBar').progressbar("destroy");
    dialogProgress.dialog("close");
    setTimeout(function() {alert(message)}, 100);
    $("#Source").trigger("reloadGrid");
    localsetSidebar();
  }

  /**
   * Format the last (most recent) observation
   * Formatting is based on name of the cell (Date, Value, Quantity, Comment or Context)
   * @param       {String} cellvalue value of the cell being formatted
   * @param       {[type]} options   see documentation of jqGrid
   * @param       {[type]} rowObject see documentation of jqGrid
   */
  function LobservationFormat(cellvalue, options, rowObject) {
    var
      varname = options.rowId,
      res, num, fnum, r, contextDiff;

    switch (varname) {
      case i18next.t('Observation.Date'):
        $('#Observation').jqGrid('setLabel', options.colModel.name, cellvalue, {'text-align': 'left'});
        $('input#' + options.colModel.name).button('option', 'label', cellvalue);
        return (cellvalue);

      case i18next.t('Observation.Context'):
        if (!cellvalue || cellvalue == null) {
          cellvalue = '';
        }
        price = $('<div>' + cellvalue + '</div>').find('#price').text().trim()
        price = price.replace('.', ',')
        $('#Observation_Lobservation').attr('price', price)
        cellvalue = cellvalue.replace(/<div[^>]+>|<\/div>/gmi,'')

        if ($('#Observation').attr('currency') == 'NL (EUR)'
        && !cellvalue.includes('http')){
          cellvalue = cellvalue.split('.').join(',')
        }

        if (showDiffContext) {
          contextDiff = utils.highlightPrice(computeDiff(contextTmin1.replace(/<div[^>]+>|<\/div>/gmi,''), cellvalue), $('#Observation').attr('currency'));
          res = '<div style="white-space: pre-wrap">' + contextDiff + '</div>';
        } else {
          res = '<div style="color:red; white-space: pre-wrap;">' + utils.highlightPrice(computeDiff(cellvalue, cellvalue), $('#Observation').attr('currency')) + '</div>';
        }
        return (res);

      case i18next.t('Observation.Value'):
        if (isNaN(cellvalue)) {
          num = '';
        } else {
          num = Number(cellvalue);
        }
        if (num === -1) {
          r = '<span id="noValue">' + num + '</span>';
        } else {
          fnum = utils.formatCurrency(num, $('#Observation').attr('currency'));
          r = '<span>' + fnum + '</span>';
        }
        return (r);

      case i18next.t('Observation.Quantity'):
        if (isNaN(cellvalue)) {
          num = '';
        } else {
          num = Number(cellvalue);
        };
        if (num === -1) {
          r = '<span id="noValue">' + num + '</span>';
        } else {
          r = num;
        }
        return (r);

      case i18next.t('Observation.Comment'):
        if (cellvalue) {
          return (cellvalue);
        } else {
          return ('');
        }
    }
  }

  /**
   * Format the previous observation(s)
   * Formatting is based on name of the cell (Date, Value, Quantity, Comment or Context)
   * @param       {String} cellvalue value of the cell being formatted
   * @param       {[type]} options   see documentation of jqGrid
   * @param       {[type]} rowObject see documentation of jqGrid
   */
  function VobservationFormat(cellvalue, options, rowObject) {
    var
      varname = options.rowId,
      num, fnum, r;

    switch (varname) {
      case i18next.t('Observation.Date'):
        $('#Observation').jqGrid('setLabel', options.colModel.name, cellvalue, {'text-align': 'left'});
        $('input#' + options.colModel.name).button('option', 'label', cellvalue);
        return (cellvalue);

      case i18next.t('Observation.Context'):
        if (!cellvalue || cellvalue == null) {
          cellvalue = '';
        }
        else {
            cellvalue = cellvalue.replace(/<div[^>]+>|<\/div>/gmi,'')
           if (!cellvalue.includes('http')){
               cellvalue = cellvalue.split('.').join(',')
             }
           }
        return ('<div style="white-space: pre-wrap">' + utils.highlightPrice(computeDiff(cellvalue, cellvalue), $('#Observation').attr('currency')) + '</div>');

      case i18next.t('Observation.Value'):
        if (cellvalue == 'No data') {
          num = '';
        } else {
          num = Number(cellvalue);
        }
        if (num === -1) {
          r = '<span id="noValue">' + num + '</span>';
        } else {
          fnum = utils.formatCurrency(num, $('#Observation').attr('currency'));
          r = '<span>' + fnum + '</span>';
        }
        return (r);

      case i18next.t('Observation.Quantity'):
        if (cellvalue == 'No data') {
          num = '';
        } else {
          if (isNaN(cellvalue)) {
            num = utils.formatCurrency(cellvalue, $('#Observation').attr('currency'));
//            num = Globalize.parseFloat(cellvalue);
          } else {
            num = Number(cellvalue);
          }
        }
        if (num === -1) {
          r = '<span id="noValue">' + num + '</span>';
        } else {
          r = num;
        }
        return (r);

      case i18next.t('Observation.Comment'):
        if (cellvalue) {
          return (cellvalue);
        } else {
          return ('');
        }
    }
  }

  /**
   * Unformat the cellvalue
   * @param  {String} cellvalue see documentation of jqGrid
   * @param  {Object} options   see documentation of jqGrid
   * @param  {Object} cell      see documentation of jqGrid
   * @return {String}           the unformatted value
   */
  function observationUnFormat(cellvalue, options, cell) {
    if (options.rowId === i18next.t('Observation.Value')) {
      return ($('span', cell).text());
    } else {
      return (cellvalue);
    }
  }

  /**
   * Format the cell with the 'copyValue' button
   * @param  {String} cellvalue see documentation of jqGrid
   * @param  {Object} options   see documentation of jqGrid
   * @param  {Object} rowObject see documentation of jqGrid
   * @return {String}           the formatted cellvalue
   */
  function copyValueFormat(cellvalue, options, rowObject) {
    if (options.rowId === i18next.t('Observation.Value')) {
      if (Number(rowObject.Lobservation) === -1) {
        return ('<button style="width:100%" id="copyValue">' + i18next.t('Observation.CopyValue') + '</button>');
      } else {
        return ('<button style="width:100%" id="copyValue" disabled="disabled">' + i18next.t('Observation.CopyValue') + '</button>');
      }
    } else {
      return ('');
    }
  }

  /**
   * Fill Observation grid with data from the source selected in de Source grid
   * @param  {String} ids Id of the selected row in the Source grid
   * @return {void}
   */
  function fillGridObservation(ids) {
    var
      sourceName = $('#Source').jqGrid('getCell', ids, 'name'),
      currency = $('#Source').jqGrid('getCell', ids, 'currency'),
      sourceId = $('#Source').jqGrid('getCell', ids, 'source'),
      sourceComment = $('#Source').jqGrid('getCell', ids, 'comment'),
      titel = i18next.t('Observation.Title') + ' ' + sourceId + ' - ' + sourceName  + '  -  ' + sourceComment;
      if (!sourceComment) {
         titel = i18next.t('Observation.Title') + ' ' + sourceId + ' - ' + sourceName
         if (!sourceName) {
            titel = i18next.t('Observation.Title') + ' ' + sourceId
         }
      }

    $("#Observation").attr('currency', currency);
    $("#Observation").jqGrid('setLabel', 'variable', i18next.t('Observation.Date'), {'text-align': 'left'});
    $("#t_Observation div#titel").html('<strong>' + titel + '</strong>');
    $("button#showChart").attr('sourceid', ids);
    $("#Observation").jqGrid('setGridParam', {
      postData: {
        id: ids,
        lblDate: i18next.t('Observation.Date'),
        lblValue: i18next.t('Observation.Value'),
        lblQuantity: i18next.t('Observation.Quantity'),
        lblComment: i18next.t('Observation.Comment'),
        lblContext: i18next.t('Observation.Context')
      },
      page: 1
    }).trigger('reloadGrid');
    $('tr#Quantity').hide();
  }

  /**
   * Create the toolbar of the Observation grid
   */
  function setToolbarObservation() {
      $("#t_Observation")
        .append("<div id='titel' style='float:left; margin-top: 7px; margin-left: 2px; '></div> " +
          "<div style='float:right;margin-right: 1px; margin-top: 1px; '>" +
            "<div id='format'>" +
              "<button id='showChart' sourceid='' style='height: 24px;margin-right: 5px;'></button>" +
              "<input type='checkbox' class='checkDate' id='Lobservation' value='Lobservation' checked='checked'/><label for='Lobservation'>T</label>" +
              "<input type='checkbox' class='checkDate' id='Tmin1' value='Tmin1' checked='checked'/><label for='Tmin1'>Tmin1</label>" +
              "<input type='checkbox' class='checkDate' id='Tmin2' value='Tmin2'/><label for='Tmin2'>Tmin2</label>" +
              "<input type='checkbox' class='checkDate' id='Tmin3' value='Tmin3'/><label for='Tmin3'>Tmin3</label>" +
              "<input type='checkbox' class='checkDate' id='Tmin4' value='Tmin4'/><label for='Tmin4'>Tmin4</label>" +
            "</div>" +
          "</div>" )
        .height('auto');

    $('input.checkDate')
      .checkboxradio({icon: false})
      .click(
        function(e) {
          if ($(this).is(':checked')) {
            $('#Observation').jqGrid('showCol', $(this).val()).jqGrid('setGridWidth', 930);
          } else {
            $('#Observation').jqGrid('hideCol', $(this).val()).jqGrid('setGridWidth', 930);
          }
        });

    $('button#showChart')
      .button({
        icons: {
          primary: 'ui-icon-image'
        },
        text: false
      })
      .click(function(e) {
        e.preventDefault();
        $('.chart').html('');
        Chart.createBarChart($(this)
          .attr('sourceid'), $('h3#Sources')
          .attr('productgroup_id'));
        $('.chart').dialog({width: 972, height: 560, modal: true}).dialog("moveToTop");

    });

    $("#check").button();
    $("#format").buttonset();
  }

  /**
   * Get current productgroup and open dialog for exporting most recent observations
   * @return {void}
   */
  function exportObservations() {
    var currentPG = $(this).attr("productgroup_id");

    $.getJSON('/data', {
      action: 'getProductgroup',
      element: "sidebar"
    }, function(data) {
      var params = {
        id: currentPG,
        dialogTitle: i18next.t('Observation.ExportObservations'),
        buttonTitle: i18next.t('Main.Export'),
        query: {
          action: 'exportObservations',
          productgroups: '',
          exportFolder: utils.getConfig().ExportFolder
        }
      };
      processObservationsDialog(data, params);
    });
  }

  /**
  * Get all productgroups and open dialog to scrape new prices (and contexts) from the internet
   * @return {void}
   */
  function getAllObservations() {
    $.getJSON('/data', {
      action: 'getProductgroup',
      element: "sidebar"
    }, function(data) {
      var params = {
        dialogTitle: i18next.t('Observation.GetObservations'),
        buttonTitle: i18next.t('Main.OK'),
        query: {
          action: 'setObservation',
          oper: 'insert',
          user_id: utils.getConfig().Username,
          productgroups: ''
        }
      };
      processObservationsDialog(data, params, updateSource);
    });
  }

  /**
   * Create dialog allowing the user to select productgroups and perform the action mentioned in params.action
   * @param  {Array}   data   Array of all productgroups
   * @param  {Object}   params Action to perform on the productgroups selected by the user
   * @param  {Function} [done]   function to execute after the action has ended
   * @return {void}
   */
  function processObservationsDialog(data, params, done) {
    var sel = $('select#dialogProcessObservations'),
      process = $('div#process');

    /*
    use multiselect widget of Eric Hynds ($.ech.multiselect) instead of the multiselect widget used in jqGrid
     */
    $.widget.bridge("ech_multiselect", $.ech.multiselect);
    sel.html('');
    $.each(data, function(i, row) {
      $(sel).append('<option value="' + row.productgroup_id + '">' + row.description + '</option>');
    });
    var dialog = process.append(sel)
      .dialog({
        autoOpen: false,
        title: params.dialogTitle,
        position: [
          'middle', 20
        ],
        height: 'auto',
        resizable: false,
        modal: false,
        open: function(event, ui) {
          sel.ech_multiselect({
            appendTo: process,
            keepOpen: true,
            position: {
              my: 'left top',
              at: 'left bottom'
            },
            autoOpen: false,
            isSelected: true,
            height: 300,
            open: function(event, ui) {
              process.height($('.ui-multiselect-menu').height() + sel.height() + 10);
            }
          });
          if (params.id === undefined) {
            sel.ech_multiselect('refresh').ech_multiselect("checkAll");
          } else {
            sel.val(params.id).ech_multiselect("refresh");
          }
          sel.ech_multiselect('open');
          process.height($('.ui-multiselect-menu').height() + sel.height() + 10);
        },
        close: function(event, ui) {
          sel.ech_multiselect('destroy');
        },
        buttons: [
          {
            text: params.buttonTitle,
            click: function(e) {
              e.preventDefault();
              params.query.productgroups = sel.ech_multiselect('getChecked').map(function() {
                return this.value;
              }).get();
              $.get('/data', params.query, function(data, txtStatus, jqXHR) {
               if (done) {
                  done(i18next.t('Main.Completed'));
                };
              }, 'text');
              dialog.dialog('close');
            }
          }, {
            text: i18next.t('Main.Cancel'),
            click: function() {
              dialog.dialog('close');
            }
          }
        ],
        width: 'auto'
      })
    .dialog('moveToTop')
    .dialog('open');
  }

  /**
   * Initialize the Observation grid
   * @return {void}
   */
  function initGrid() {
    var strAction = i18next.t('Observation.Action'),
      strTitle = i18next.t('Observation.Title'),
      strDate = i18next.t('Observation.Date'),
      strValue = i18next.t('Observation.Value'),
      strQuantity = i18next.t('Observation.Quantity'),
      strComment = i18next.t('Observation.Comment'),
      strContext = i18next.t('Observation.Context'),
      strCopyValue = i18next.t('Observation.CopyValue'),
      strValueEmpty = i18next.t('Observation.ValueEmpty'),
      strValueNegative = i18next.t('Observation.ValueNegative'),
      strValueNotNumeric = i18next.t('Observation.strValueNotNumeric'),

      observationGrid = $('#Observation');

    var ObservationColvariable = {
      name: 'variable',
      index: 'variable',
      key: true,
      sortable: false,
      hidden: false,
      fixed: true,
      classes: 'ui-state-default',
      hidedlg: true,
      width: 80
    };

    var ObservationColTmin1 = {
      name: 'Tmin1',
      index: 'Tmin1',
      sortable: false,
      formatter: VobservationFormat,
      unformat: observationUnFormat,
      cellattr: function(rowId, tv, rawObject, cm, rdata) {
        if (rowId === strContext) {
          return 'style="white-space: pre-wrap"';
        } else {
          return '';
        }
      },
      width: 400
    };

    var ObservationColTmin2 = {};
    $.extend(ObservationColTmin2, ObservationColTmin1);
    ObservationColTmin2.name = 'Tmin2';
    ObservationColTmin2.index = 'Tmin2';
    ObservationColTmin2.hidden = true;

    var ObservationColTmin3 = {};
    $.extend(ObservationColTmin3, ObservationColTmin1);
    ObservationColTmin3.name = 'Tmin3';
    ObservationColTmin3.index = 'Tmin3';
    ObservationColTmin3.hidden = true;

    var ObservationColTmin4 = {};
    $.extend(ObservationColTmin4, ObservationColTmin1);
    ObservationColTmin4.name = 'Tmin4';
    ObservationColTmin4.index = 'Tmin4';
    ObservationColTmin4.hidden = true;

    var ObservationColT = {
      name: 'Lobservation',
      index: 'Lobservation',
      sortable: false,
      editable: true,
      editrules: {
        custom: function(options) {
          value = options.newValue;
          var row = options.rowid;
          if (row === strValue) {
            if (value == '') {
              return ([false, strValueEmpty]);
            } else {
              if (!$.isNumeric(value)) {
                return ([false, strValueNotNumeric]);
              } else {
                if (value < 0) {
                  return ([false, strValueNegative]);
                } else {
                  return ([true, ""]);
                }
              }
            }
          } else {
            return ([true, ""]);
          }
        }
      },
      formatter: LobservationFormat,
      unformat: observationUnFormat,
      cellattr: function(rowId, tv, rawObject, cm, rdata) {
        if (rowId === strDate) {
          return ('class="not-editable-cell"');
        } else if (rowId === strContext) {
          return ('style="white-space: pre-wrap" class="not-editable-cell"');
        } else {
          return '';
        }
      },
      width: 400
    };

    var ObservationColAction = {
      name: 'act',
      index: 'act',
      width: 40,
      align: 'center',
      editable: false,
      formatter: copyValueFormat,
      hidedlg: true,
      fixed: true,
      sortable: false,
      search: false
    };

    var ObservationColNames = [
      '  ',
      'T',
      'Tmin1',
      'Tmin2',
      'Tmin3',
      'Tmin4',
      strAction
    ];

    var gridDefinition = {
      caption: 'dummy', //has to have some value
      height: '100%',
      width: 920,
      shrinkToFit: true,
      gridview: true,
      hidegrid: false,
      multiselect: false,
      viewrecords: true,
      url: '/data',
      datatype: "local",
      jsonReader: {
        root: "data",
        page: "page",
        total: "total",
        records: "records",
        repeatitems: false,
        id: "0",
        userdata: "userdata"
      },
      mtype: "GET",
      postData: {
        action: 'getObservation',
        records: '6'
      },
      cmTemplate: {
        title: false
      },
      colNames: ObservationColNames,
      colModel: [
        ObservationColvariable,
        ObservationColT,
        ObservationColTmin1,
        ObservationColTmin2,
        ObservationColTmin3,
        ObservationColTmin4,
        ObservationColAction
      ],
      rowNum: 5,
      scroll: false,
      toolbar: [
        true, 'top'
      ],
      sortable: true,
      cellEdit: true,
      cellsubmit: 'remote',
      cellurl: "/data",

      loadComplete: function(data) {
        showDiffContext = true;
      },

      beforeProcessing: function(data, status, xhr) {
        contextOriginal = data.data[4].Lobservation;
        if (!contextOriginal || (contextOriginal == null)) {
          contextOriginal = '';
        }
        contextTmin1 = data.data[4].Tmin1;
        if (!contextTmin1.includes('http')) {
           contextTmin1 = contextTmin1.split('.').join(',')
         }
        if (!contextTmin1 || (contextTmin1 == null)) {
          contextTmin1 = '';
        }
      },

      gridComplete: function() {
        var obsGrid = $('#Observation')
        $('button#copyValue').button({
          text: false,
          icons: {
            primary: 'ui-icon-copy'
          }
        }).click(function(e) {
          obsGrid.jqGrid('restoreCell', 1, 'Lobservation');
          newValue = $('#Observation_Lobservation').attr('price')
          if (newValue) {
            var oldValue = utils.unformatCurrency(newValue,'');
          } else {
            var oldValue = utils.unformatCurrency(obsGrid.jqGrid('getCol', 'Tmin1')[0],'');
          }
          var oldQuantity = obsGrid.jqGrid('getCell', strQuantity, 'Tmin1');
		  if (!oldQuantity) {
            oldQuantity = -1
          };
          $.post('/data', {
            action: 'updateObservation',
            observation_id: obsGrid.jqGrid('getGridParam', 'userData').observation_id,
            source_id: obsGrid.jqGrid('getGridParam', 'userData').source_id,
            Lobservation: {
              value: oldValue,
              quantity: oldQuantity
            },
            lblValue: strValue,
            lblComment: strComment,
            id: 'ValueAndQuantity',
            oper: 'edit'
          }, function(data) {
            $('#Source').trigger("reloadGrid");
            obsGrid.trigger("reloadGrid");
            localsetSidebar();
          }, "html");
        });
        obsGrid.jqGrid('delRowData', strDate);
        obsGrid.jqGrid('setSelection', strValue, false);
        obsGrid.jqGrid('bindKeys', {
          onEnter: function(rowid) {
            if ((rowid == strValue) && !($('button#copyValue').is(':focus'))) {
              obsGrid.jqGrid('editCell', 1, 1, true);
            }
          }
        });
      },

      formatCell: function(rowid, cellname, value, iRow, iCol) {
        if (rowid === strComment) {
          return value;
        } else {
        if (((rowid === strValue) || (rowid === strQuantity)) && (value === '-1')) {
          return ('');
        } else {
          if (rowid === strValue) {
            return utils.unformatCurrency(value, $('#Observation').attr('currency'))
          } else {
            return (utils.unformatNumber(value));
          }
        }
      }
      },

      beforeSaveCell: function(rowid, cellname, value, iRow, iCol) {
        if ((rowid === strValue) || (rowid === strQuantity)) {
          lastsel = rowid
          return utils.unformatNumber(value)
//          return utils.parseFloat(value)
        }
      },

      beforeSubmitCell: function(rowid, cellname, value, iRow, iCol) {
        var Rid = $("#Observation").jqGrid('getGridParam', 'userData').observation_id,
          Bid = $("#Observation").jqGrid('getGridParam', 'userData').source_id;
        return ({
          observation_id: Rid,
          source_id: Bid,
          action: 'updateObservation',
          lblValue: strValue,
          lblQuantity: strQuantity,
          lblComment: strComment
        });
      },

      afterRestoreCell: function(rowid, value, iRow, iCol) {
        if (rowid === strValue) {
          $('#Observation').jqGrid('setCell', rowid, iCol, utils.unformatCurrency(value,''));
        }
      },

      afterSubmitCell: function(serverresponse, rowid, cellname, value, iRow, iCol) {
        $('#Source').trigger("reloadGrid");
        $('#Observation').trigger("reloadGrid");
        localsetSidebar();
        return ([true, ""]);
      },

      onCellSelect: function(rowid, iCol, cellcontent, e) {
        var obsGrid = $('#Observation');
          if ((rowid === strContext) && (iCol === 1)) {
            obsGrid.jqGrid('restoreCell', 1, 'Lobservation');
            showDiffContext = !showDiffContext;
            obsGrid.jqGrid('setCell', rowid, iCol, contextOriginal);
        }
      }
    };

    observationGrid.jqGrid(gridDefinition);
    setToolbarObservation();
    //  You are not the first person (and not the last one) who wish to have another cursor on non
    //  sortable columns. It's pity, but jqGrid gives you not classes or some other simple attributes
    //  which can be used to find the elements at which one can set CSS "cursor:default".
    //
    //  So I suggest to do this with the following code (workaround):

    var cm = observationGrid[0].p.colModel;
    $.each(observationGrid[0].grid.headers, function(index, value) {
      var cmi = cm[index],
        colName = cmi.name;
      if (!cmi.sortable && colName !== 'rn' && colName !== 'cb' && colName !== 'subgrid') {
        $('div.ui-jqgrid-sortable', value.el).css({cursor: "default"});
      }
    });

    //  end workaround
  }

  return {
    initGrid: initGrid,
    fillGridObservation: fillGridObservation,
    setToolbarObservation: setToolbarObservation,
    exportObservations: exportObservations,
    getAllObservations: getAllObservations,
    updateSource: updateSource
  };

});
