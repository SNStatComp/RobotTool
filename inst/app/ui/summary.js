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
      url: '/data?action=getMetrics',
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
        i18next.t('Summary.Productgroup'),
        i18next.t('Summary.Source'),
        i18next.t('Summary.LastObsDate'),
        i18next.t('Summary.HasPrice'),
        i18next.t('Summary.NoPrice'),
        i18next.t('Summary.NoObservation')
      ],
      colModel: [
        {
          name: 'productgroup',
          index: 'productgroup',
          key: true,
          editable: false,
          hidden: false,
          fixed: true,
          search: false,
          width: 300,
          hidedlg: true
        }, {
          name: 'name',
          index: 'name',
          key: true,
          editable: false,
          hidden: false,
          fixed: true,
          search: false,
          width: 270,
          hidedlg: true,
          summaryType: function(val, name, record) {return i18next.t('Summary.Total')}
        }, {
          name: 'lastobsdate',
          index: 'lastobsdate',
          hidden: false,
          fixed: true,
          width: 180,
          search: false,
          editable: false,
          hidedlg: true,
          summaryType: function(val, name, record) {return record[name]}
        },{
          name: 'hasprice',
          index: 'hasprice',
          align: 'center',
          key: true,
          editable: false,
          hidden: false,
          fixed: true,
          search: false,
          width: 80,
          hidedlg: true,
          summaryType: 'sum'
        }, {
          name: 'noprice',
          index: 'noprice',
          align: 'center',
          key: true,
          editable: false,
          hidden: false,
          fixed: true,
          search: false,
          width: 80,
          hidedlg: true,
          summaryType: 'sum'
        }, {
          name: 'noobs',
          index: 'noobs',
          align: 'center',
          key: true,
          editable: false,
          hidden: false,
          fixed: true,
          search: false,
          width: 80,
          hidedlg: true,
          summaryType: 'sum'
        }
      ],
      multiselect: false,
      viewrecords: true,
      gridview: true,
      hidegrid: false,
      caption: i18next.t('Summary.Label'),
      singleSelectClickMode: '',
      grouping:true,
      groupingView : {
        groupField : ['productgroup'],
        groupDataSorted : false,
        groupCollapse: true,
        groupSummary: [true],
        groupSummaryPos: ['header'],
        hideFirstGroupCol: true,
        showSummaryOnHide: true
      }
    }
    $('#metrics').jqGrid(gridDefinition)
  }
  function populateGrid() {
    console.log('summary')
    $("#metrics").trigger("reloadGrid").focus();
  }

  return {
    populateGrid: populateGrid,
    initGrid: initGrid
  };

});
