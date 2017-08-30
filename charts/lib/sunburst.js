var SUNBURST = (function () {

  var create_chart = function (calendar_data, options) {

    // populate data /* var chart_data = DEMO_DATA.generate_sunburst(); */
    var chart_data = { name: 'root', children: []}; // init
    {
      // filter_app preparation from options
      var filter_app_map = [];
      for (const i in options.filter_app) {
        for (const to_label in options.filter_app[i]) {
          for (const j in options.filter_app[i][to_label]) {
            const from_regexp = options.filter_app[i][to_label][j];
            var entry = {};
            entry[from_regexp] = to_label;
            filter_app_map.push(entry);
          }
        }
      }
      // perform filter and aggregate
      var temp_data = {/*app->path->seconds*/};
      for (const date in calendar_data) {
        for (const time in calendar_data[date]) {
          for (const app_raw in calendar_data[date][time]) {
            // filter and replace app names
            var filtered = false;
            var app = app_raw;
            for (var i in filter_app_map) {
              for (var pattern in filter_app_map[i]) {
                const re = new RegExp(pattern);
                if (app_raw.match(re)) {
                  app = filter_app_map[i][pattern];
                  filtered = true;
                }
                if (filtered) { break; }
              }
              if (filtered) { break; }
            }
            // set to as "Etc." by default
            if (options.show_etc_app && !filtered) {
              const etc_label = "Etc.";
              app = etc_label;
              console.log("un-filtered app: ", app_raw);
              var entry = {};
              entry["^"+app_raw+"$"] = etc_label;
              filter_app_map.push(entry);
            }
            (app in temp_data) || (temp_data[app] = {});
            for (const path in calendar_data[date][time][app_raw]) {
              (path in temp_data[app]) || (temp_data[app][path] = { activeseconds: 0, semiidleseconds: 0 });
              temp_data[app][path].activeseconds += calendar_data[date][time][app_raw][path].activeseconds;
              temp_data[app][path].semiidleseconds += calendar_data[date][time][app_raw][path].semiidleseconds;
            }
          }
        }
      }
      // fill resulting chart_data
      for (const app in temp_data) {
        var app_node = {name: app, children:[]};
        for (const path in temp_data[app]) {
          const leaf = temp_data[app][path];
          var path_node = {name: path, size: leaf.activeseconds + leaf.semiidleseconds};
          app_node.children.push(path_node); // path
        }
        chart_data.children.push(app_node); // app
      }
    }

    var fader  = function(color) { return d3.interpolateRgb(color, "#ffffff")(0.0); };
    var colors = d3.scaleOrdinal(d3.schemeCategory20);
    var colors_1 = {};

    var create_color_spectrum = function(color, size) {
      var interpolate = d3.scaleLinear()
                        .domain([0,size])
                        .range([color,"#ffffff"]);
      var c = [];
      for (var i=0; i<size; i++) {
        c[i] = interpolate(i);
      }
      return d3.scaleOrdinal(c);
    };

    for (var i = 0; i < 20 ; i++)
    {
      colors_1[d3.schemeCategory20[i]] = create_color_spectrum(d3.schemeCategory20[i],6);
    }

    // Dimensions of sunburst.
    var width = 800;
    var height = 680;
    var radius = Math.min(width, height) / 2;

    // Breadcrumb dimensions: width, height, spacing, width of tip/tail.
    var b = {
      w: 250, h: 35, s: 3, t: 10
    };

    // Total size of all segments; we set this later, after loading the data.
    var totalSize = 0;

    var vis = d3.select("#sunburst-time-tracking").append("svg:svg")
      .attr("width", width)
      .attr("height", height)
      .append("svg:g")
      .attr("id", "container")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var partition = d3.partition()
      .size([2 * Math.PI, radius * radius]);

    var arc = d3.arc()
      .startAngle(function (d) { return d.x0; })
      .endAngle(function (d) { return d.x1; })
      .innerRadius(function (d) { return Math.sqrt(d.y0); })
      .outerRadius(function (d) { return Math.sqrt(d.y1); });

    createVisualization(chart_data, options);

    // Main function to draw and set up the visualization, once we have the data.
    function createVisualization(json, options) {

      // Basic setup of page elements.
      initializeBreadcrumbTrail();

      // Bounding circle underneath the sunburst, to make it easier to detect
      // when the mouse leaves the parent g.
      vis.append("svg:circle")
        .attr("r", radius)
        .style("opacity", 0);

      // Turn the data into a d3 hierarchy and calculate the sums.
      var root = d3.hierarchy(json)
        .sum(function (d) { return d.size; })
        .sort(function (a, b) { return b.value - a.value; });

      // For efficiency, filter nodes to keep only those large enough to see.
      var nodes = partition(root).descendants()
        .filter(function (d) {
          return (d.x1 - d.x0 > 0.005); // 0.005 radians = 0.29 degrees
        });

      var path = vis.data([json]).selectAll("path")
        .data(nodes)
        .enter().append("svg:path")
        .attr("display", function (d) { return d.depth ? null : "none"; })
        .attr("d", arc)
        .attr("fill-rule", "evenodd")
        .style("fill", function (d) {
          if (d.depth == 1)
            return colors(d.data.name);
          if (d.depth > 1)
            return colors_1[colors(d.parent.data.name)](d.data.name);
        })
        .style("opacity", 1)
        .on("mouseenter", mouseenter)
        .on("mousemove", mousemove);

      // Add the mouseleave handler to the bounding circle.
      d3.select("#container").on("mouseleave", mouseleave);

      // Get total size of the tree = value of root node from partition.
      totalSize = path.datum().value;
    };

    var tooltip = d3.select("#tooltip");

    // show tooltip
    function mousemove(d) {
      tooltip.style("opacity", .9);
      tooltip.html(d.data.name)
      .style("left", (d3.event.pageX + 10) + "px")
      .style("top", (d3.event.pageY - 28) + "px");
    }

    // Fade all but the current sequence, and show it in the breadcrumb trail.
    function mouseenter(d) {

      var percentage = (100 * d.value / totalSize).toPrecision(3);
      var percentageString = percentage + "%";
      if (percentage < 0.1) {
        percentageString = "< 0.1%";
      }

      /*
      d3.select("#percentage")
        .text(percentageString);

      d3.select("#explanation")
        .style("visibility", "");
      */
      var sequenceArray = d.ancestors().reverse();
      sequenceArray.shift(); // remove root node from the array
      updateBreadcrumbs(sequenceArray, percentageString);

      // Fade all the segments.
      d3.selectAll("path")
        .style("opacity", 0.2);

      // Then highlight only those that are an ancestor of the current segment.
      vis.selectAll("path")
        .filter(function (node) {
          return (sequenceArray.indexOf(node) >= 0);
        })
        .style("opacity", 1);
    }

    // Restore everything to full opacity when moving off the visualization.
    function mouseleave(d) {

      // hide tooltip
      tooltip.style("opacity", 0);

      // Hide the breadcrumb trail
      d3.select("#trail")
        .style("visibility", "hidden");

      // Deactivate all segments during transition.
      d3.selectAll("path").on("mouseenter", null);

      // Transition each segment to full opacity and then reactivate it.
      d3.selectAll("path")
        .transition()
        .duration(1000)
        .style("opacity", 1)
        .on("end", function () {
          d3.select(this).on("mouseenter", mouseenter);
        });

      /*
      d3.select("#explanation")
        .style("visibility", "hidden");
      */
    }

    function initializeBreadcrumbTrail() {
      // Add the svg area.
      var trail = d3.select("#sequence-sunburst-time-tracking").append("svg:svg")
        .attr("width", width)
        .attr("height", 50)
        .attr("id", "trail");
      // Add the label at the end, for the percentage.
      trail.append("svg:text")
        .attr("id", "endlabel")
        .style("fill", "#000");
    }

    // Generate a string that describes the points of a breadcrumb polygon.
    function breadcrumbPoints(d, i) {
      var points = [];
      points.push("0,0");
      points.push(b.w + ",0");
      points.push(b.w + b.t + "," + (b.h / 2));
      points.push(b.w + "," + b.h);
      points.push("0," + b.h);
      if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
        points.push(b.t + "," + (b.h / 2));
      }
      return points.join(" ");
    }

    // Update the breadcrumb trail to show the current sequence and percentage.
    function updateBreadcrumbs(nodeArray, percentageString) {

      // Data join; key function combines name and depth (= position in sequence).
      var trail = d3.select("#trail")
        .selectAll("g")
        .data(nodeArray, function (d) { return d.data.name + d.depth; });

      // Remove exiting nodes.
      trail.exit().remove();

      // Add breadcrumb and label for entering nodes.
      var entering = trail.enter().append("svg:g");

      entering.append("svg:polygon")
        .attr("points", breadcrumbPoints)
        .style("fill", function (d) {
          if (d.depth == 1)
            return colors(d.data.name);
          if (d.depth > 1)
            return colors_1[colors(d.parent.data.name)](d.data.name);
        });
      entering.append("svg:text")
        .attr("x", (b.w + b.t) / 2)
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("font-size", "16")
        .attr("font-weight", "bold")
        .text(function (d) { return d.data.name.substr(0, 20) + (d.data.name.length > 20 ? "..." : ""); });

      // Merge enter and update selections; set position for all nodes.
      entering.merge(trail).attr("transform", function (d, i) {
        return "translate(" + i * (b.w + b.s) + ", 0)";
      });

      // Now move and update the percentage at the end.
      d3.select("#trail").select("#endlabel")
        .attr("x", (nodeArray.length + 0.5) * (b.w + b.s) - 50)
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("font-size", "20")
        .attr("font-weight", "bold")
        .text(percentageString);

      // Make the breadcrumb trail visible, if it's hidden.
      d3.select("#trail")
        .style("visibility", "");

    }

    // Take a 2-column CSV and transform it into a hierarchical structure suitable
    // for a partition layout. The first column is a sequence of step names, from
    // root to leaf, separated by hyphens. The second column is a count of how
    // often that sequence occurred.
    function buildHierarchy(csv) {
      var root = { "name": "root", "children": [] };
      for (var i = 0; i < csv.length; i++) {
        var sequence = csv[i][0];
        var size = +csv[i][1];
        if (isNaN(size)) { // e.g. if this is a header row
          continue;
        }
        var parts = sequence.split("-");
        var currentNode = root;
        for (var j = 0; j < parts.length; j++) {
          var children = currentNode["children"];
          var nodeName = parts[j];
          var childNode;
          if (j + 1 < parts.length) {
            // Not yet at the end of the sequence; move down the tree.
            var foundChild = false;
            for (var k = 0; k < children.length; k++) {
              if (children[k]["name"] == nodeName) {
                childNode = children[k];
                foundChild = true;
                break;
              }
            }
            // If we don't already have a child node for this branch, create it.
            if (!foundChild) {
              childNode = { "name": nodeName, "children": [] };
              children.push(childNode);
            }
            currentNode = childNode;
          } else {
            // Reached the end of the sequence; create a leaf node.
            childNode = { "name": nodeName, "size": size };
            children.push(childNode);
          }
        }
      }
      return root;
    };
  };

  return {
    create_chart: create_chart
  }

})();