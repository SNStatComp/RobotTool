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
  "app/utils", "i18next.amd.withJQuery.min", "jquery.jqgrid.src"
], function(utils, i18next) {

  var lastSourceId = '';

  function actionPathFormat(cellvalue, options, rowObject) {

    var
      r = '<div class="clearfix">' +
        '<button style="width:26px;" source_id="' + rowObject.source_id +
        '" step_no ="' + rowObject.step_no + '" id="viewPage">' +
        i18next.t('SourcePath.ViewPage') +
        '</button>' + '<button style="width:26px;" source_id="' + rowObject.source_id +
        '" step_no ="' + rowObject.step_no + '" id="testPaths">' +
        i18next.t('SourcePath.ViewContext') + '</button>' + '</div>';
    return (r);
  }

  function actionPathUnFormat(cellvalue, options, cell) {
    return $('span#org', cell).text();
  }

  function setStepNumber() {
    var val = $(this).jqGrid('getCol', 'step_no'),
      newStep;
    if (val.length > 0) {
      newStep = Math.max.apply(Math, val) + 2;
    } else {
      newStep = 1;
    }
    return (newStep);
  }

  function getWebInfo() {
    if ($(this).attr("id") === "testPaths") {
      $.get('/data.html', {
        action: 'getWebInfo',
        source_id: $(this).attr("source_id"),
        step_no: $(this).attr("step_no"),
        oper: 'getContext'
      }, function(data) {
        var selRowId = $("#Source").jqGrid('getGridParam', 'selrow'),
          currency = $("#Source").jqGrid('getCell', selRowId, 'currency');
        var dialog = $('<div></div>')
          .html(utils.highlightPrice(data.context, currency))
          .dialog({
            autoOpen: false,
            title: i18next.t('SourcePath.Context'),
            width: 480,
            maxHeight: 600});
        utils.dialogProgress.children('#processBar').progressbar("destroy");
        utils.dialogProgress.dialog("close");
        dialog.dialog('open');
      }, "json");
    };
    if ($(this).attr("id") === "viewPage") {
      $.get('/data.html', {
        action: 'getWebInfo',
        source_id: $(this).attr("source_id"),
        step_no: $(this).attr("step_no"),
        oper: 'getUrl'
      }, function(data) {
        utils.dialogProgress.children('#processBar').progressbar("destroy");
        utils.dialogProgress.dialog("close");
        window.open(decodeURI(data.url));
      }, "json");
    }
  }

  function pathFormatter(cellvalue, options, rowObject) {
    return cellvalue.replace(/"/g, "'");
  }

  function createGridSourcePath(subgrid_id, source_id) {
    var strStepNumber = i18next.t('SourcePath.StepNumber'),
      strStepType = i18next.t('SourcePath.StepType'),
      strStepTypeValues = i18next.t('SourcePath.StepTypeValues'),
      strPath = i18next.t('SourcePath.Path'),
      strParameter = i18next.t('SourcePath.Parameter'),
      strAction = i18next.t('SourcePath.Action'),
      strStepNegative = i18next.t('SourcePath.StepNegative'),
      strAllRecords = i18next.t('Main.AllRecords'),

      gridDefinition = {
        url: "/data.html?action=getSourcePath&id=",
        datatype: "json",
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
          'sourcepath_id',
          'source_id',
          'productgroup_id',
          strStepNumber,
          strStepType,
          strPath,
          strParameter,
          strAction
        ],
        colModel: [
          {
            name: "sourcepath_id",
            index: "sourcepath_id",
            width: 55,
            key: true,
            hidden: true
          }, {
            name: "source_id",
            index: "source_id",
            hidden: true
          }, {
            name: "productgroup_id",
            index: "productgroup_id",
            hidden: true
          }, {
            name: "step_no",
            index: "step_no",
            width: 30,
            editable: true,
            sortable: false,
            editoptions: {
              size: 10,
              defaultValue: setStepNumber
            },
            editrules: {
              integer: true,
              required: true,
              custom: true,
              custom_func: function(value, name) {
                if (value <= 0) {
                  return ([false, strStepNegative]);
                } else {
                  return ([true, ""]);
                }
              }
            },
            formoptions: {
              rowpos: 4
            },
            align: "center"
          }, {
            name: "step_type",
            index: "step_type",
            editable: true,
            edittype: 'select',
            editoptions: {
              value: strStepTypeValues
            },
            formatter: "select",
            formoptions: {
              rowpos: 3
            },
            width: 80,
            align: "center",
            cellattr: function(rowId, val, rawObject, cm, rdata) {
              var str = cm.editoptions.value;
              str = '{"' + str.replace(/;/g, '","') + '"}';
              var values = JSON.parse(str.replace(/:/g, '":"'));
              return (' title = "' + values[val] + '"');
            }
          }, {
            name: "path",
            index: "path",
            editable: true,
            edittype: "textarea",
            formatter: pathFormatter,
            editoptions: {
              cols: 79,
              rows: 2,
              style: "resize:none;width:300;height:20"
            },
            formoptions: {
              rowpos: 1
            },
            width: 400
          }, {
            name: "parameter",
            index: "parameter",
            editable: true,
            editoptions: {
              size: 80
            },
            formoptions: {
              rowpos: 2
            },
            width: 300
          }, {
            name: "action_path",
            index: "action_path",
            editable: false,
            editoptions: {
              size: 10
            },
            formatter: actionPathFormat,
            unformat: actionPathUnFormat,
            width: 60,
            align: "center"
          }
        ],
        editurl: "/data.html",
        height: '100%',
        rowNum: -1,
        rowList: [
          -1, 5, 10, 15
        ],
        viewrecords: true,
        sortname: 'step_no',
        sortorder: "asc",
        pager: '',
        singleSelectClickMode: '',

        gridComplete: function() {
          var firstid = $('tbody tr:nth-child(2)', this).attr('id');
          $(this).setSelection(firstid, true);
          $('button#testPaths')
            .button({
              text: false,
              icons: {
                primary: 'ui-icon-play'
              }
            })
            .click(getWebInfo);
          $('button#viewPage')
            .button({
              text: false,
              icons: {
                primary: 'ui-icon-extlink'
              }
            })
            .click(getWebInfo);
        },
        onSelectRow: function(id) {
          var currentSource = $(this).jqGrid('getCell', id, 'source_id');
          if (lastSourceId != currentSource) {
            $('#Source').jqGrid('setSelection', currentSource);
          }
        }
      };

    var subgrid_table_id = subgrid_id + "_t",
      pager_id = "p_" + subgrid_id;

    $('#Source').jqGrid('setSelection', source_id);
    $("#" + subgrid_id).html(
      "<table id='" + subgrid_table_id +
      "' class='scroll'></table><div id='" + pager_id + "' class='scroll'></div>");

    gridDefinition.url = '/data.html?action=getSourcePath&id=' + source_id +
      '&productgroup_id=' + $('h3#Sources').attr('productgroup_id');
    gridDefinition.pager = pager_id;

    $("#" + subgrid_table_id)
      .jqGrid(gridDefinition)
      .jqGrid('navGrid', "#" + pager_id,
        {
          edit: true,
          add: true,
          del: true,
          refresh: false,
          search: false
        }, {
          width: 700,
          saveicon: [false],
          closeicon: [false],
          editData: {
            source_id: source_id,
            productgroup_id: $('h3#Sources').attr('productgroup_id'),
            action: 'updateSourcePath'
          },
          reloadAfterSubmit: false,
          viewPagerButtons: false,
          errorTextFormat: utils.getServerError,
          closeAfterEdit: true
        }, {
          width: 700,
          saveicon: [false],
          closeicon: [false],
          editData: {
            source_id: source_id,
            productgroup_id: $('h3#Sources').attr('productgroup_id'),
            action: 'updateSourcePath'
          },
          errorTextFormat: utils.getServerError,
          closeAfterAdd: true
        }, {
          delData: {
            action: 'updateSourcePath'
          },
          delicon: [false],
          cancelicon: [false]
        });

    $("#" + pager_id + " .ui-pg-selbox option[value=-1]").text(strAllRecords);
  }

  return {createGridSourcePath: createGridSourcePath};
});
