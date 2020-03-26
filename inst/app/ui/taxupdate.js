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
  "app/utils",
  "i18next"
], function(utils, i18next) {
  function initGrid() {
    var gridDefinition = {
      url: '/data?action=getTaxrate',
      datatype: 'json',
      jsonReader: {
        root: "data",
        page: "page",
        total: "total",
        records: "records",
        oper: 'updateTaxrate',
        repeatitems: false,
        id: "0",
        userdata: "userdata"
      },
      mtype: 'GET',
      colNames: [
        i18next.t('Taxupdate.Taxcode'),
        i18next.t('Taxupdate.Taxdes'),
        i18next.t('Taxupdate.Taxrate')
      ],
      colModel: [
        {
          name: 'tax_code',
          index: 'tax_code',
          key: true,
          editable: false,
          align: 'center',
          hidden: true,
          fixed: true,
          search: false,
          width: 100,
          hidedlg: true
        }, {
          name: 'tax_des',
          index: 'tax_des',
          key: true,
          editable: false,
          align: 'left',
          hidden: false,
          fixed: true,
          search: false,
          width: 100,
          hidedlg: true
        },{
          name: 'tax_rate',
          index: 'tax_rate',
          editable: true,
          editoptions: {
            size: 10,
            required: true,
          },
          editrules: {
            required: true,
            number : true,
            minValue: 0
          },
          hidden: false,
          fixed: true,
          search: false,
          width: 290,
          hidedlg: true
        }
      ],
      cellEdit: true,
      cellurl: '/data?action=updateTaxrate',
      beforeSubmitCell: function(rowid, cellname, value, iRow, iCol) {
        return {action: 'updateTaxrate'}
      },
      multiselect: false,
      viewrecords: true,
      gridview: true,
      hidegrid: false,
      caption: i18next.t('Taxupdate.Label'),
      singleSelectClickMode: ''
}



    //    var taxrateGrid = $("#taxrates");
      //  taxrateGrid.jqGrid(gridDefinition);

      //  taxrateGrid.jqGrid('navGrid', navDefinition.name, navDefinition.param, navDefinition.prmEdit);

    $('#taxrates').jqGrid(gridDefinition)
    $('#gview_taxrates .ui-jqgrid-title').after('<div style="float:right"><button id="closeTaxrate">text</button></div>');

    $('button#closeTaxrate').button({
      icons: {
        primary: 'ui-icon-close'
      },
      text: false,
      label: i18next.t('Productgroup.Close')
    }).click(function() {
      $('.taxupdate').jqmHide();
    });

}
//  function populateGrid() {
//    $("#taxrates").trigger("reloadGrid").focus();
//  }

  function populateGrid() {
    $("#taxrates").trigger("reloadGrid").focus()
      .draggable({
        containment: [0, 0, 2000, 2000]
      })
      .jqm({modal: true, toTop: true, overlayClass: 'ui-widget-overlay', overlay: 30, closeOnEscape: true})
      .jqmShow()
    ;
  }


  return {
    populateGrid: populateGrid,
    initGrid: initGrid
  };

});
