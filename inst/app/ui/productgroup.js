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
  "app/utils", "i18next"
], function(utils, i18next) {

  var pgDeleted;

  function actionFormat(cellvalue, options, rowObject) {
    var pgId = rowObject.productgroup_id;
    var pg = rowObject.productgroup;
    return ('<button id="actionSave" productgroup_id="' + pgId + '" productgroup="' + pg + '">' + i18next.t('Productgroup.ExportConfig') + ' ' + pg + ' ...</button>');
  }

  function exportConfiguration(elt) {
    var currentPGid = $(elt).attr("productgroup_id");
    var currentPG = $(elt).attr("productgroup");
    $.get('/data', {
      action: 'exportConfiguration',
      productgroup_id: currentPGid,
      productgroup: currentPG,
      exportFolder: utils.getConfig().ExportFolder
    }, function(data) {
      alert(data);
    }, 'text');
  }

  function copyProductgroup() {
    var
      copyFrom = $("#Productgroup").jqGrid('getRowData', $("#Productgroup").jqGrid('getGridParam', 'selrow'));

    $("#Productgroup").jqGrid('editGridRow', 'new', {
      editData: {
        action: 'updateProductgroup',
        copyFromProductgroupId: copyFrom.productgroup_id
      },
      addCaption: i18next.t('Productgroup.Copy'),
      height: "auto",
      width: "auto",
      recreateForm: true,
      zIndex: 5000,
      modal: true,
      saveicon: [false],
      closeicon: [false],
      reloadAfterSubmit: true,
      beforeShowForm: function(form) {
        $('#description' +
          '.FormElement',
        form).val(copyFrom.description);
        $('#comment' +
          '.FormElement',
        form).val(copyFrom.comment);
      },
      errorTextFormat: utils.getServerError,
      closeAfterAdd: true
    });
  }

  function importProductgroup() {
    var strImportConfig = i18next.t('Productgroup.ImportConfig'),
      dlgImport = $('div#importProductgroup')
        .html('<div><button id="btn_myFileInput">' +
          i18next.t('Productgroup.Browse') +
          '</button> File: <label id="lbl_myFileInput" for="btn_myFileInput">' +
          i18next.t('Productgroup.BrowseText') +
          '</label><input type="file" id="configFile" style="visibility:hidden;" /></div>'
        )
        .dialog({
          autoOpen: false,
          title: strImportConfig,
          modal: true,
          appendTo: 'div#editPG',
          buttons: [
            {
              id: 'btnSave',
              text: i18next.t('Main.OK'),
              click: function() {
                $.get('/data', {
                  action: 'importConfiguration',
                  fileName: $('#configFile').val(),
                  exportFolder: utils.getConfig().ExportFolder
                }, function(data) {
                  alert(data);
                  dlgImport.dialog('close');
                  $('#Productgroup').trigger('reloadGrid');
                }, "html");
              }
            },
            {
              id: 'btnCancel',
              text: i18next.t('Main.Cancel'),
              click: function() {
                dlgImport.dialog('close');
              }
            }
          ],
          width: 480
        });

    $('button#btn_myFileInput').click(function() {
      $('input#configFile').click();
    });

    $('input#configFile').change(function() {
      $('label#lbl_myFileInput').text($('input#configFile').val());
    });

    dlgImport.dialog('open');
  }

  function initGrid() {

    var gridDefinition = {
      url: '/data?action=getProductgroup&element=grid',
      datatype: 'json',
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
        i18next.t('Productgroup.ProductgroupId'),
        i18next.t('Productgroup.Productgroup'),
        i18next.t('Productgroup.Description'),
        i18next.t('Productgroup.Comment'),
        i18next.t('Productgroup.Action')
      ],
      colModel: [
        {
          name: 'productgroup_id',
          index: 'productgroup_id',
          hidden: true,
          key: true,
          editable: false,
          editoptions: {
            size: 10
          },
          width: 120,
          fixed: true,
          search: false
        }, {
          name: 'productgroup',
          index: 'productgroup',
          editable: true,
          editoptions: {
            size: 10,
            required: true
          },
          editrules: {
            required: true
          },
          width: 120,
          sortable: true,
          search: false
        }, {
          name: 'description',
          index: 'description',
          editable: true,
          editoptions: {
            size: 40
          },
          width: 360,
          search: false
        }, {
          name: 'comment',
          index: 'comment',
          editable: true,
          editoptions: {
            size: 40
          },
          width: 360,
          search: false
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
      pager: '#pProductgroup',
      height: "100%",
      autowidth: true,
      shrinkToFit: true,
      forceFit: true,
      rowNum: 10,
      rowList: [
        -1, 10, 15, 20
      ],
      sortname: 'description',
      sortorder: 'asc',
      multiselect: false,
      viewrecords: true,
      gridview: true,
      hidegrid: false,
      caption: ' ',
      editurl: "/data",
      singleSelectClickMode: '',

      gridComplete: function() {
        var firstid = $('#Productgroup tbody tr:nth-child(2)').attr('id');
        $("#Productgroup").setSelection(firstid);
        $('button#actionSave').button({
          text: false,
          icons: {
            primary: 'ui-icon-disk'
          }
        }).click(function() {
          exportConfiguration(this);
        });
      }
    };

    var navDefinition = {
      name: '#pProductgroup',
      param: {
        edit: true,
        add: true,
        del: true,
        refresh: false,
        search: false
      },
      prmEdit: {
        editData: {
          action: 'updateProductgroup'
        },
        height: "auto",
        width: "auto",
        reloadAfterSubmit: false,
        errorTextFormat: utils.getServerError,
        viewPagerButtons: false,
        closeAfterEdit: true,
        jqModal: false,
        modal: true,
        recreateForm: true,
        toTop: true,
        saveicon: [false],
        closeicon: [false]
      },
      prmAdd: {
        editData: {
          action: 'updateProductgroup'
        },
        height: "auto",
        width: "auto",
        reloadAfterSubmit: true,
        errorTextFormat: utils.getServerError,
        closeAfterAdd: true,
        jqModal: false,
        modal: true,
        recreateForm: true,
        toTop: true,
        saveicon: [false],
        closeicon: [false]
      },
      prmDel: {
        delData: {
          action: 'updateProductgroup'
        },
        height: "auto",
        width: "auto",
        msg: i18next.t('Productgroup.MessageDelete'),
        reloadAfterSubmit: true,
        jqModal: false,
        modal: true,
        recreateForm: true,
        toTop: true,
        delicon: [false],
        cancelicon: [false],
        afterComplete: function(response, postdata, formid) {
          pgDeleted = true;
        }
      },
      prmCopy: {
        caption: '',
        buttonicon: 'ui-icon-copy',
        title: i18next.t('Productgroup.Copy'),
        onClickButton: copyProductgroup
      },
      prmSearch: {},
      prmImport: {
        caption: '',
        buttonicon: 'ui-icon-folder-open',
        title: i18next.t('Productgroup.ImportConfig'),
        onClickButton: importProductgroup
      }
    };

    var productgroupGrid = $("#Productgroup");
    productgroupGrid.jqGrid(gridDefinition);

    productgroupGrid.jqGrid('navGrid', navDefinition.name, navDefinition.param, navDefinition.prmEdit, navDefinition.prmAdd, navDefinition.prmDel, navDefinition.prmSearch);

    productgroupGrid.jqGrid('navButtonAdd', navDefinition.name, navDefinition.prmCopy);

    productgroupGrid.jqGrid('navButtonAdd', navDefinition.name, navDefinition.prmImport);

    $('#gview_Productgroup .ui-jqgrid-title').after('<h3 id="Productgroups" style="float: left; margin-left: 10px; margin-top: 2px; margin-bottom: 0px;" >' + i18next.t('Productgroup.Groups') + '</h3>', '<div style="float:right"><button id="closeEditPG">text</button></div>');

    $('button#closeEditPG').button({
      icons: {
        primary: 'ui-icon-close'
      },
      text: false,
      label: i18next.t('Productgroup.Close')
    }).click(function() {
      $('div#editPG').jqmHide();
      require("app/init").setSidebar(pgDeleted);

      $(window).trigger('resize');
    });

    $("#pProductgroup option[value=-1]").text(i18next.t('Main.AllRecords'));
  }

  return {initGrid: initGrid};
});
