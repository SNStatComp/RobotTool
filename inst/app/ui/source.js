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
  "app/Observation",
  "app/SourcePath",
  "app/Chart",
  "app/utils",
  "i18next.amd.withJQuery.min"
], function(Observation, SourcePath, Chart, utils, i18next) {
  var
    lastsel,
    gridDefinition,
    navDefinition,
    filterDefinition;

  function localsetSidebar() {
    require("app/init").setSidebar();
  }

  function getproductgroup_id() {
    return ($('h3#Sources').attr('productgroup_id'));
  }

  function populateSource(productgroup_id, pg_desc) {
    $('button#showScatterPlot')
      .attr('productgroup_id', productgroup_id)
      .attr('title', 'Prices ' + pg_desc);

    $('button#exportObservations').attr('productgroup_id', productgroup_id);

    $('button#getObservation')
      .attr('productgroup_id', productgroup_id)
      .attr('title', i18next.t('Observation.GetObservations') + ' ' + pg_desc)
      .button({
        text: false,
        icons: {
          primary: 'ui-icon-play'
        },
        label: i18next.t('Observation.GetObservations') + ' ' + pg_desc
      });

    $("h3#Sources")
      .text(pg_desc)
      .attr('productgroup_id', productgroup_id);

    $("#Source").jqGrid('setGridParam', {
      page: 1,
      postData: {
        action: 'getSource',
        productgroup_id: productgroup_id
      }
    });
    $("#Source").jqGrid('setCaption',pg_desc);
    lastsel = undefined;
    $("#Source").trigger("reloadGrid").focus();
  }

  function observationFormat(cellvalue, options, rowObject) {
    var num = Number(cellvalue),
      r, country, fnum;

    if (num === -1) {
      r = '<span id="noValue">' + num + '</span>';
    } else {
      country = rowObject.currency || '';
      fnum = utils.formatCurrency(num, country);
      r = '<span id="value">' + fnum + '</span>';
    }
    return (r);
  }

  function observationUnFormat(cellvalue, options, cell) {
    return $('a', cell).text();
  }

  function actionFormat(cellvalue, options, rowObject) {
    return (
      '<button id="action" style="width:100%" source_id="' + rowObject.source_id +
      '" productgroup_id="' + rowObject.productgroupId + '">' +
      i18next.t('Source.GetObservation') + ' ' +
      rowObject.source_id + ' ...</button>');
  }

  function copySource() {
    var
      copyFrom = $("#Source").jqGrid('getRowData', $("#Source").jqGrid('getGridParam', 'selrow'));

    $("#Source").jqGrid('editGridRow', 'new', {
      editData: {
        action: 'updateSource',
        productgroup_id: getproductgroup_id,
        copyFromSourceId: copyFrom.source_id
      },
      addCaption: i18next.t('Source.CopySource'),
      height: "auto",
      width: "auto",
      recreateForm: true,
      saveicon: [false],
      closeicon: [false],
      reloadAfterSubmit: true,
      beforeShowForm: function(form) {
        var newSourceId = copyFrom.source_id + '_copy';
        $('#tr_source_id', form).show();
        $('#source_id' + '.FormElement', form).val(newSourceId);
        $('#name' + '.FormElement', form).val(copyFrom.name);
        $('#address' + '.FormElement', form).val(copyFrom.address);
        $('#url' + '.FormElement', form).val(copyFrom.url);
        $('#comment' + '.FormElement', form).val(copyFrom.comment);
      },
      errorTextFormat: utils.getServerError,
      closeAfterAdd: true
    });
  }

  function processObservation(data) {
    var saveDisabled = true,
      EditObservation,
      selRowId = $("#Source").jqGrid('getGridParam', 'selrow'),
      currency = $("#Source").jqGrid('getCell', selRowId, 'currency'),
      context = utils.highlightPrice(data.context, currency),
      dialog;

    utils.dialogProgress.dialog('close');

    if (data.last_obs_date != null) {
      EditObservation = i18next.t('Source.EditObservation') +  ' ' + data.last_obs_date;
      saveDisabled = false;
    } else {
      context += '<div id="alertBox">' + i18next.t('Observation.NoObservation') + '</div>';
    }
    dialog = $('<div></div>').html(context).dialog({
      autoOpen: false,
      title: EditObservation,
      modal: true,
      buttons: [
        {
          id: 'btnSave',
          text: i18next.t('Main.Save'),
          disabled: saveDisabled,
          click: function() {
            $.get('/data.html', {
              action: 'getWebInfo',
              source_id: data.source_id,
              context: $(data.context).html(),
              error: data.error,
              step_no: 0,
              user_id: utils.getConfig().Username,
              oper: 'updateObservation'
            }, function(message) {
              alert(message);
              dialog.dialog('close');
              $('#Source').trigger('reloadGrid');
              localsetSidebar();
            }, "html");
          }
        }, {
          id: 'btnCancel',
          text: i18next.t('Main.Cancel'),
          click: function() {
            dialog.dialog('close');
          }
        }
      ],
      width: 480,
      maxHeight: 600
    });
    dialog.dialog('open');
  }

  function openDialogObservation() {
    $('div#closeDialogObservation').remove();
    $('#gview_Observation .ui-jqgrid-title').html(
      '<h3 id="Productgroup" style="float: left; margin-left: 10px; margin-top: 0px; margin-bottom: 0px;" >' +
      i18next.t('Observation.ValueAndContext') + ' ' +
      $('h3#Sources').text() + '</h3>');

    $('#gview_Observation .ui-jqgrid-title')
      .after('<div id="closeDialogObservation" style="float:right"><button id="closeDialogObservation">text</button></div>');

    $(' button#closeDialogObservation')
      .button({
        icons: {
          primary: 'ui-icon-close'
        },
        text: false
      })
      .click(function() {
        $('div#dialogObservation').jqmHide();
      });

    $('div#dialogObservation')
      .draggable({
        containment: [0, 0, 2000, 2000]
      })
      .jqm({modal: true, toTop: true, overlayClass: 'ui-widget-overlay', overlay: 30, closeOnEscape: true})
      .jqmShow();

    $('table#Observation').focus();
  }

  function openDialogWebInfo() {
    $.get('/data.html', {
      action: 'getWebInfo',
      source_id: $(this).attr("source_id"),
      productgroup_id: $(this).attr("productgroup_id"),
      step_no: 0,
      oper: 'getContext'
    }, processObservation, "json");
  }

  function initGrid(productgroup_id, pg_desc, userSettings) {
    var strAll = i18next.t("YesNo.All"),
      strYes = i18next.t("YesNo.Yes"),
      strNo = i18next.t("YesNo.No"),

      strSource = i18next.t('Source.Source'),
      strName = i18next.t('Source.Name'),
      strAddress = i18next.t('Source.Address'),
      strWebsite = i18next.t('Source.Website'),
      strActive = i18next.t('Source.Active'),
      strComment = i18next.t('Source.Comment'),
      strCurrency = i18next.t('Source.Currency'),
      strLastValue = i18next.t('Source.LastValue'),
      strProductgroup = i18next.t('Productgroup.Productgroup'),
      strNoValue = i18next.t('Source.NoValue'),
      strAction = i18next.t('Source.Action'),
      strGetObservation = i18next.t('Source.GetObservation'),
      strColumns = i18next.t('Source.Columns'),
      strSelectColumns = i18next.t('Source.SelectColumns'),
      strCopySource = i18next.t('Source.CopySource'),
      strAllRecords = i18next.t('Main.AllRecords'),
      strCompleted = i18next.t('Main.Completed'),
      strMessageDelete = i18next.t('Observation.MessageDelete'),
      strExportObservations = i18next.t('Observation.ExportObservations');

    gridDefinition = {
      url: '/data.html',
      datatype: 'local',
      jsonReader: {
        root: "data",
        page: "page",
        total: "total",
        records: "records",
        repeatitems: false,
        id: "0",
        userdata: "userdata"
      },
      mtype: 'GET',
      colNames: [
        'source_id',
        strSource,
        strName,
        strAddress,
        strWebsite,
        strActive,
        strComment,
        strCurrency,
        strLastValue,
        strProductgroup,
        strAction
      ],
      colModel: [
        {
          name: 'source_id',
          index: 'source_id',
          key: true,
          editable: false,
          hidden: true,
          fixed: true,
          search: false,
          hidedlg: true
        }, {
          name: 'source',
          index: 'source',
          editable: true,
          editoptions: {
            size: 15,
            required: true
          },
          width: 60,
          fixed: true,
          search: false
        }, {
          name: 'name',
          index: 'name',
          editable: true,
          editoptions: {
            size: 42
          },
          fixed: true,
          search: false
        }, {
          name: 'address',
          index: 'address',
          editable: true,
          editoptions: {
            size: 42
          },
          fixed: true,
          search: false
        }, {
          name: 'url',
          index: 'url',
          editable: true,
          editoptions: {
            size: 42
          },
          formatter: 'link',
          fixed: false,
          formatoptions: {
            target: '_blank'
          },
          hidedlg: true,
          width: 290,
          search: false
        }, {
          name: 'is_active',
          index: 'is_active',
          editable: true,
          edittype: "select",
          editoptions: {
            value: {
              1: strYes,
              0: strNo
            },
            defaultValue: strYes
          },
          editrules: {
            edithidden: true
          },
          formatter: 'select',
          width: 60,
          fixed: true,
          align: 'center',
          search: true,
          stype: 'select',
          hidden: false,
          searchoptions: {
            value: {
              '': strAll,
              1: strYes,
              0: strNo
            },
            searchhidden: true,
            clearSearch: false,
            dataInit: function(el) {
              var defOption = $("option:contains('" + strYes + "')", el);
              $('#Source').jqGrid('setGridParam', {datatype: 'json'});
              defOption.attr("selected", "selected");
              setTimeout(function() {
                $(el).trigger('change');
              }, 500);
            }
          }
        }, {
          name: 'comment',
          index: 'comment',
          editable: true,
          edittype: "textarea",
          editoptions: {
            rows: "2",
            cols: "40"
          },
          editrules: {
            edithidden: true
          },
          fixed: true,
          search: false
        }, {
          name: 'currency',
          index: 'currency',
          editable: true,
          edittype: "text",
          editoptions: {
            dataInit: function(elem) {
              var h = $.map(CountryCurrency, function(obj) {
                return ({
                  value: obj.CountryCode + ' (' + obj.CurrencyCode + ')',
                  label: obj.CountryName + ' (' + obj.CurrencyCode + ')'
                });
              });
              $(elem).autocomplete({source: h});
              $('.ui-autocomplete').css('zIndex', 2000);
            },
            defaultValue: function() {
              var obj = utils.getCurrencyInfo(utils.getConfig().Locale);
              return obj.CountryCode + ' (' + obj.CurrencyCode + ')';
            }
          },

          hidden: true,
          editrules: {
            edithidden: true
          },
          fixed: true,
          width: 80,
          search: false
        }, {
          name: 'lastValue',
          index: 'lastValue',
          formatter: observationFormat,
          unformat: observationUnFormat,
          align: 'center',
          editable: false,
          editoptions: {
            readonly: true,
            size: 80
          },
          width: 90,
          fixed: true,
          search: true,
          stype: 'select',
          hidedlg: true,
          searchoptions: {
            clearSearch: false,
            value: {
              0: strAll,
              "-1": strNoValue
            },
            sopt: ['eq']
          }
        }, {
          name: 'productgroupId',
          index: 'productgroupId',
          hidden: true,
          fixed: true,
          search: false,
          hidedlg: true,
          editable: true,
          edittype: 'select',
          editoptions: {
            dataUrl: 'data.html?action=getProductgroup&element=select',
            defaultValue: getproductgroup_id
          },
          editrules: {
            edithidden: true
          }
        }, {
          name: 'act',
          index: 'act',
          width: 40,
          fixed: true,
          align: 'center',
          editable: false,
          formatter: actionFormat,
          sortable: false,
          hidedlg: true,
          search: false
        }
      ],
      pager: '#pSource',
      height: "100%",
      autowidth: true,
      shrinkToFit: true,
      forceFit: true,
      sortable: true,
      rowNum: -1,
      rowList: [-1, 5, 10, 15, 20, 30],
      sortname: 'source',
      sortorder: 'asc',
      multiselect: false,
      viewrecords: true,
      gridview: true,
      caption: '',
      hidegrid: false,
      editurl: "/data.html",
      subGrid: true,
      singleSelectClickMode: '',

      onSelectRow: function(id) {
        if (lastsel != id) {
          $('table#Source_' + lastsel + '_t').find('tr.ui-state-highlight').addClass('ui-state-highlight-dim');
          $('table#Source_' + id + '_t').find('tr.ui-state-highlight').removeClass('ui-state-highlight-dim');
        }
        lastsel = id;
        SourcePath.lastSourceId = id;
      },

      onCellSelect: function(rowid, iCol, cellcontent, e) {
        if (iCol == 9) { //column lastValue
          $('#Observation').jqGrid('setGridParam', {'datatype': 'json'});
          Observation.fillGridObservation(rowid);
          openDialogObservation();
        }
      },

      onPaging: function(pgButton) {
        lastsel = undefined;
      },

      gridComplete: function() {
        var firstid = $('#Source tbody tr:nth-child(2)').attr('id');
        if (lastsel === undefined) {
          if (firstid === undefined) {} else {
            $("#Source").setSelection(firstid);
          }
        } else {
          $("#Source").setSelection(lastsel);
        }
        $('button#action').button({
          text: false,
          icons: {
            primary: 'ui-icon-play'
          }
        }).click(openDialogWebInfo);
        $(window).trigger('resize');
      },

      subGridRowExpanded: SourcePath.createGridSourcePath
    };

    navDefinition = {
      name: '#pSource',
      param: {
        edit: true,
        add: true,
        del: true,
        refresh: false,
        search: false
      },
      prmEdit: {
        editData: {
          action: 'updateSource',
          productgroup_id: getproductgroup_id
        },
        height: "auto",
        width: "auto",
        recreateForm: true,
        reloadAfterSubmit: true,
        viewPagerButtons: false,
        saveicon: [false],
        closeicon: [false],
        zIndex: 1500,
        beforeShowForm: function(form) {
          $('#tr_source_id', form).hide();
        },
        errorTextFormat: utils.getServerError,
        closeAfterEdit: true
      },
      prmAdd: {
        editData: {
          action: 'updateSource',
          productgroup_id: getproductgroup_id
        },
        height: "auto",
        width: "auto",
        reloadAfterSubmit: true,
        recreateForm: true,
        saveicon: [false],
        closeicon: [false],
        errorTextFormat: utils.getServerError,
        closeAfterAdd: true
      },
      prmDel: {
        delData: {
          action: 'updateSource',
          productgroup_id: getproductgroup_id
        },
        height: "auto",
        width: "auto",
        delicon: [false],
        cancelicon: [false],
        msg: strMessageDelete,
        reloadAfterSubmit: true,
        recreateForm: true
      },
      prmSearch: {
        multipleSearch: true
      },
      prmCopy: {
        caption: '',
        buttonicon: 'ui-icon-copy',
        title: strCopySource,
        onClickButton: copySource
      },
      columnChooser: {
        caption: strColumns,
        title: strSelectColumns,
        onClickButton: function() {
          $("#Source").jqGrid('columnChooser', {
            done: function(perm) {
              if (perm) {
                // "OK" button is clicked
                this.jqGrid("remapColumns", perm, true);
                // the grid width is probably changed so we can get new width
                // and adjust the width of other elements on the page
                $(window).trigger('resize');
              } else {
                // we can do some action in case of "Cancel" button clicked
              }
            }
          });
        }
      }
    };

    filterDefinition = {
      stringResult: false,
      searchOnEnter: true
    };

    var sourceGrid = $("#Source");

    require("app/init").applyUserSettings(gridDefinition, userSettings);
    gridDefinition.url = '/data.html';
    gridDefinition.postData = {
      action: 'getSource',
      productgroup_id: productgroup_id
    };

    sourceGrid.jqGrid(gridDefinition);
    $("#pSource option[value=-1]").text(strAllRecords);
    sourceGrid.setGridParam({ rownum: userSettings.Source.rowNum })

    navDefinition.prmEdit.afterComplete = localsetSidebar;
    navDefinition.prmAdd.afterComplete = localsetSidebar;
    navDefinition.prmDel.afterComplete = localsetSidebar;

    sourceGrid.jqGrid('navGrid', navDefinition.name, navDefinition.param, navDefinition.prmEdit, navDefinition.prmAdd, navDefinition.prmDel, navDefinition.prmSearch);
    sourceGrid.jqGrid('filterToolbar', filterDefinition);
    sourceGrid[0].triggerToolbar();
    sourceGrid.jqGrid('navButtonAdd', navDefinition.name, navDefinition.prmCopy);
    sourceGrid.jqGrid('navButtonAdd', navDefinition.name, navDefinition.columnChooser);

    $('#gview_Source .ui-jqgrid-title').after(
      '<h3 id="Sources" style="float: left; margin-left: 10px; margin-top: 2px; margin-bottom: 0px; display:none"></h3>',
      '<div style="float:right"><button id="getObservation"></button></div>',
      '<div style="float:right"><button id="exportObservations"></button></div>',
      '<div style="float:right"><button id="showScatterPlot"></button></div>');

    $('button#showScatterPlot')
      .attr('productgroup_id', productgroup_id)
      .button({
        text: false,
        icons: {
          primary: 'ui-icon-image'
        },
        label: 'Prices ' + pg_desc
      })
      .click(function(e) {
        e.preventDefault();
        $('.chart').html('');
        Chart.createScatterPlot($(this).attr('productgroup_id'));
        $('.chart').dialog({width: 972, height: 560});
      });

    $('button#getObservation')
      .attr('productgroup_id', productgroup_id)
      .text(i18next.t('Observation.GetObservations') + ' ' + pg_desc)
      .button({
        text: false,
        icons: {
          primary: 'ui-icon-play'
        },
        label: i18next.t('Observation.GetObservations') + ' ' + pg_desc
      })
      .click(function(e) {
        var self = this;
        e.preventDefault();
        $.get('/data.html', {
          action: 'setObservation',
          productgroups: [$(this).attr('productgroup_id')],
          oper: 'insert',
          user_id: utils.getConfig().Username
        }, function(data) {
          var message = $(self).attr('title') + ':' + strCompleted;
          Observation.updateSource(message);
        });
      });

    $('button#exportObservations')
      .attr('productgroup_id', productgroup_id)
      .text(strExportObservations)
      .button({
        text: false,
        icons: {
          primary: 'ui-icon-folder-collapsed'
        }
      })
      .click(Observation.exportObservations);

    $("h3#Sources").text(pg_desc).attr('productgroup_id', productgroup_id);

    sourceGrid.jqGrid('setCaption', pg_desc);
    sourceGrid.jqGrid('bindKeys', {onEnter: openDialogObservation});
    sourceGrid.jqGrid('setGridWidth', $('#Source').parent().width(), true);
    sourceGrid.focus();
  }

  return {
    populateSource: populateSource,
    initGrid: initGrid
  };
});
