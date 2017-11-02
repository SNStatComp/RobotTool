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
  "app/productgroup",
  "app/observation",
  "app/sourcepath",
  "app/source",
  "app/utils",
  "i18next.amd.withJQuery.min"
], function(Productgroup, Observation, SourcePath, Source, utils, i18next) {

  /**
   * Resizes grids when user resizes application window, etc.
   * @return {void}
   */
  function resizeGrids() {
    var parentWidth = $("#editSource").width();

    $("#Source").jqGrid('setGridWidth', parentWidth - 2, true);
    parentWidth = $("#editPG").width();
    $("#Productgroup").jqGrid('setGridWidth', parentWidth - 2, true);
  }

  /**
   * (re)Populates the sidebar with the productgroups listed in the data parameter, then
   * activates the previous selected productgroup, or the first productgroup in the list when there was no previous selected
   * productgroup, then fires the function which populates the source grid
   * @param  {Array} data Array of productgroups. Each element is an object containing information about a productgroup:
   *                      productgroup_id, description, comment, numberOfSources and numberOfValues
   * @return {void}
   */
  function createPGlist(data) {
    var
      rest,
      code,
      lastsel = $('ul#Productgroups li.selected').attr('productgroup_id');
    if (data.length > 0) {
       code = data.map(function(v) { return Number(v.productgroup_id); })
    }
    if (!lastsel && (data.length > 0)) {
      lastsel = data[0].productgroup_id;
    }

    $("ul#Productgroups li").remove();
    $("ul#Productgroups").accordion("refresh");

    $.each(data, function(i, value) {
      var desc = value.description;

      if (value.numberOfSources !== 0) {
        rest = value.numberOfSources - value.numberOfValues;
        if (rest !== 0) {
          desc += '<strong style="color: red">' + ' (' + rest + ')</strong>';
        }
      };

      $('ul#Productgroups')
        .append(
          '<li id="PG" productgroup_id="' + value.productgroup_id +
          '" desc="' + value.description + '"><div class="desc">' + desc + '</div></li>');

      $('ul#Productgroups li')
        .last()
        .append('<div>' + value.comment + '</div>');
    });
    if (code) {
      if ($.inArray(Number(lastsel), code) == -1) {
        lastsel = code[0];
      }
    }
    if (lastsel) {
      var h = $('ul#Productgroups li[productgroup_id=' + lastsel + ']')
      h.addClass('selected');
      $("ul#Productgroups").accordion("refresh");
      $('ul#Productgroups').accordion("option", "active", $('ul#Productgroups li').index(h));
    }
    $('li#PG').click(function(e) {
      var
        productgroup_id = $(this).attr('productgroup_id'),
        pg_desc = $(this).attr('desc');

      e.preventDefault();
      $(this).addClass('selected').siblings().removeClass('selected');
      Source.populateSource(productgroup_id, pg_desc);
    });
  }

  /**
   * Creates the buttons in the header of the sidebar
   * @return {void}
   */
  function createLinks() {
    $('#ExportAllObservations')
      .button({
        label: i18next.t('Observation.ExportObservations'),
        text: false,
        icons: {
          primary: 'ui-icon-folder-collapsed'
        }
      })
      .click(function(e) {
        e.preventDefault();
        Observation.exportObservations(e);
      });

    $('#GetAllObservations')
      .button({
        label: i18next.t('Observation.GetObservations'),
        text: false,
        icons: {
          primary: 'ui-icon-play'
        }
      })
      .click(function(e) {
        e.preventDefault();
        Observation.getAllObservations(e);
      });

    $('#showEditPG')
      .button({
        label: i18next.t('Main.EditGroups'),
        text: false,
        icons: {
          primary: 'ui-icon-pencil'
        }
      })
      .click(function($e) {
        $e.preventDefault();
        $('div#editPG')
          .jqm({
            modal: true,
            toTop: true,
            overlayClass: 'ui-widget-overlay',
            overlay: 30,
            zIndex: 4000
          })
          .jqmShow()
          .draggable({
            containment: [0, 0, 2000, 2000]
          });
      });
  }

  function doKeydown(e) {
    var keycode;

    if (e == null) { // ie
      keycode = event.keyCode;
    } else { // mozilla
      keycode = e.which;
    }
    if (keycode == 27) { // escape, close box
      $(this).jqmHide();
    }
  }

  /**
   * Initializes the 3 grids (Productgroup, Source and Observation grid)
   * @param  {Number} productgroup_id The identification of the productgroup for which to populate the Source grid
   * @param  {String} pg_desc         The description of the productgroup (used in the title of the grid)
   * @param  {Object} userSettings    The preferences of the user (visible columns, columns widths of the Source grid)
   * @return {void}
   */
  function initGrids(productgroup_id, pg_desc, userSettings) {
    Productgroup.initGrid();
    Source.initGrid(productgroup_id, pg_desc, userSettings);
    Observation.initGrid();
  }

  /**
   * Saves the user's preferences (visibility and widths of columns in Source grid and height of Sidebar)
   * @return {void}
   */
  function saveUserSettings() {
    var userSettings = {
      Source: {
        name: {
          hidden: $('#Source').jqGrid('getColProp', 'name').hidden,
          width: $('#Source').jqGrid('getColProp', 'name').width
        },
        address: {
          hidden: $('#Source').jqGrid('getColProp', 'address').hidden,
          width: $('#Source').jqGrid('getColProp', 'address').width
        },
        url: {
          hidden: $('#Source').jqGrid('getColProp', 'url').hidden,
          width: $('#Source').jqGrid('getColProp', 'url').width
        },
        is_active: {
          hidden: $('#Source').jqGrid('getColProp', 'is_active').hidden
        },
        comment: {
          hidden: $('#Source').jqGrid('getColProp', 'comment').hidden,
          width: $('#Source').jqGrid('getColProp', 'comment').width
        },
        currency: {
          hidden: $('#Source').jqGrid('getColProp', 'currency').hidden,
          width: $('#Source').jqGrid('getColProp', 'currency').width
        },
        rowNum: $('#Source').jqGrid('getGridParam', 'rowNum')
      },
      Sidebar: {
        height: $(".sidebar").height()
      }
    };
    localStorage.setItem('config', JSON.stringify(userSettings));
  }

  /**
   * Get all productgroups from the database and populates the sidebar
   */
  function setSidebar() {
    $.getJSON('/data.html', {
      action: 'getProductgroup',
      element: "sidebar"
    }, function(data) {
      createPGlist(data);
    });
  }

  /**
   * Apply all user's preferences to the Source grid and Sidebar, uses defaults when they are not set.
   * @param  {Object} gridDefinition The definition of the Source grid
   * @param  {Object} userSettings   The user's preferences
   * @return {void}
   */
  function applyUserSettings(gridDefinition, userSettings) {
    if (userSettings.Source.name) {
      gridDefinition.colModel[2].hidden = userSettings.Source.name.hidden;
      gridDefinition.colModel[2].width = userSettings.Source.name.width;
    } else {
      gridDefinition.colModel[2].hidden = false;
      gridDefinition.colModel[2].width = 170;
    }
    if (userSettings.Source.address) {
      gridDefinition.colModel[3].hidden = userSettings.Source.address.hidden;
      gridDefinition.colModel[3].width = userSettings.Source.address.width;
    } else {
      gridDefinition.colModel[3].hidden = false;
      gridDefinition.colModel[3].width = 100;
    }
    if (userSettings.Source.url) {
      gridDefinition.colModel[4].hidden = userSettings.Source.url.hidden;
      gridDefinition.colModel[4].width = userSettings.Source.url.width;
    } else {
      gridDefinition.colModel[4].hidden = false;
      gridDefinition.colModel[4].width = 240;
    }
    if (userSettings.Source.is_active) {
      gridDefinition.colModel[5].hidden = userSettings.Source.is_active.hidden;
    } else {
      gridDefinition.colModel[5].hidden = false;
    }
    if (userSettings.Source.comment) {
      gridDefinition.colModel[6].hidden = userSettings.Source.comment.hidden;
      gridDefinition.colModel[6].width = userSettings.Source.comment.width;
    } else {
      gridDefinition.colModel[6].hidden = false;
      gridDefinition.colModel[6].width = 85;
    }
    if (userSettings.Source.currency) {
      gridDefinition.colModel[7].hidden = userSettings.Source.currency.hidden;
      gridDefinition.colModel[7].width = userSettings.Source.currency.width;
    } else {
      gridDefinition.colModel[7].hidden = false;
      gridDefinition.colModel[7].width = 80;
    }
    if (userSettings.Source.rowNum) {
      gridDefinition.rowNum = userSettings.Source.rowNum;
    }
  }

  /**
   * Initializes the user interface of the application
   * @param  {Array} data     Array of productgroups. Each element is an object containing information about a productgroup:
   *                          productgroup_id, description, comment, numberOfSources and numberOfValues
   * @param  {Object} infoText version and copyright
   * @return {void}
   */
  function initWindow(data, infoText) {
    var
      userSettings = {
        Source: {},
        Sidebar: {}
      };

    $('h5#version').text(infoText.version);
    $('h5#copyright').text(infoText.copyright);
    $('title#title').text(i18next.t('Main.Title'));
    $('h1#site_title').text(i18next.t('Main.SiteTitle'));
    $('h3#group').text(i18next.t('Productgroup.Groups'));
    $('button#show').text(i18next.t('Main.Show'));
    $('button#hide').text(i18next.t('Main.Hide'));

    if (localStorage.getItem('config')) {
      userSettings = JSON.parse(localStorage.getItem('config'));
    }

    $(window).on("unload", function() { saveUserSettings(); });

    if (userSettings.Sidebar) {
        $(".sidebar").css("height", userSettings.Sidebar.height);
        $('#sidebarPG').css('height', $('.sidebar').height() - 39);
    }
    $('.sidebar').resizable({ alsoResize: '#sidebarPG' });

    $('ul#Productgroups')
      .accordion({
        header: 'li > div.desc',
        heightStyle: 'content'
      })
      .sortable({
        axis: "y",
        handle: "div.desc",
        stop: function(event, ui) {
          // IE doesn't register the blur when sorting
          // so trigger focusout handlers to remove .ui-state-focus
          ui.item.children("div.desc").triggerHandler("focusout");

          // Refresh accordion to handle new order
          $(this).accordion("refresh");
        }
      });

    createPGlist(data, true);
    createLinks();

    var pgId = $('li#PG').eq(0).attr('productgroup_id');
    var pgtext = $('li#PG').eq(0).attr('desc');
    initGrids(pgId, pgtext, userSettings);

    $(window).resize(function() {
      setTimeout(resizeGrids, 50);
    }).trigger('resize');

    $('#ExportAllObservations').button();
    $('#GetAllObservations').button();

    $('button#hide')
      .button({
        icons: {
          primary: 'ui-icon-arrowthickstop-1-w'
        },
        text: false
      })
      .click(function() {
        $('.mainSidebarHide').show();
        $('.mainSidebar').hide();
        resizeGrids();
        $(window).trigger('resize');
      });

    $('button#show')
      .button({
        icons: {
          primary: 'ui-icon-arrowthickstop-1-e'
        },
        text: false
      })
      .click(function() {
        $('.mainSidebarHide').hide();
        $('.mainSidebar').show();
        resizeGrids();
        $(window).trigger('resize');
      });

    $('div#dialogObservation').keydown(doKeydown);
    $('div#editPG').keydown(doKeydown);
  }

  return {
    setSidebar: setSidebar,
    initWindow: initWindow,
    applyUserSettings: applyUserSettings
  };
  });
