/*jslint browser: true*/
/* global define, require*/
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
define(["d3.min"], function(d3) {

  function createBarChart(id, productgroup_id) {

    var margin = {
        top: 20,
        right: 20,
        bottom: 30,
        left: 50
      },
      width = 960 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom,

      parseDate = d3.time.format("%Y-%m-%d %H:%M:%S").parse,
      x = d3.time.scale().range([0, width]),
      y = d3.scale.linear().range([height, 0]),
      xAxis = d3.svg.axis().scale(x).orient("bottom"),
      yAxis = d3.svg.axis().scale(y).orient("left"),

      line = d3.svg.line()
        .x(function(d) { return x(d.observation_date); })
        .y(function(d) { return y(d.value);}),

      svg = d3.select(".chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    d3.json("data.html?action=chart&id=" + id + "&productgroup_id=" + productgroup_id,
      function(error, data) {
        var maxValue = data.maxValue;
        data = data.rows.filter(function(elt) {
          return elt.source_id == id;
        });
        data.forEach(function(d) {
          d.observation_date = parseDate(d.observation_date);
          d.value = +d.value;
        });

        x.domain(d3.extent(data, function(d) {
          return d.observation_date;
        }));
        y.domain([
          0, maxValue * 1.1
        ]);

        svg.selectAll("dot")
          .data(data)
          .enter()
          .append("circle")
          .attr("r", 3.5)
          .attr("cx", function(d) { return x(d.observation_date); })
          .attr("cy", function(d) { return y(d.value); })
          .style("fill", function(d, i) { return d3.rgb("blue"); })
          .style("stroke", function(d, i) { return d3.rgb("black");});

        svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis)
          .append('text')
          .attr("transform", "translate(" + (width / 2) + " ," + (height + margin.bottom) + ")")
          .style("text-anchor", "middle")
          .text("Week");

        svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
          .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", ".71em")
          .style("text-anchor", "end")
          .text("Price");

        svg.append("path")
          .datum(data)
          .attr("class", "line")
          .attr("d", line);
      });
  }

  function createScatterPlot(productgroup_id) {

    var margin = {
        top: 20,
        right: 20,
        bottom: 30,
        left: 50
      },
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom,

      parseDate = d3.time.format("%Y-%m-%d %H:%M:%S").parse,

      color = d3.scale.category20(),

      x = d3.time.scale().range([0, width]),
      y = d3.scale.linear().range([height, 0]),
      xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(d3.time.monday, 2).tickFormat(d3.time.format("%W")),
      yAxis = d3.svg.axis().scale(y).orient("left"),

      line = d3.svg.line()
        .x(function(d) { return x(d.observation_date); })
        .y(function(d) { return y(d.value); }),

      svg = d3.select(".chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // function for the x grid lines
    function make_x_axis() {
      return d3.svg.axis().scale(x).orient("bottom").ticks(d3.time.monday, 2);
    }

    // function for the y grid lines
    function make_y_axis() {
      return d3.svg.axis().scale(y).orient("left").ticks(10);
    }

    d3.json("data.html?action=chart&productgroup_id=" + productgroup_id,
      function(error, data) {
        var maxValue = data.maxValue;

        data = data.rows;
        data.forEach(function(d) {
          d.observation_date = parseDate(d.observation_date);
          d.value = +d.value;
        });

        x.domain(d3.extent(data, function(d) { return d.observation_date; }));
        y.domain([0, maxValue * 1.1]);

        svg.append("g")
          .attr("class", "grid")
          .attr("transform", "translate(0," + height + ")")
          .call(make_x_axis()
          .tickSize(-height, 0, 0)
          .tickFormat(""));

        svg.append("g")
          .attr("class", "grid")
          .call(make_y_axis()
          .tickSize(-width, 0, 0)
          .tickFormat(""));

        svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

        svg.append("text")
          .attr("transform", "translate(" + (width / 2) + " ," + (height + margin.bottom) + ")")
          .style("text-anchor", "middle").text("Week");

        svg.append("g")
          .attr("class", "y axis")
          .call(yAxis);

        svg.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6).attr("dy", ".71em")
          .style("text-anchor", "middle").text("Price");

        svg.selectAll("dot")
          .data(data)
          .enter()
          .append("circle")
          .attr("r", 3)
          .attr("cx", function(d) { return x(d.observation_date); })
          .attr("cy", function(d) { return y(d.value); })
          .style("fill", function(d) { return color(d.source_id % 20); })
          .style("stroke", function(d) { return color(d.source_id % 20); })
          .on("mouseover",
            function(d) {
              var subset = data.filter(function(elt) {
                return d.source_id == elt.source_id;
              });

              d3.select(this)
                .attr("r", 5)
                .attr("fill", "red");

              svg.append("path")
                .datum(subset)
                .attr("id", "line")
                .attr("class", "line")
                .attr("d", line);
            })
          .on("mouseout",
            function() {
              d3.select("#line").remove();
              d3.select(this).attr("r", 3).attr("fill", "black");
            })
          .append("title").text(function(d) { return d.name; });
      });
  }

  return {
    createBarChart: createBarChart,
    createScatterPlot: createScatterPlot
  };
});
